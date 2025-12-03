"""Endpoints for agent's question answering pipeline."""

import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncIterator
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Response,
)
from fastapi.responses import StreamingResponse
from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.constants import ServiceSubtype
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import (
    commit_messages,
    rate_limit,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Messages, Threads
from neuroagent.app.dependencies import (
    get_accounting_session_factory,
    get_agents_routine,
    get_context_variables,
    get_openai_client,
    get_openrouter_models,
    get_redis_client,
    get_session,
    get_settings,
    get_starting_agent,
    get_thread,
    get_tool_list,
    get_user_info,
)
from neuroagent.app.schemas import (
    OpenRouterModelResponse,
    QuestionsSuggestions,
    QuestionsSuggestionsRequest,
    QuestionSuggestionNoMessages,
    UserInfo,
)
from neuroagent.new_types import (
    Agent,
    ClientRequest,
)
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import messages_to_openai_content

router = APIRouter(prefix="/qa", tags=["Run the agent"])

logger = logging.getLogger(__name__)


@asynccontextmanager
async def noop_accounting_context(*args: Any, **kwargs: Any) -> AsyncIterator[None]:
    """No-op context manager that accepts any arguments but does nothing."""
    yield None


@router.post("/question_suggestions")
async def question_suggestions(
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    redis_client: Annotated[aioredis.Redis | None, Depends(get_redis_client)],
    fastapi_response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    body: QuestionsSuggestionsRequest,
    vlab_id: UUID | None = None,
    project_id: UUID | None = None,
) -> QuestionsSuggestions:
    """Generate suggested question taking into account the user journey and the user previous messages."""
    if body.thread_id is None:
        # if there is no thread ID, we simply go without messages.
        is_in_chat = False
        if not body.click_history:
            raise HTTPException(
                status_code=422,
                detail="One of 'thread_id' or 'click_history' must be provided.",
            )
    else:
        # We have to call get_thread explicitely.
        thread = await get_thread(user_info, body.thread_id, session)

    if vlab_id is not None and project_id is not None:
        validate_project(
            groups=user_info.groups,
            virtual_lab_id=vlab_id,
            project_id=project_id,
        )
        limit = settings.rate_limiter.limit_suggestions_inside
    else:
        limit = settings.rate_limiter.limit_suggestions_outside

    limit_headers, rate_limited = await rate_limit(
        redis_client=redis_client,
        route_path="/qa/question_suggestions",
        limit=limit,
        expiry=settings.rate_limiter.expiry_suggestions,
        user_sub=user_info.sub,
    )
    if rate_limited:
        raise HTTPException(
            status_code=429,
            detail={"error": "Rate limit exceeded"},
            headers={
                "Access-Control-Expose-Headers": ",".join(
                    list(limit_headers.model_dump(by_alias=True).keys())
                ),
                **limit_headers.model_dump(by_alias=True),
            },
        )
    fastapi_response.headers.update(
        {
            "Access-Control-Expose-Headers": ",".join(
                list(limit_headers.model_dump(by_alias=True).keys())
            ),
            **limit_headers.model_dump(by_alias=True),
        }
    )

    if body.thread_id is not None:
        # Get the AI and User messages from the conversation :
        thread = await session.get(Threads, body.thread_id)
        messages = await thread.awaitable_attrs.messages
        openai_messages = await messages_to_openai_content(messages)

        # Remove the content of tool responses to save tokens
        for message in openai_messages:
            if message["role"] == "tool":
                message["content"] = "..."
        # messages_result = await session.execute(
        #     select(Messages)
        #     .where(
        #         Messages.thread_id == thread.thread_id,
        #         or_(
        #             Messages.entity == Entity.USER,
        #             Messages.entity == Entity.AI_MESSAGE,
        #         ),
        #     )
        #     .order_by(Messages.creation_date)
        # )
        # db_messages = messages_result.unique().scalars().all()

        is_in_chat = bool(openai_messages)
        if not is_in_chat and not body.click_history:
            raise HTTPException(
                status_code=404,
                detail="The thread is empty and the 'click_history' wasn't provided.",
            )

    tool_info = [f"{tool.name}: {tool.description}" for tool in tool_list]

    if is_in_chat:
        # content = f"CONVERSATION MESSAGES: \n{json.dumps([{k: v for k, v in json.loads(msg.content).items() if k in ['role', 'content']} for msg in db_messages])}"
        content = openai_messages  # TODO: Restrict to only a couple of messages back not everything.
        system_prompt = f"""
Guidelines:

- Generate three questions, each on a significantly different aspect or subtopic relevant to the main topic of the conversation, and each phrased from the user's perspective (e.g., "Show me...", "What is...", "Can you...").
- **CRITICAL**: DO NOT generate questions that an LLM would ask. GENERATE QUESTIONS A HUMAN WOULD ASK TO THE LLM.
- Explore various distinct possibilities. E.g. visuals, metrics, literature, associated models, etc... Be creative.
- Only include questions that can be answered using the available tools.
- This LLM cannot call any tools, suggestions must be based solely on the descriptions. Do not assume access to tools beyond what is described.
- Focus on advancing the user's workflow and showcasing what the chat can help with. Suggest logical next steps, deeper exploration, or related topics using the available tool information. Avoid producing mere variations of previous questions.
- Keep questions succinct and clear.
- When evaluating which questions make sense, refer only to the tools' purposes and minimal relevant input as described in the provided list; do not call or simulate tool execution.
- Ensure that the three questions each address substantially different elements of the main topic, leveraging the diversity of the tool set, while still remaining contextually relevant.
- It is not possible to export data in any format. Do not suggest such questions.
- Do not suggest questions that have already been answered in the conversation.
- Suggest workflows on subsets of data. Do not suggest analysis of large datasets.

## Output Format

- Output must be a JSON array (and nothing else) with exactly three strings.
- Always return exactly three appropriate questions (never more, never less). If the conversation context or tools do not support three contextually relevant questions, produce the most logically appropriate or useful questions, ensuring the output array still contains three strings. Output must always be a JSON array, with no surrounding text or formatting.

Available Tools:
{", ".join(tool_info)}"""

    else:
        content = f"USER JOURNEY: \n{body.model_dump(exclude={'thread_id'}, mode='json')['click_history']}"
        system_prompt = f"""Generate one question the user might ask next.

Rules:
- Questions must be from the user's perspective (e.g., "Show me...", "What is...", "Can you...")
- Each question must be answerable using ONLY the available tools below
- Focus on the most recent clicks (current time: {datetime.now(timezone.utc).isoformat()})
- Keep questions clear and concise

Input format: USER JOURNEY

Available Tools:
{",".join(tool_info)}"""  # TODO: Modify system prompt for empty conversations.

    messages = [{"role": "system", "content": system_prompt}, *content]
    start = time.time()
    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model="gpt-5-nano",
        reasoning_effort="minimal",
        response_format=QuestionsSuggestions
        if is_in_chat
        else QuestionSuggestionNoMessages,
    )
    logger.debug(
        f"Used {response.usage.model_dump()} tokens. Response time: {time.time() - start}"
    )
    # breakpoint()
    return response.choices[0].message.parsed  # type: ignore


@router.get("/models")
async def get_available_LLM_models(
    filtererd_models: Annotated[
        list[OpenRouterModelResponse], Depends(get_openrouter_models)
    ],
    _: Annotated[UserInfo, Depends(get_user_info)],
) -> list[OpenRouterModelResponse]:
    """Get available LLM models."""
    return filtererd_models


@router.post("/chat_streamed/{thread_id}")
async def stream_chat_agent(
    user_request: ClientRequest,
    redis_client: Annotated[aioredis.Redis | None, Depends(get_redis_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    thread: Annotated[Threads, Depends(get_thread)],
    agents_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
    agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
    accounting_session_factory: Annotated[
        AsyncAccountingSessionFactory, Depends(get_accounting_session_factory)
    ],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    session: Annotated[AsyncSession, Depends(get_session)],
    background_tasks: BackgroundTasks,
) -> StreamingResponse:
    """Run a single agent query in a streamed fashion."""
    limit_headers, rate_limited = await rate_limit(
        redis_client=redis_client,
        route_path="/qa/chat_streamed/{thread_id}",
        limit=settings.rate_limiter.limit_chat,
        expiry=settings.rate_limiter.expiry_chat,
        user_sub=thread.user_id,
    )
    if rate_limited:
        # Outside of vlab, cannot send requests anymore
        if thread.vlab_id is None or thread.project_id is None:
            raise HTTPException(
                status_code=429,
                detail={"error": "Rate limit exceeded"},
                headers={
                    "Access-Control-Expose-Headers": ",".join(
                        list(limit_headers.model_dump(by_alias=True).keys())
                    ),
                    **limit_headers.model_dump(by_alias=True),
                },
            )
        # Inside of vlab, you start paying
        else:
            accounting_context = accounting_session_factory.oneshot_session
    # Not rate limited, you don't pay
    else:
        accounting_context = noop_accounting_context

    if len(user_request.content) > settings.misc.query_max_size:
        raise HTTPException(
            status_code=413,
            detail=f"Query string has {len(user_request.content)} characters. Maximum allowed is {settings.misc.query_max_size}.",
        )

    # For openai requests, ditch openrouter
    if agent.model.startswith("openai/"):
        agent.model = agent.model.removeprefix("openai/")
        agents_routine.client = openai_client

    # No need to await since it has been awaited in tool filtering dependency
    messages: list[Messages] = thread.messages

    background_tasks.add_task(commit_messages, session, messages, thread)
    async with accounting_context(
        subtype=ServiceSubtype.ML_LLM,
        user_id=thread.user_id,
        proj_id=thread.project_id,
        count=1,
    ):
        stream_generator = agents_routine.astream(
            agent=agent,
            messages=messages,
            context_variables=context_variables,
            max_turns=settings.agent.max_turns,
            max_parallel_tool_calls=settings.agent.max_parallel_tool_calls,
        )
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={
            "x-vercel-ai-data-stream": "v1",
            "Access-Control-Expose-Headers": ",".join(
                list(limit_headers.model_dump(by_alias=True).keys())
            ),
            **limit_headers.model_dump(by_alias=True),
        },
    )
