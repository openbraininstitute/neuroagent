"""Utilies for neuroagent."""

import json
import logging
import re
import uuid
from typing import Any, Literal

from openai.types.responses import ResponseOutputItem, ResponseUsage

from neuroagent.app.database.sql_schemas import (
    Messages,
    Parts,
    PartType,
    Task,
    TokenConsumption,
    TokenType,
)

logger = logging.getLogger(__name__)


async def messages_to_openai_content(
    db_messages: list[Messages] | None = None,
) -> list[dict[str, Any]]:
    """Exctract content from Messages as dictionary to pass them to OpenAI."""
    # Maybe we should add a check to see if the parts where awaited
    openai_messages = []
    if db_messages:
        for msg in db_messages:
            for part in msg.parts:
                openai_messages.append(part.output)

    return openai_messages


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


def save_to_storage(
    s3_client: Any,
    bucket_name: str,
    user_id: uuid.UUID,
    content_type: str,
    category: Literal["image", "json"],
    body: bytes | str,
    thread_id: uuid.UUID | None = None,
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
    key_parts = [str(user_id), identifier]
    filename = "/".join(key_parts)

    metadata: dict[str, str] = {"category": category}

    if thread_id is not None:
        metadata["thread_id"] = str(thread_id)

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
    user_id: uuid.UUID,
    thread_id: uuid.UUID,
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


def get_token_count(usage: ResponseUsage | None) -> dict[str, int | None]:
    """Assign token count to a message given a usage chunk."""
    # Parse usage to add to message's data
    if usage:
        # Compute input, input_cached, completion
        input_tokens = usage.input_tokens
        cached_tokens = (
            usage.input_tokens_details.cached_tokens
            if usage.input_tokens_details
            else None
        )
        prompt_tokens = input_tokens - cached_tokens if cached_tokens else input_tokens
        completion_tokens = usage.output_tokens

        return {
            "input_cached": cached_tokens,
            "input_noncached": prompt_tokens,
            "completion": completion_tokens,
        }
    else:
        return {"input_cached": None, "input_noncached": None, "completion": None}


def append_part(
    message: Messages,
    history: list[dict[str, Any]],
    openai_part: ResponseOutputItem | dict[str, Any],
    type: PartType,
) -> None:
    """Create a reasoning part and append it to the message and history."""
    if isinstance(openai_part, dict):
        output = openai_part
    else:
        output = openai_part.model_dump(exclude={"status"})
    part = Parts(
        message_id=message.message_id,
        order_index=len(message.parts),
        type=type,
        output=output,
        is_complete=True,
    )
    message.parts.append(part)
    history.append(output)


def get_main_LLM_token_consumption(
    usage_data: ResponseUsage | None, model: str, task: Task
) -> list[TokenConsumption]:
    """Create token consumption objects from usage data."""
    if not usage_data:
        return []

    input_cached = (
        getattr(
            getattr(usage_data, "input_tokens_details", 0),
            "cached_tokens",
            0,
        )
        or 0
    )
    input_noncached = getattr(usage_data, "input_tokens", 0) - input_cached
    completion_tokens = getattr(usage_data, "output_tokens", 0) or 0

    return [
        TokenConsumption(
            type=token_type,
            task=task,
            count=count,
            model=model,
        )
        for token_type, count in [
            (TokenType.INPUT_CACHED, input_cached),
            (TokenType.INPUT_NONCACHED, input_noncached),
            (TokenType.COMPLETION, completion_tokens),
        ]
        if count
    ]


def get_tool_token_consumption(
    tool_response: dict[str, Any],
    context_variables: dict[str, Any],
) -> list[TokenConsumption]:
    """Get token consumption for a tool response."""
    if context_variables["usage_dict"].get(tool_response["call_id"]):
        tool_call_consumption = context_variables["usage_dict"][
            tool_response["call_id"]
        ]
        return [
            TokenConsumption(
                type=token_type,
                task=Task.CALL_WITHIN_TOOL,
                count=count,
                model=tool_call_consumption["model"],
            )
            for token_type, count in [
                (TokenType.INPUT_CACHED, tool_call_consumption["input_cached"]),
                (TokenType.INPUT_NONCACHED, tool_call_consumption["input_noncached"]),
                (TokenType.COMPLETION, tool_call_consumption["completion"]),
            ]
            if count
        ]
    return []


def separate_tool_calls(
    tool_calls: dict[str, dict[str, Any]], tool_map: dict[str, Any]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Separate tool calls into those to execute and those requiring HIL.

    Parameters
    ----------
    tool_calls : dict[str, dict[str, Any]]
        Dictionary of tool calls with IDs as keys
    tool_map : dict[str, Any]
        Mapping of tool names to tool objects

    Returns
    -------
    tuple[list[dict[str, Any]], list[dict[str, Any]]]
        Tuple of (tool_calls_to_execute, tool_calls_with_hil)
    """
    tool_calls_to_execute = [
        {
            "id": id,
            "call_id": tc["call_id"],
            "name": tc["name"],
            "arguments": tc["arguments"],
        }
        for id, tc in tool_calls.items()
        if not tool_map[tc["name"]].hil
    ]
    tool_calls_with_hil = [
        {
            "id": id,
            "call_id": tc["call_id"],
            "name": tc["name"],
            "arguments": tc["arguments"],
        }
        for id, tc in tool_calls.items()
        if tool_map[tc["name"]].hil
    ]
    return tool_calls_to_execute, tool_calls_with_hil
