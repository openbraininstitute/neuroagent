"""App utilities functions."""

import json
import logging
import time
import uuid
from typing import Any, Literal, Sequence

from fastapi import HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field
from redis import asyncio as aioredis
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Task,
    Threads,
    TokenConsumption,
    TokenType,
    ToolSelection,
    utc_now,
)
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
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import get_token_count, messages_to_openai_content

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


async def commit_messages(
    session: AsyncSession, messages: list[Messages], thread: Threads
) -> None:
    """Commit the messages in a bg task."""
    session.add_all(messages)
    thread.update_date = utc_now()
    await session.commit()
    await session.close()


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
        message_data: dict[str, Any] = {
            "message_id": msg.message_id,
            "entity": msg.entity.value,  # Convert enum to string
            "thread_id": msg.thread_id,
            "is_complete": msg.is_complete,
            "creation_date": msg.creation_date.isoformat(),  # Convert datetime to string
            "msg_content": msg.content,
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
            content = (
                dict(msg.content) if isinstance(msg.content, dict) else msg.content
            )
            text_content = content.get("content") if isinstance(content, dict) else None
            reasoning_content = (
                content.get("reasoning") if isinstance(content, dict) else None
            )

            # Optional reasoning
            if reasoning_content:
                parts.append(ReasoningPartVercel(reasoning=reasoning_content))

            message_data: dict[str, Any] = {
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
            content = (
                dict(msg.content) if isinstance(msg.content, dict) else msg.content
            )
            text_content = content.get("content") if isinstance(content, dict) else None
            reasoning_content = (
                content.get("reasoning") if isinstance(content, dict) else None
            )

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
                try:
                    tc_args = json.loads(tc.arguments)
                except json.JSONDecodeError:
                    tc_args = tc.arguments
                parts.append(
                    ToolCallPartVercel(
                        toolInvocation=ToolCallVercel(
                            toolCallId=tc.tool_call_id,
                            toolName=tc.name,
                            args=tc_args,
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
            content = (
                dict(msg.content) if isinstance(msg.content, dict) else msg.content
            )
            tool_call_id = (
                content.get("tool_call_id") if isinstance(content, dict) else None
            )
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
                content = (
                    dict(msg.content) if isinstance(msg.content, dict) else msg.content
                )
                msg_content = (
                    content.get("content") if isinstance(content, dict) else None
                )
                tool_call.result = json.dumps(msg_content) if msg_content else None
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
    messages: list[Messages],
    tool_list: list[type[BaseTool]],
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

    openai_messages = await messages_to_openai_content(messages)

    # Remove the content of tool responses to save tokens
    for message in openai_messages:
        if message["role"] == "tool":
            message["content"] = "..."

    system_prompt = f"""TASK: Filter tools for AI agent based on conversation relevance.

TOOL DESCRIPTION FORMAT:
tool_name: tool_description
Example utterances: utterances

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
{(chr(10) * 2).join(f"{tool.name}: {tool.description + chr(10)}Example utterances: {chr(10) + '- ' + (chr(10) + '- ').join(utterance for utterance in tool.utterances)}" for tool in tool_list)}
"""

    # Prepare the dynamic pydantic output class
    tool_names = [tool.name for tool in tool_list]
    TOOL_NAMES_LITERAL = Literal[*tool_names]  # type: ignore

    class ToolFiltering(BaseModel):
        """Data class for tool selection by an LLM."""

        selected_tools: list[TOOL_NAMES_LITERAL] = Field(
            min_length=min_tool_selection,
            description=f"List of selected tool names, minimum {min_tool_selection} items. Must contain all of the tools relevant to the conversation. Must not contain duplicates.",
        )

    try:
        # Send the OpenAI request
        model = "google/gemini-2.5-flash"
        start_request = time.time()
        response = await openai_client.beta.chat.completions.parse(
            messages=[{"role": "system", "content": system_prompt}, *openai_messages],  # type: ignore[list-item]
            model=model,
            response_format=ToolFiltering,
        )

        # Parse the output
        if response.choices[0].message.parsed:
            selected_tools = list(
                set(response.choices[0].message.parsed.selected_tools)
            )
            logger.debug(
                f"#TOOLS: {len(selected_tools)}, SELECTED TOOLS: {selected_tools} in {(time.time() - start_request):.2f} s"
            )

            # Add selected tools into the message's data
            filtered_tools = [tool for tool in tool_list if tool.name in selected_tools]
            messages[-1].tool_selection = [
                ToolSelection(tool_name=tool.name) for tool in filtered_tools
            ]

            token_count = get_token_count(response.usage)
            token_consumption = [
                TokenConsumption(
                    type=token_type, task=Task.TOOL_SELECTION, count=count, model=model
                )
                for token_type, count in [
                    (TokenType.INPUT_CACHED, token_count["input_cached"]),
                    (TokenType.INPUT_NONCACHED, token_count["input_noncached"]),
                    (TokenType.COMPLETION, token_count["completion"]),
                ]
                if count
            ]
            # Assign to message
            messages[-1].token_consumption = token_consumption
        else:
            logger.warning("No parsed response from OpenAI, returning empty list")
            filtered_tools = []

        return filtered_tools
    except Exception as e:
        logger.error(f"Error filtering tools: {e}")
        return []
