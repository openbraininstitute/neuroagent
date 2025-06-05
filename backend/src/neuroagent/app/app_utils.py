"""App utilities functions."""

import json
import logging
import re
import uuid
from pathlib import Path
from typing import Any, Sequence

import yaml
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from redis import asyncio as aioredis
from semantic_router import Route
from semantic_router.encoders import OpenAIEncoder
from semantic_router.index import LocalIndex
from semantic_router.routers import SemanticRouter
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, utc_now
from neuroagent.app.schemas import (
    MessagesRead,
    MessagesReadVercel,
    PaginatedResponse,
    TextPartVercel,
    ToolCallPartVercel,
    ToolCallVercel,
)
from neuroagent.schemas import EmbeddedBrainRegions

logger = logging.getLogger(__name__)


class RateLimitHeaders(BaseModel):
    """Headers for the rate limits."""

    x_ratelimit_limit: str = Field(alias="x-ratelimit-limit")
    x_ratelimit_remaining: str = Field(alias="x-ratelimit-remaining")
    x_ratelimit_reset: str = Field(alias="x-ratelimit-reset")

    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True)


def setup_engine(
    settings: Settings, connection_string: str | None = None
) -> AsyncEngine | None:
    """Get the SQL engine."""
    if connection_string:
        engine_kwargs: dict[str, Any] = {"url": connection_string}
        engine = create_async_engine(**engine_kwargs)
    else:
        logger.warning("The SQL db_prefix needs to be set to use the SQL DB.")
        return None
    try:
        engine.connect()
        logger.info(
            "Successfully connected to the SQL database"
            f" {connection_string if not settings.db.password else connection_string.replace(settings.db.password.get_secret_value(), '*****')}."
        )
        return engine
    except SQLAlchemyError:
        logger.warning(
            "Failed connection to SQL database"
            f" {connection_string if not settings.db.password else connection_string.replace(settings.db.password.get_secret_value(), '*****')}."
        )
        return None


def validate_project(
    groups: list[str],
    virtual_lab_id: str | None = None,
    project_id: str | None = None,
) -> None:
    """Check user appartenance to vlab and project before running agent."""
    if virtual_lab_id and not project_id:
        belongs_to_vlab = any([f"/vlab/{virtual_lab_id}" in group for group in groups])
        if not belongs_to_vlab:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="User does not belong to the virtual-lab.",
            )
    elif virtual_lab_id and project_id:
        # Certified approach by Bilal
        belongs_to_vlab_and_project = any(
            [f"/proj/{virtual_lab_id}/{project_id}" in group for group in groups]
        )
        if not belongs_to_vlab_and_project:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="User does not belong to the project.",
            )
    elif not virtual_lab_id and project_id:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Virtual-lab ID must be provided when providing a project ID",
        )
    else:
        # No vlab nor project provided, nothing to do.
        return


async def rate_limit(
    redis_client: aioredis.Redis | None,
    route_path: str,
    limit: int,
    expiry: int,
    user_sub: str,
) -> tuple[RateLimitHeaders, bool]:
    """Check rate limiting for a given route and user.

    Parameters
    ----------
    redis_client : aioredis.Redis
        Redis client instance
    route_path : str
        Path of the route being accessed
    limit : int
        Maximum number of requests allowed
    expiry : int
        Time in seconds before the rate limit resets
    user_sub : str
        User identifier

    Returns
    -------
    RateLimitHeaders
        Pydantic class detailing rate limit info and meant to be dumped in response headers.
    rate_limited
        Whether the user is rate limited. In parent endpoint raise error if True.
    """
    if redis_client is None:
        return RateLimitHeaders(
            x_ratelimit_limit="-1", x_ratelimit_remaining="-1", x_ratelimit_reset="-1"
        ), False  # redis disabled

    # Create key using normalized route path and user sub
    key = f"rate_limit:{user_sub}:{route_path}"

    # Get current count
    current = await redis_client.get(key)
    current = int(current) if current else 0

    if current > 0:
        # Get the remaining time
        ttl = await redis_client.pttl(key)
        if current + 1 > limit:
            # Rate limited
            return RateLimitHeaders(
                x_ratelimit_limit=str(limit),
                x_ratelimit_remaining="0",
                x_ratelimit_reset=str(round(ttl / 1000)),
            ), True

        # Not rate limited
        await redis_client.incr(key)
        return RateLimitHeaders(
            x_ratelimit_limit=str(limit),
            x_ratelimit_remaining=str(limit - current - 1),
            x_ratelimit_reset=str(round(ttl / 1000)),
        ), False

    # Key did not exist yet
    else:
        await redis_client.set(key, 1, ex=expiry)
        return RateLimitHeaders(
            x_ratelimit_limit=str(limit),
            x_ratelimit_remaining=str(limit - current - 1),
            x_ratelimit_reset=str(expiry),
        ), False


def get_semantic_router(settings: Settings) -> SemanticRouter | None:
    """Set the semantic router object for basic guardrails."""
    # Load routes and utterances from yaml file
    try:
        with (Path(__file__).parent.parent / "fixed_llm_responses.yml").open() as f:
            data = yaml.safe_load(f)
    except Exception:
        return None

    # Define the routes
    routes = [
        Route(
            name=route["name"],
            utterances=route["utterances"],
            metadata={"response": route["response"]},
            score_threshold=route.get("threshold"),
        )
        for route in data["routes"]
    ]

    if settings.openai.token and settings.openai.token.get_secret_value().startswith(
        "sk-"
    ):
        encoder = OpenAIEncoder(
            openai_api_key=settings.openai.token.get_secret_value(),
            name="text-embedding-3-small",
        )
    else:
        return None

    index = LocalIndex()
    return SemanticRouter(
        encoder=encoder, routes=routes, index=index, auto_sync="local"
    )


async def commit_messages(
    engine: AsyncEngine, messages: list[Messages], thread: Threads
) -> None:
    """Commit the messages in a bg task."""
    async with AsyncSession(engine) as session:
        session.add_all(messages)
        thread.update_date = utc_now()
        await session.commit()
        await session.close()


def get_br_embeddings(
    s3_client: Any, bucket_name: str, folder: str
) -> list[EmbeddedBrainRegions]:
    """Retrieve brain regions embeddings from s3."""
    file_list = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=folder)
    pattern = re.compile(rf"^{folder}/.*_hierarchy_embeddings.json$")
    output: list[EmbeddedBrainRegions] = []

    if "Contents" in file_list:
        for obj in file_list["Contents"]:
            key = obj["Key"]
            if pattern.match(key):
                file_obj = s3_client.get_object(Bucket=bucket_name, Key=key)
                content = json.loads(file_obj["Body"].read().decode("utf-8"))
                output.append(EmbeddedBrainRegions(**content))
    return output


def format_messages_output(
    db_messages: Sequence[Messages],
    tool_hil_mapping: dict[str, bool],
    has_more: bool,
    page_size: int,
) -> PaginatedResponse[MessagesRead]:
    """Format db messages to regular output schema."""
    messages = []
    for msg in db_messages:
        # Create a clean dict without SQLAlchemy attributes
        message_data = {
            "message_id": msg.message_id,
            "entity": msg.entity.value,  # Convert enum to string
            "thread_id": msg.thread_id,
            "is_complete": msg.is_complete,
            "creation_date": msg.creation_date.isoformat(),  # Convert datetime to string
            "msg_content": json.loads(msg.content),
        }

        # Map validation status based on tool requirements
        tool_calls_data = []
        for tc in msg.tool_calls:
            requires_validation = tool_hil_mapping.get(tc.name, False)

            if tc.validated is True:
                validation_status = "accepted"
            elif tc.validated is False:
                validation_status = "rejected"
            elif not requires_validation:
                validation_status = "not_required"
            else:
                validation_status = "pending"

            tool_calls_data.append(
                {
                    "tool_call_id": tc.tool_call_id,
                    "name": tc.name,
                    "arguments": tc.arguments,
                    "validated": validation_status,
                }
            )

        message_data["tool_calls"] = tool_calls_data
        messages.append(MessagesRead(**message_data))

    return PaginatedResponse(
        next_cursor=messages[-1].creation_date,
        has_more=has_more,
        page_size=page_size,
        results=messages,
    )


def format_messages_vercel(
    db_messages: Sequence[Messages],
    tool_hil_mapping: dict[str, bool],
    has_more: bool,
    page_size: int,
) -> PaginatedResponse[MessagesReadVercel]:
    """Format db messages to Vercel schema."""
    messages: list[MessagesReadVercel] = []
    tool_call_buffer: list[dict[str, Any]] = []

    for msg in reversed(db_messages):
        if msg.entity in [Entity.USER, Entity.AI_MESSAGE]:
            text_content = json.loads(msg.content).get("content")
            message_data = {
                "id": msg.message_id,
                "role": "user" if msg.entity == Entity.USER else "assistant",
                "createdAt": msg.creation_date,
                "content": text_content,
            }
            # add tool calls and reset buffer after attaching
            if msg.entity == Entity.AI_MESSAGE:
                message_data["parts"] = [
                    TextPartVercel(text=text_content),
                    *[
                        ToolCallPartVercel(toolInvocation=ToolCallVercel(**tool_call))
                        for tool_call in tool_call_buffer
                    ],
                ]
                message_data["annotations"] = [
                    {"message_id": msg.message_id, "isComplete": msg.is_complete},
                    *[
                        {
                            "toolCallId": tool_call["toolCallId"],
                            "validated": tool_call["validated"],
                            "isComplete": tool_call["is_complete"],
                        }
                        for tool_call in tool_call_buffer
                    ],
                ]
                tool_call_buffer = []
            # If we encounter a user message with a non empty buffer we have to add a dummy ai message.
            elif tool_call_buffer:
                last_tool_call = tool_call_buffer[-1]
                messages.append(
                    MessagesReadVercel(
                        **{
                            "id": uuid.uuid4().hex,
                            "role": "assistant",
                            "createdAt": last_tool_call["creation_date"],
                            "content": "",
                            "parts": [
                                ToolCallPartVercel(
                                    toolInvocation=ToolCallVercel(**tool_call)
                                )
                                for tool_call in tool_call_buffer
                            ],
                            "annotations": [
                                {
                                    "toolCallId": tool_call["toolCallId"],
                                    "validated": tool_call["validated"],
                                    "isComplete": tool_call["is_complete"],
                                }
                                for tool_call in tool_call_buffer
                            ],
                        }
                    )
                )
                tool_call_buffer = []

            messages.append(MessagesReadVercel(**message_data))

        # Buffer tool calls until the next AI_MESSAGE
        elif msg.entity == Entity.AI_TOOL:
            for tc in msg.tool_calls:
                requires_validation = tool_hil_mapping.get(tc.name, False)
                if tc.validated is True:
                    status = "accepted"
                elif tc.validated is False:
                    status = "rejected"
                elif not requires_validation:
                    status = "not_required"
                else:
                    status = "pending"

                tool_call_buffer.append(
                    {
                        "toolCallId": tc.tool_call_id,
                        "toolName": tc.name,
                        "args": tc.arguments,
                        "is_complete": msg.is_complete,
                        "state": "call",
                        # Needed for dummy messsages
                        "validated": status,
                        "creation_date": msg.creation_date,
                    }
                )

        # Merge the actual tool result back into the buffered part
        elif msg.entity == Entity.TOOL:
            tool_call_id = json.loads(msg.content).get("tool_call_id")
            tool_call = next(
                (
                    item
                    for item in tool_call_buffer
                    if item["toolCallId"] == tool_call_id
                ),
                None,
            )
            if tool_call:
                tool_call["results"] = json.loads(msg.content).get("content")
                tool_call["state"] = "result"
                tool_call["is_complete"] = msg.is_complete

    # If the tool call buffer is not empty, we need to add a dummy AI message.
    if tool_call_buffer:
        last_tool_call = tool_call_buffer[-1]
        messages.append(
            MessagesReadVercel(
                **{
                    "id": uuid.uuid4().hex,
                    "role": "assistant",
                    "createdAt": last_tool_call["creation_date"],
                    "content": "",
                    "parts": [
                        ToolCallPartVercel(toolInvocation=ToolCallVercel(**tool_call))
                        for tool_call in tool_call_buffer
                    ],
                    "annotations": [
                        {
                            "toolCallId": tool_call["toolCallId"],
                            "validated": tool_call["validated"],
                            "isComplete": tool_call["is_complete"],
                        }
                        for tool_call in tool_call_buffer
                    ],
                }
            )
        )

    # Reverse back to descending order and build next_cursor
    ordered_messages = list(reversed(messages))
    next_cursor = db_messages[-1].creation_date if has_more else None

    return PaginatedResponse(
        next_cursor=next_cursor,
        has_more=has_more,
        page_size=page_size,
        results=ordered_messages,
    )
