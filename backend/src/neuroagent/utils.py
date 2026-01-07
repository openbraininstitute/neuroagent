"""Utilies for neuroagent."""

import asyncio
import json
import logging
import re
import uuid
from typing import Any, Literal

from celery.result import AsyncResult
from openai.types.completion_usage import CompletionUsage
from redis import asyncio as aioredis

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


async def short_poll_celery_ready_with_retry(
    task_result: AsyncResult,
    max_retries: int = 5,
    retry_delay: float = 0.1,
) -> dict[Any, Any]:
    """Poll Celery task with retries to handle race condition.

    When a task completes, there's a small window where the stream notification
    arrives before Celery finishes storing the result. This function retries
    checking task.ready() with short delays to handle this race condition.

    Parameters
    ----------
    task_result : AsyncResult
        The Celery AsyncResult object to wait for
    max_retries : int, optional
        Maximum number of retry attempts. Default is 5.
    retry_delay : float, optional
        Delay between retries in seconds. Default is 0.1 (100ms).

    Returns
    -------
    Any
        The task result value (deserialized from JSON/Redis)

    Raises
    ------
    Exception
        If the task fails, the exception raised by the task will be propagated
    """
    for attempt in range(max_retries):
        is_ready = await asyncio.to_thread(task_result.ready)
        if is_ready:
            return await asyncio.to_thread(task_result.get)
        # Wait a bit before retrying (except on last attempt)
        if attempt < max_retries - 1:
            await asyncio.sleep(retry_delay)

    # Final check after all retries
    is_ready = await asyncio.to_thread(task_result.ready)
    if is_ready:
        return await asyncio.to_thread(task_result.get)

    raise TimeoutError(
        f"Task {task_result.id} finished but it was not possible to retrieve the result after {max_retries} attempts. "
    )


async def long_poll_celery_result(
    task_result: AsyncResult,
    redis_client: aioredis.Redis,
    timeout: int = 30,
) -> dict[Any, Any]:
    """Wait for a Celery task result using Redis Streams with long polling.

    This function performs a single blocking XREAD call on a Redis stream until
    the task publishes a "done" message. The timeout is passed directly to XREAD
    as the block parameter. This is event-driven - Redis will wake up the coroutine
    immediately when the message arrives. Efficient for handling many concurrent tasks.

    Parameters
    ----------
    task_result : AsyncResult
        The Celery AsyncResult object to wait for
    redis_client : aioredis.Redis
        The Redis client instance for stream operations (assumed to be not None)
    timeout : int, optional
        Maximum time to wait in seconds. Converted to milliseconds for XREAD block.
        Default is 30.

    Returns
    -------
    Any
        The task result value (deserialized from JSON/Redis)

    Raises
    ------
    Exception
        If the task fails, the exception raised by the task will be propagated
    """
    task_id = task_result.id
    stream_key = f"task:{task_id}:progress"
    last_id = "$"  # Start reading from new messages
    block_ms = timeout * 1000  # Convert seconds to milliseconds

    messages = await redis_client.xread(
        {stream_key: last_id},
        block=block_ms,  # Block for timeout milliseconds
        count=1,
    )

    if messages:
        # Got a message from the stream, poll for result
        return await short_poll_celery_ready_with_retry(task_result)
    else:
        # No message received (timeout)
        raise TimeoutError(f"Task {task_id} did not finish within {timeout} seconds")
