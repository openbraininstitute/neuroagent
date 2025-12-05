"""App utilities functions."""

import json
import logging
import time
import uuid
from typing import Any, Literal, Sequence

from fastapi import HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field, create_model
from redis import asyncio as aioredis
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    ComplexityEstimation,
    Entity,
    Messages,
    ReasoningLevels,
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
from neuroagent.utils import get_token_count

logger = logging.getLogger(__name__)


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
    redis_client: aioredis.Redis,
    route_path: str,
    limit: int,
    expiry: int,
    user_sub: uuid.UUID,
    disabled: bool = False,
) -> tuple[RateLimitHeaders, bool]:
    """Check rate limiting for a given route and user.

    Parameters
    ----------
    redis_client : aioredis.Redis
        Redis client instance (never None)
    route_path : str
        Path of the route being accessed
    limit : int
        Maximum number of requests allowed
    expiry : int
        Time in seconds before the rate limit resets
    user_sub : uuid.UUID
        User identifier
    disabled : bool, optional
        Whether rate limiting is disabled

    Returns
    -------
    RateLimitHeaders
        Pydantic class detailing rate limit info and meant to be dumped in response headers.
    rate_limited
        Whether the user is rate limited. In parent endpoint raise error if True.
    """
    if disabled:
        return RateLimitHeaders(
            x_ratelimit_limit="-1", x_ratelimit_remaining="-1", x_ratelimit_reset="-1"
        ), False  # rate limiting disabled

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


def complexity_to_model_and_reasoning(complexity: int) -> dict[str, str | None]:
    """Map complexity score to optimal model and reasoning effort.

    Parameters
    ----------
    complexity : int
        Query complexity score from 0-10

    Returns
    -------
    dict[str, str]
        Dictionary with 'model' and optionally 'reasoning' keys
    """
    if complexity <= 1:
        return {"model": "openai/gpt-5-nano", "reasoning": "minimal"}
    elif complexity <= 5:
        return {"model": "openai/gpt-5-mini", "reasoning": "low"}
    elif complexity <= 8:
        return {"model": "openai/gpt-5-mini", "reasoning": "medium"}
    else:
        return {"model": "openai/gpt-5.1", "reasoning": "medium"}


async def filter_tools_and_model_by_conversation(
    messages: list[Messages],
    tool_list: list[type[BaseTool]],
    openai_client: AsyncOpenAI,
    settings: Settings,
    selected_model: str | None = None,
) -> tuple[list[type[BaseTool]], dict[str, str | None]]:
    """Filter tools and select model based on conversation context and query complexity.

    Uses an LLM to analyze the conversation history and determine which tools are relevant
    and what model/reasoning level is appropriate. Performs tool selection when the number
    of available tools exceeds the minimum threshold, and model selection when no model is
    pre-selected. Updates the last message with selection metadata and token consumption.

    Parameters
    ----------
    messages : list[Messages]
        Conversation history as database message objects
    tool_list : list[type[BaseTool]]
        Available tools to filter from
    openai_client : AsyncOpenAI
        OpenAI client for making LLM requests
    settings : Settings
        Application settings containing tool and model configuration
    selected_model : str | None, optional
        Pre-selected model name. If provided, skips model selection

    Returns
    -------
    tuple[list[type[BaseTool]], dict[str, str | None]]
        Filtered tool list and dictionary with 'model' and 'reasoning' keys

    Notes
    -----
    - Tool selection only occurs when len(tool_list) > settings.tools.min_tool_selection
    - Model selection only occurs when selected_model is None
    - Uses gemini-2.5-flash for the filtering/selection task
    - Updates messages[-1] with tool_selection, model_selection, and token_consumption
    - Falls back to defaults on errors: no tools and default model from settings
    """
    need_tool_selection = len(tool_list) > settings.tools.min_tool_selection
    need_model_selection = selected_model is None

    # If neither selection is needed, return defaults
    if (
        not need_tool_selection and selected_model is not None
    ):  # for mypy we check selected_model not need_model_selection
        model_reason_dict = {
            "model": selected_model,
            "reasoning": None,
        }  # TODO: chose reasoning effort in frontend
        messages[-1].model_selection = ComplexityEstimation(
            model=model_reason_dict["model"],
            reasoning=ReasoningLevels(model_reason_dict["reasoning"])
            if model_reason_dict.get("reasoning")
            else None,
        )
        return tool_list, model_reason_dict

    openai_messages = await messages_to_openai_content(messages)

    # Remove the content of tool responses to save tokens
    for message in openai_messages:
        if message["role"] == "tool":
            message["content"] = "..."

    # Build system prompt conditionally
    instructions = []
    output_fields = []

    if need_tool_selection:
        instructions.append(f"""TOOL SELECTION:
1. Analyze the conversation to identify required capabilities
2. Select at least {settings.tools.min_tool_selection} of the most relevant tools by name only
3. BIAS TOWARD INCLUSION: If uncertain about a tool's relevance, include it - better to provide too many tools than too few
4. Only exclude tools that are clearly irrelevant to the conversation
5. Each tool must be selected only once""")
        output_fields.append("selected_tools: [tool_name1, tool_name2, ...]")

    if need_model_selection:
        instructions.append("""COMPLEXITY RANKING (0-10):
Evaluate the inherent complexity of the query while considering how well the selected tools can address it. This determines model selection and reasoning effort.
- 0-1: Simple query answerable directly from LLM knowledge (no tools needed)
- 2-3: Straightforward query with a tool that directly solves it (single call, minimal reasoning)
- 4-6: Moderate query requiring some reasoning, even with helpful tools (2-3 calls, basic orchestration)
- 7-8: Complex query requiring significant reasoning despite tool support (multi-step workflows, cross-referencing)
- 9-10: Highly complex query demanding deep reasoning even with available tools (extensive orchestration, novel problem-solving)""")
        output_fields.append("complexity: int")

    task_desc = []
    if need_tool_selection:
        task_desc.append("filter tools")
    if need_model_selection:
        task_desc.append("rank query complexity")

    system_prompt = f"""TASK: {" and ".join(task_desc).capitalize()}.

{chr(10).join(instructions)}

Do not respond to user queries - only {" and ".join(task_desc)}.

OUTPUT: {{ {", ".join(output_fields)} }}

AVAILABLE TOOLS:
{(chr(10) * 2).join(f"{tool.name}: {tool.description + chr(10)}Example utterances: {chr(10) + '- ' + (chr(10) + '- ').join(utterance for utterance in tool.utterances)}" for tool in tool_list)}"""

    # Prepare the dynamic pydantic output class
    class_fields: dict[str, Any] = {}
    if need_tool_selection:
        tool_names = [tool.name for tool in tool_list]
        TOOL_NAMES_LITERAL = Literal[*tool_names]  # type: ignore
        class_fields["selected_tools"] = (
            list[TOOL_NAMES_LITERAL],
            Field(
                min_length=settings.tools.min_tool_selection,
                description=f"List of selected tool names, minimum {settings.tools.min_tool_selection} items. Must contain all of the tools relevant to the conversation. Must not contain duplicates.",
            ),
        )
    if need_model_selection:
        class_fields["complexity"] = (
            int,
            Field(
                ge=0,
                le=10,
                description="Complexity of the query on a scale from 0 to 10. Trivial queries are ranked 0, extremely hard ones are ranked 10",
            ),
        )

    ToolModelFiltering = create_model("ToolModelFiltering", **class_fields)

    try:
        # Send the OpenAI request
        model = "google/gemini-2.5-flash"
        start_request = time.time()
        response = await openai_client.beta.chat.completions.parse(
            messages=[{"role": "system", "content": system_prompt}, *openai_messages],  # type: ignore
            model=model,
            response_format=ToolModelFiltering,
        )

        # Parse the output
        if response.choices[0].message.parsed:
            parsed = response.choices[0].message.parsed

            # Handle tool selection
            if need_tool_selection:
                selected_tools = list(set(parsed.selected_tools))
                filtered_tools = [
                    tool for tool in tool_list if tool.name in selected_tools
                ]
                messages[-1].tool_selection = [
                    ToolSelection(tool_name=tool.name) for tool in filtered_tools
                ]
            else:
                filtered_tools = tool_list

            # Handle model selection
            if need_model_selection:
                complexity: int | None = parsed.complexity
                model_reason_dict = complexity_to_model_and_reasoning(complexity)
            else:
                complexity = None
                model_reason_dict = {"model": selected_model, "reasoning": None}

            logger.debug(
                f"Query complexity: {complexity if complexity is not None else 'N/A'} / 10, selected model {model_reason_dict['model'].lstrip('openai/')} with reasoning effort {model_reason_dict.get('reasoning', 'N/A')}  #TOOLS: {len(filtered_tools)}, SELECTED TOOLS: {[t.name for t in filtered_tools]} in {(time.time() - start_request):.2f} s"
            )

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
            messages[-1].token_consumption = token_consumption

        else:
            logger.warning("No parsed response from OpenAI, returning defaults")
            filtered_tools = tool_list if not need_tool_selection else []
            complexity = None
            model_reason_dict = {
                "model": selected_model
                if selected_model
                else settings.llm.default_chat_model,
                "reasoning": None
                if selected_model
                else settings.llm.default_chat_reasoning,
            }

    except Exception as e:
        logger.error(f"Error filtering tools: {e}")
        filtered_tools = tool_list if not need_tool_selection else []
        complexity = None
        model_reason_dict = {
            "model": selected_model
            if selected_model
            else settings.llm.default_chat_model,
            "reasoning": None
            if selected_model
            else settings.llm.default_chat_reasoning,
        }

    messages[-1].model_selection = ComplexityEstimation(
        complexity=complexity,
        model=model_reason_dict["model"],
        reasoning=ReasoningLevels(model_reason_dict["reasoning"])
        if model_reason_dict.get("reasoning")
        else None,
    )
    return filtered_tools, model_reason_dict
