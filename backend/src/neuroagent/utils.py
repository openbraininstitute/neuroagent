"""Utilies for neuroagent."""

import json
import logging
import numbers
import re
import uuid
from pathlib import Path
from typing import Any, Iterator

from fastapi import HTTPException
from httpx import AsyncClient

from neuroagent.app.database.sql_schemas import Entity, Messages
from neuroagent.schemas import Category, KGMetadata

logger = logging.getLogger(__name__)


def merge_fields(target: dict[str, Any], source: dict[str, Any]) -> None:
    """Recursively merge each field in the target dictionary."""
    for key, value in source.items():
        if isinstance(value, str):
            target[key] += value
        elif value is not None and isinstance(value, dict):
            merge_fields(target[key], value)


def merge_chunk(final_response: dict[str, Any], delta: dict[str, Any]) -> None:
    """Merge a chunk into the final message."""
    delta.pop("role", None)
    merge_fields(final_response, delta)

    tool_calls = delta.get("tool_calls")
    if tool_calls and len(tool_calls) > 0:
        index = tool_calls[0].pop("index")
        merge_fields(final_response["tool_calls"][index], tool_calls[0])


async def messages_to_openai_content(
    db_messages: list[Messages] | None = None,
) -> list[dict[str, Any]]:
    """Exctract content from Messages as dictionary to pass them to OpenAI."""
    messages = []
    if db_messages:
        for msg in db_messages:
            if msg.content and msg.entity == Entity.AI_TOOL:
                # Load the base content
                content = json.loads(msg.content)

                # Get the associated tool calls
                tool_calls = msg.tool_calls

                # Format it back into the json OpenAI expects
                tool_calls_content = [
                    {
                        "function": {
                            "arguments": tool_call.arguments,
                            "name": tool_call.name,
                        },
                        "id": tool_call.tool_call_id,
                        "type": "function",
                    }
                    for tool_call in tool_calls
                ]

                # Assign it back to the main content
                content["tool_calls"] = tool_calls_content
                messages.append(content)
            else:
                messages.append(json.loads(msg.content))

    return messages


def get_entity(message: dict[str, Any]) -> Entity:
    """Define the Enum entity of the message based on its content."""
    if message["role"] == "user":
        return Entity.USER
    elif message["role"] == "tool":
        return Entity.TOOL
    elif message["role"] == "assistant" and message.get("tool_calls", False):
        return Entity.AI_TOOL
    elif message["role"] == "assistant" and not message.get("tool_calls", False):
        return Entity.AI_MESSAGE
    else:
        raise HTTPException(status_code=500, detail="Unknown message entity.")


def complete_partial_json(partial: str) -> str:
    """Try to turn a partial json into a valid one."""
    # if already valid, noop.
    try:
        return json.dumps(json.loads(partial))
    except json.JSONDecodeError:
        pass

    # Trim trailing whitespace.
    fixed = partial.rstrip()

    # If the JSON ends with a colon (indicating a key that hasn't been assigned a value),
    # append a default null value.
    if re.search(r":\s*$", fixed):
        fixed += " null"

    # Remove any trailing commas immediately before a closing brace or bracket.
    fixed = re.sub(r",\s*(\}|\])", r"\1", fixed)

    # Fix truncated numbers like `3.` at end or before a closing char
    fixed = re.sub(r"(\d+)\.(?=\s*[\},\]])?", r"\1", fixed)

    # Track structural tokens.
    stack = []
    in_string = False
    escape = False

    for ch in fixed:
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string:
            if ch in "{[":
                stack.append(ch)
            elif ch == "}":
                if stack and stack[-1] == "{":
                    stack.pop()
            elif ch == "]":
                if stack and stack[-1] == "[":
                    stack.pop()

    # If a string remains unclosed, add the missing quote.
    if in_string:
        fixed += '"'

    # Append missing closing tokens in the reverse order they were opened.
    # Also, before closing an object, check if its last property ends in a colon.
    while stack:
        elem = stack.pop()
        if elem == "{":
            if re.search(r":\s*$", fixed):
                fixed += " null"
            fixed += "}"
        elif elem == "[":
            fixed += "]"

    # Remove any trailing commas that may have been introduced during processing.
    fixed = re.sub(r",\s*(\}|\])", r"\1", fixed)

    # Final attempt to parse: if it passes, we return the corrected JSON.
    try:
        # Returning a consistently formatted version.
        return json.dumps(json.loads(fixed))
    except json.JSONDecodeError:
        # As a last resort, check for unpaired keys
        fixed = re.sub(r'("([^"]+)"\s*)}$', r'"\2": null}', fixed)
        try:
            return json.dumps(json.loads(fixed))
        except json.JSONDecodeError:
            return partial  # fallback to the fixed string even if not perfect


class RegionMeta:
    """Class holding the hierarchical region metadata.

    Typically, such information would be parsed from a `brain_regions.json`
    file.

    Parameters
    ----------
    background_id : int, optional
        Override the default ID for the background.
    """

    def __init__(self, background_id: int = 0) -> None:
        self.background_id = background_id
        self.root_id: int | None = None

        self.name_: dict[int, str] = {self.background_id: "background"}
        self.st_level: dict[int, int | None] = {self.background_id: None}

        self.parent_id: dict[int, int] = {self.background_id: background_id}
        self.children_ids: dict[int, list[int]] = {self.background_id: []}

    def children(self, region_id: int) -> tuple[int, ...]:
        """Get all child region IDs of a given region.

        Note that by children we mean only the direct children, much like
        by parent we only mean the direct parent. The cumulative quantities
        that span all generations are called ancestors and descendants.

        Parameters
        ----------
        region_id : int
            The region ID in question.

        Returns
        -------
        int
            The region ID of a child region.
        """
        return tuple(self.children_ids[region_id])

    def descendants(self, ids: int | list[int]) -> set[int]:
        """Find all descendants of given regions.

        The result is inclusive, i.e. the input region IDs will be
        included in the result.

        Parameters
        ----------
        ids : int or iterable of int
            A region ID or a collection of region IDs to collect
            descendants for.

        Returns
        -------
        set
            All descendant region IDs of the given regions, including the input
            regions themselves.
        """
        if isinstance(ids, numbers.Integral):
            unique_ids: set[int] = {ids}
        elif isinstance(ids, set):
            unique_ids = set(ids)

        def iter_descendants(region_id: int) -> Iterator[int]:
            """Iterate over all descendants of a given region ID.

            Parameters
            ----------
            region_id
                Integer representing the id of the region

            Returns
            -------
                Iterator with descendants of the region
            """
            yield region_id
            for child in self.children(region_id):
                yield child
                yield from iter_descendants(child)

        descendants = set()
        for id_ in unique_ids:
            descendants |= set(iter_descendants(id_))

        return descendants

    def save_config(self, json_file_path: str | Path) -> None:
        """Save the actual configuration in a json file.

        Parameters
        ----------
        json_file_path
            Path where to save the json file
        """
        to_save = {
            "root_id": self.root_id,
            "names": self.name_,
            "st_level": self.st_level,
            "parent_id": self.parent_id,
            "children_ids": self.children_ids,
        }
        with open(json_file_path, "w") as fs:
            fs.write(json.dumps(to_save))

    @classmethod
    def load_config(cls, json_file_path: str | Path) -> "RegionMeta":
        """Load a configuration in a json file and return a 'RegionMeta' instance.

        Parameters
        ----------
        json_file_path
            Path to the json file containing the brain region hierarchy

        Returns
        -------
            RegionMeta class with pre-loaded hierarchy
        """
        with open(json_file_path, "r") as fs:
            to_load = json.load(fs)

        # Needed to convert json 'str' keys to int.
        for k1 in to_load.keys():
            if not isinstance(to_load[k1], int):
                to_load[k1] = {int(k): v for k, v in to_load[k1].items()}

        self = cls()

        self.root_id = to_load["root_id"]
        self.name_ = to_load["names"]
        self.st_level = to_load["st_level"]
        self.parent_id = to_load["parent_id"]
        self.children_ids = to_load["children_ids"]

        return self

    @classmethod
    def from_KG_dict(cls, KG_hierarchy: dict[str, Any]) -> "RegionMeta":
        """Construct an instance from the json of the Knowledge Graph.

        Parameters
        ----------
        KG_hierarchy : dict
            The dictionary of the region hierarchy, provided by the KG.

        Returns
        -------
        region_meta : RegionMeta
            The initialized instance of this class.
        """
        self = cls()

        for brain_region in KG_hierarchy["defines"]:
            # Filter out wrong elements of the KG.
            if "identifier" in brain_region.keys():
                region_id = int(brain_region["identifier"])

                # Check if we are at root.
                if "isPartOf" not in brain_region.keys():
                    self.root_id = int(region_id)
                    self.parent_id[region_id] = self.background_id
                else:
                    # Strip url to only keep ID.
                    self.parent_id[region_id] = int(
                        brain_region["isPartOf"][0].rsplit("/")[-1]
                    )
                self.children_ids[region_id] = []

                self.name_[region_id] = brain_region["label"]

                if "st_level" not in brain_region.keys():
                    self.st_level[region_id] = None
                else:
                    self.st_level[region_id] = brain_region["st_level"]

        # Once every parents are set, we can deduce all childrens.
        for child_id, parent_id in self.parent_id.items():
            if parent_id is not None:
                self.children_ids[int(parent_id)].append(child_id)

        return self

    @classmethod
    def load_json(cls, json_path: Path | str) -> "RegionMeta":
        """Load the structure graph from a JSON file and create a Class instance.

        Parameters
        ----------
        json_path : str or pathlib.Path

        Returns
        -------
        RegionMeta
            The initialized instance of this class.
        """
        with open(json_path) as fh:
            KG_hierarchy = json.load(fh)

        return cls.from_KG_dict(KG_hierarchy)

    @classmethod
    def load_config_s3(cls, s3_client: Any, bucket_name: str, key: str) -> "RegionMeta":
        """Load a configuration from a json file in S3 and return a 'RegionMeta' instance.

        Parameters
        ----------
        s3_client : boto3.client
            The initialized S3 client
        bucket_name : str
            Name of the S3 bucket
        key : str
            Key (path) to the JSON file in the S3 bucket

        Returns
        -------
            RegionMeta class with pre-loaded hierarchy
        """
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        to_load = json.load(response["Body"])

        # Needed to convert json 'str' keys to int.
        for k1 in to_load.keys():
            if not isinstance(to_load[k1], int):
                to_load[k1] = {int(k): v for k, v in to_load[k1].items()}

        self = cls()

        self.root_id = to_load["root_id"]
        self.name_ = to_load["names"]
        self.st_level = to_load["st_level"]
        self.parent_id = to_load["parent_id"]
        self.children_ids = to_load["children_ids"]

        return self


def get_descendants_id(brain_region_id: str, json_path: str | Path) -> set[str]:
    """Get all descendant of a brain region id.

    Parameters
    ----------
    brain_region_id
        Brain region ID to find descendants for.
    json_path
        Path to the json file containing the BR hierarchy

    Returns
    -------
        Set of descendants of a brain region
    """
    # Split a brain region ID of the form "http://api.brain-map.org/api/v2/data/Structure/123" into base + id.
    id_base, _, brain_region_str = brain_region_id.rpartition("/")
    try:
        # Convert the id into an int
        brain_region_int = int(brain_region_str)

        # Get the descendant ids of this BR (as int).
        region_meta = RegionMeta.load_config(json_path)
        hierarchy = region_meta.descendants(brain_region_int)

        # Recast the descendants into the form "http://api.brain-map.org/api/v2/data/Structure/123"
        hierarchy_ids = {f"{id_base}/{h}" for h in hierarchy}
    except ValueError:
        logger.info(
            f"The brain region {brain_region_id} didn't end with an int. Returning only"
            " the parent one."
        )
        hierarchy_ids = {brain_region_id}
    except IOError:
        logger.warning(f"The file {json_path} doesn't exist.")
        hierarchy_ids = {brain_region_id}

    return hierarchy_ids


def get_descendants_id_s3(
    brain_region_id: str, s3_client: Any, bucket_name: str, key: str
) -> set[str]:
    """Get all descendant of a brain region id using a json file in S3.

    Parameters
    ----------
    brain_region_id : str
        Brain region ID to find descendants for.
    s3_client : boto3.client
        The initialized S3 client
    bucket_name : str
        Name of the S3 bucket
    key : str
        Key (path) to the JSON file in the S3 bucket

    Returns
    -------
        Set of descendants of a brain region
    """
    # Split a brain region ID of the form "http://api.brain-map.org/api/v2/data/Structure/123" into base + id.
    id_base, _, brain_region_str = brain_region_id.rpartition("/")
    try:
        # Convert the id into an int
        brain_region_int = int(brain_region_str)

        # Get the descendant ids of this BR (as int).
        region_meta = RegionMeta.load_config_s3(s3_client, bucket_name, key)
        hierarchy = region_meta.descendants(brain_region_int)

        # Recast the descendants into the form "http://api.brain-map.org/api/v2/data/Structure/123"
        hierarchy_ids = {f"{id_base}/{h}" for h in hierarchy}
    except ValueError:
        logger.info(
            f"The brain region {brain_region_id} didn't end with an int. Returning only"
            " the parent one."
        )
        hierarchy_ids = {brain_region_id}
    except Exception as e:
        logger.warning(
            f"Error accessing S3 file {key} in bucket {bucket_name}: {str(e)}"
        )
        hierarchy_ids = {brain_region_id}

    return hierarchy_ids


def is_lnmc(contributors: list[dict[str, Any]]) -> bool:
    """Extract contributor affiliation out of the contributors."""
    lnmc_contributors = {
        "https://www.grid.ac/institutes/grid.5333.6",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/yshi",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/jyi",
        "https://bbp.epfl.ch/neurosciencegraph/data/664380c8-5a22-4974-951c-68ca78c0b1f1",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/perin",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/rajnish",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/ajaquier",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/gevaert",
        "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/kanari",
    }
    for contributor in contributors:
        if "@id" in contributor and contributor["@id"] in lnmc_contributors:
            return True

    return False


async def get_kg_data(
    object_id: str,
    httpx_client: AsyncClient,
    url: str,
    preferred_format: str,
    token: str | None = None,
) -> tuple[bytes, KGMetadata]:
    """Download any knowledge graph object.

    Parameters
    ----------
    object_id
        ID of the object to which the file is attached
    httpx_client
        AsyncClient to send the request
    url
        URL of the KG view where the object is located
    token
        Token used to access the knowledge graph
    preferred_format
        Extension of the file to download

    Returns
    -------
        Tuple containing the file's content and the associated metadata

    Raises
    ------
    ValueError
        If the object ID is not found the knowledge graph.
    """
    # Extract the id from the specified input (useful for rewoo)
    extracted_id = re.findall(pattern=r"https?://\S+[a-zA-Z0-9]", string=object_id)
    if not extracted_id:
        raise ValueError(f"The provided ID ({object_id}) is not valid.")
    else:
        object_id = extracted_id[0]

    # Create ES query to retrieve the object in KG
    query = {
        "size": 1,
        "track_total_hits": True,
        "query": {
            "bool": {
                "must": [
                    {
                        "term": {
                            "@id.keyword": object_id,
                        }
                    }
                ]
            }
        },
    }

    # Retrieve the object of interest from KG
    response = await httpx_client.post(
        url=url,
        headers={"Authorization": f"Bearer {token}"} if token else {},
        json=query,
    )

    if response.status_code != 200 or len(response.json()["hits"]["hits"]) == 0:
        raise ValueError(f"We did not find the object {object_id} you are asking")

    # Get the metadata of the object
    response_data = response.json()["hits"]["hits"][0]["_source"]

    # Ensure we got the expected object
    if response_data["@id"] != object_id:
        raise ValueError(f"We did not find the object {object_id} you are asking")

    metadata: dict[str, Any] = dict()
    metadata["brain_region"] = response_data["brainRegion"]["label"]
    distributions = response_data["distribution"]

    # Extract the format of the file
    has_preferred_format = [
        i
        for i, dis in enumerate(distributions)
        if dis["encodingFormat"] == f"application/{preferred_format}"
    ]

    # Set the file extension accordingly if preferred format found
    if len(has_preferred_format) > 0:
        chosen_dist = distributions[has_preferred_format[0]]
        metadata["file_extension"] = preferred_format
    else:
        chosen_dist = distributions[0]
        metadata["file_extension"] = chosen_dist["encodingFormat"].split("/")[1]
        logger.info(
            "The format you specified was not available."
            f" {metadata['file_extension']} was chosen instead."
        )

    # Check if the object has been added by the LNMC lab (useful for traces)
    if "contributors" in response_data:
        metadata["is_lnmc"] = is_lnmc(response_data["contributors"])

    # Download the file
    url = chosen_dist["contentUrl"]
    content_response = await httpx_client.get(
        url=url,
        headers={"Authorization": f"Bearer {token}"} if token else {},
    )

    # Return its content and the associated metadata
    object_content = content_response.content
    return object_content, KGMetadata(**metadata)


def save_to_storage(
    s3_client: Any,
    bucket_name: str,
    user_id: str,
    content_type: str,
    category: Category,
    body: bytes | str,
    thread_id: str | None = None,
) -> str:
    """Save content to S3 storage and return the storage ID.

    Parameters
    ----------
    s3_client : Any
        Boto3 S3 client instance
    bucket_name : str
        Name of the S3 bucket
    user_id : str
        User identifier
    content_type : str
        Content type of the object (e.g. 'image/png', 'application/json')
    category : Category
        Category metadata for the object
    body : bytes | str
        Content to store - can be bytes or string (for JSON)
    thread_id : str | None
        Optional thread identifier for grouping related objects

    Returns
    -------
    str
        Generated storage identifier
    """
    # Generate unique identifier
    identifier = str(uuid.uuid4())

    # Construct the full path including user_id
    key_parts = [user_id, identifier]
    filename = "/".join(key_parts)

    metadata: dict[str, str] = {"category": category}

    if thread_id is not None:
        metadata["thread_id"] = thread_id

    # Save to S3 with metadata
    s3_client.put_object(
        Bucket=bucket_name,
        Key=filename,
        Body=body,
        ContentType=content_type,
        Metadata=metadata,
    )

    return identifier


def delete_from_storage(
    s3_client: Any,
    bucket_name: str,
    user_id: str,
    thread_id: str,
) -> None:
    """Delete all objects from S3 storage that match the given user_id and thread_id.

    Parameters
    ----------
    s3_client : Any
        Boto3 S3 client instance
    bucket_name : str
        Name of the S3 bucket
    user_id : str
        User identifier
    thread_id : str
        Thread identifier for filtering objects to delete
    """
    # List all objects under the user's prefix
    paginator = s3_client.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=bucket_name, Prefix=f"{user_id}/")

    # Collect objects to delete
    objects_to_delete = []

    for page in pages:
        if "Contents" not in page:
            continue

        for obj in page["Contents"]:
            # Get object metadata
            head = s3_client.head_object(Bucket=bucket_name, Key=obj["Key"])
            metadata = head.get("Metadata", {})

            # Check if object has matching thread_id
            if metadata.get("thread_id") == thread_id:
                objects_to_delete.append({"Key": obj["Key"]})

        # Delete in batches of 1000 (S3 limit)
        if objects_to_delete:
            for i in range(0, len(objects_to_delete), 1000):
                batch = objects_to_delete[i : i + 1000]
                s3_client.delete_objects(
                    Bucket=bucket_name, Delete={"Objects": batch, "Quiet": True}
                )
            objects_to_delete = []
