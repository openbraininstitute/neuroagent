"""App utilities functions."""

import json
import logging
import re
import uuid
from pathlib import Path
from typing import Any, Literal, Sequence

import yaml
from fastapi import HTTPException
from openai import AsyncOpenAI
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
    AnnotationMessageVercel,
    AnnotationToolCallVercel,
    MessagesRead,
    MessagesReadVercel,
    PaginatedResponse,
    RateLimitInfo,
    ReasoningPartVercel,
    TextPartVercel,
    ToolCallPartVercel,
    ToolCallVercel,
)
from neuroagent.schemas import EmbeddedBrainRegions
from neuroagent.tools.base_tool import BaseTool

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
    virtual_lab_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
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
    user_sub: uuid.UUID,
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
    user_sub : uuid.UUID
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

    if (
        settings.llm.openai_token
        and settings.llm.openai_token.get_secret_value().startswith("sk-")
    ):
        encoder = OpenAIEncoder(
            openai_api_key=settings.llm.openai_token.get_secret_value(),
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
            "model": msg.model,
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
    parts: list[TextPartVercel | ToolCallPartVercel | ReasoningPartVercel] = []
    annotations: list[AnnotationMessageVercel | AnnotationToolCallVercel] = []

    for msg in reversed(db_messages):
        if msg.entity in [Entity.USER, Entity.AI_MESSAGE]:
            content = json.loads(msg.content)
            text_content = content.get("content")
            reasoning_content = content.get("reasoning")

            # Optional reasoning
            if reasoning_content:
                parts.append(ReasoningPartVercel(reasoning=reasoning_content))

            message_data = {
                "id": msg.message_id,
                "role": "user" if msg.entity == Entity.USER else "assistant",
                "createdAt": msg.creation_date,
                "content": text_content,
            }
            # add tool calls and reset buffer after attaching
            if msg.entity == Entity.AI_MESSAGE:
                if text_content:
                    parts.append(TextPartVercel(text=text_content))

                annotations.append(
                    AnnotationMessageVercel(
                        messageId=msg.message_id, isComplete=msg.is_complete
                    )
                )

                message_data["parts"] = parts
                message_data["annotations"] = annotations

            # If we encounter a user message with a non empty buffer we have to add a dummy ai message.
            elif parts:
                messages.append(
                    MessagesReadVercel(
                        id=uuid.uuid4(),
                        role="assistant",
                        createdAt=msg.creation_date,
                        content="",
                        parts=parts,
                        annotations=annotations,
                    )
                )

            parts = []
            annotations = []
            messages.append(MessagesReadVercel(**message_data))

        # Buffer tool calls until the next AI_MESSAGE
        elif msg.entity == Entity.AI_TOOL:
            content = json.loads(msg.content)
            text_content = content.get("content")
            reasoning_content = content.get("reasoning")

            # Add optional reasoning
            if reasoning_content:
                parts.append(ReasoningPartVercel(reasoning=reasoning_content))

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

                parts.append(TextPartVercel(text=text_content or ""))
                parts.append(
                    ToolCallPartVercel(
                        toolInvocation=ToolCallVercel(
                            toolCallId=tc.tool_call_id,
                            toolName=tc.name,
                            args=json.loads(tc.arguments),
                            state="call",
                        )
                    )
                )
                annotations.append(
                    AnnotationToolCallVercel(
                        toolCallId=tc.tool_call_id,
                        validated=status,  # type: ignore
                        isComplete=msg.is_complete,
                    )
                )

        # Merge the actual tool result back into the buffered part
        elif msg.entity == Entity.TOOL:
            tool_call_id = json.loads(msg.content).get("tool_call_id")
            tool_call = next(
                (
                    part.toolInvocation
                    for part in parts
                    if isinstance(part, ToolCallPartVercel)
                    and part.toolInvocation.toolCallId == tool_call_id
                ),
                None,
            )
            annotation = next(
                (
                    annotation
                    for annotation in annotations
                    if isinstance(annotation, AnnotationToolCallVercel)
                    and annotation.toolCallId == tool_call_id
                ),
                None,
            )
            if tool_call:
                tool_call.result = json.loads(msg.content).get("content")
                tool_call.state = "result"

            if annotation:
                annotation.isComplete = msg.is_complete

    # If the tool call buffer is not empty, we need to add a dummy AI message.
    if parts:
        messages.append(
            MessagesReadVercel(
                id=uuid.uuid4(),
                role="assistant",
                createdAt=msg.creation_date,
                content="",
                parts=parts,
                annotations=annotations,
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


def parse_redis_data(
    field: str, redis_info: dict[str, tuple[str | None, int]], limit: int
) -> RateLimitInfo:
    """From a dictionary containing redis key-value mappings, populate pydantic class."""
    # Map the field to an actual redis key
    redis_key = next((key for key in redis_info.keys() if field in key), None)

    # Compute remaining and reset_in
    remaining = (
        max(0, limit - int(redis_info[redis_key][0] or 0)) if redis_key else limit
    )
    reset_in = (
        round(redis_info[redis_key][1] / 1000)
        if redis_key and redis_info[redis_key][1] > 0
        else None
    )

    return RateLimitInfo(
        limit=limit,
        remaining=remaining,
        reset_in=reset_in,
    )


async def filter_tools_by_conversation(
    openai_messages: list[dict[str, str]],
    tool_list: list[type[BaseTool]],
    user_content: str,
    openai_client: AsyncOpenAI,
    min_tool_selection: int,
) -> list[type[BaseTool]]:
    """
    Filter tools based on conversation relevance.

    Parameters
    ----------
    openai_messages:
        List of OpenAI formatted messages
    tool_list:
        List of available tools
    user_content:
        Current user message content
    openai_client:
        OpenAI client instance
    min_tool_selection:
        Minimum numbers of tools the LLM should select

    Returns
    -------
        List of filtered tools relevant to the conversation
    """
    if len(tool_list) <= min_tool_selection:
        return tool_list

    # Remove the content of tool responses to save tokens
    for message in openai_messages:
        if message["role"] == "tool":
            message["content"] = "..."

    # Add the current user message
    openai_messages.append({"role": "user", "content": user_content})

    system_prompt = f"""TASK: Filter tools for AI agent based on conversation relevance.

INSTRUCTIONS:
1. Analyze the conversation to identify required capabilities
2. Select at least {min_tool_selection} of the most relevant tools by name only
3. BIAS TOWARD INCLUSION: If uncertain about a tool's relevance, include it - better to provide too many tools than too few
4. Only exclude tools that are clearly irrelevant to the conversation
5. Output format: comma-separated list of tool names
6. Do not respond to user queries - only filter tools
7. Each tool must be selected only once.

OUTPUT: [tool_name1, tool_name2, ...]

AVAILABLE TOOLS:
{chr(10).join(f"{tool.name}: {tool.description}" for tool in tool_list)}
"""

    tool_names = [tool.name for tool in tool_list]
    TOOL_NAMES_LITERAL = Literal[*tool_names]  # type: ignore

    class ToolSelection(BaseModel):
        """Data class for tool selection by an LLM."""

        selected_tools: list[TOOL_NAMES_LITERAL] = Field(
            min_length=min_tool_selection,
            description=f"List of selected tool names, minimum {min_tool_selection} items. Must contain all of the tools relevant to the conversation.",
        )

    try:
        response = await openai_client.beta.chat.completions.parse(
            messages=[{"role": "system", "content": system_prompt}, *openai_messages],  # type: ignore
            model="gpt-4o-mini",
            response_format=ToolSelection,
        )

        if response.choices[0].message.parsed:
            selected_tools = response.choices[0].message.parsed.selected_tools
            logger.debug(
                f"QUERY: {user_content}, #TOOLS: {len(selected_tools)}, SELECTED TOOLS: {selected_tools}"
            )
            return [tool for tool in tool_list if tool.name in selected_tools]
        else:
            logger.warning("No parsed response from OpenAI, returning empty list")
            return []
    except Exception as e:
        logger.error(f"Error filtering tools: {e}")
        return []
