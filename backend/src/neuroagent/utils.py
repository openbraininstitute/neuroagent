"""Utilies for neuroagent."""

import json
import logging
import re
import uuid
from typing import Any

from fastapi import HTTPException
from openai.types.completion_usage import CompletionUsage

from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
)
from neuroagent.schemas import Category
from neuroagent.storage.base_storage import StorageClient

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
        for tool_call in tool_calls:
            index = tool_call.pop("index")
            if final_response["tool_calls"][index]["type"]:
                tool_call["type"] = None
            merge_fields(final_response["tool_calls"][index], tool_call)


async def messages_to_openai_content(
    db_messages: list[Messages] | None = None,
) -> list[dict[str, Any]]:
    """Exctract content from Messages as dictionary to pass them to OpenAI."""
    messages = []
    if db_messages:
        for msg in db_messages:
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


def save_to_storage(
    storage_client: StorageClient,
    container_name: str,
    user_id: uuid.UUID,
    content_type: str,
    category: Category,
    body: bytes | str,
    thread_id: uuid.UUID | None = None,
) -> str:
    """Save content to S3 storage and return the storage ID.

    Parameters
    ----------
    storage_client : StorageClient
        S3 or Azure client instance
    container_name : str
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
    key = f"{user_id}/{identifier}"
    metadata = {"category": str(category)}
    if thread_id:
        metadata["thread_id"] = str(thread_id)
    storage_client.put_object(
        container=container_name,
        key=key,
        body=body,
        content_type=content_type,
        metadata=metadata,
    )
    return identifier


def delete_from_storage(
    storage_client: StorageClient,
    container_name: str,
    user_id: uuid.UUID,
    thread_id: uuid.UUID,
) -> None:
    """Delete all objects from S3 storage that match the given user_id and thread_id.

    Parameters
    ----------
    storage_client : StorageClient
        S3 or Azure client instance
    container_name : str
        Name of the S3 bucket
    user_id : str
        User identifier
    thread_id : str
        Thread identifier for filtering objects to delete
    """
    # List all objects under the user's prefix
    prefix = f"{user_id}/"
    to_delete = []

    # Collect matching objects
    for key in storage_client.list_objects(container=container_name, prefix=prefix):
        meta = storage_client.get_metadata(container=container_name, key=key) or {}
        # metadata values are strings; compare to stringified thread_id
        if meta.get("thread_id") == str(thread_id):
            to_delete.append(key)

    # delete each (some providers support batch deletes; simple per-object delete here)
    for key in to_delete:
        storage_client.delete_object(container=container_name, key=key)


def get_token_count(usage: CompletionUsage | None) -> dict[str, int | None]:
    """Assign token count to a message given a usage chunk."""
    # Parse usage to add to message's data
    if usage:
        # Compute input, input_cached, completion
        input_tokens = usage.prompt_tokens
        cached_tokens = (
            usage.prompt_tokens_details.cached_tokens
            if usage.prompt_tokens_details
            else None
        )
        prompt_tokens = input_tokens - cached_tokens if cached_tokens else input_tokens
        completion_tokens = usage.completion_tokens

        return {
            "input_cached": cached_tokens,
            "input_noncached": prompt_tokens,
            "completion": completion_tokens,
        }
    else:
        return {"input_cached": None, "input_noncached": None, "completion": None}
