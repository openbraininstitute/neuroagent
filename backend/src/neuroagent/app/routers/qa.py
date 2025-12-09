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
    UserInfo,
)
from neuroagent.new_types import (
    Agent,
    ClientRequest,
)
from neuroagent.tools.base_tool import BaseTool
from neuroagent.tools.context_analyzer_tool import (
    ContextAnalyzerMetdata,
    ContextAnalyzerTool,
)
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

- Generate three user actions, each targeting a significantly different aspect or subtopic relevant to the main topic of the conversation. Each action should be phrased exactly as if the user is instructing the system to perform the action (e.g., "Show...", "Find...", "Analyze..."). Each action should be independent, and information contained or revealed in one action cannot be re-used, referred to, or assumed in the others. Any shared context or information must be restated in each action where necessary.
- **CRITICAL**: Actions must be in imperative mood (commands), NOT interrogative (questions). Do NOT end actions with question marks. Actions must always be phrased strictly from the user's perspective only. Do NOT generate or rephrase actions from the LLM's perspective. Avoid any formulations such as: "Would you like me to...", "Should I analyze...", "Do you want me to...", "Would it be helpful if I...", "Shall I retrieve...", "Can you...", "What is..." etc.
- Explore various distinct possibilities, e.g., visuals, metrics, literature, associated models, etc. Be creative.
- Only include actions that can be performed using the available tools.
- This LLM cannot call any tools; actions suggested must be based solely on the tool descriptions. Do not assume access to tools beyond what is described.
- Focus on advancing the user's workflow and showcasing what the chat can help with. Suggest logical next steps, deeper exploration, or related topics using the available tool information. Avoid producing mere variations of previous actions.
- Keep actions succinct and clear.
- When evaluating which actions make sense, refer only to the tools' purposes and minimal relevant input as described in the provided list; do not call or simulate tool execution.
- When suggesting actions, take into account any relevant entities, such as IDs, parameters, or references that have already been provided earlier in the conversation. If a tool requires such an input and it is already present and contextually appropriate, suggest actions that utilize this information directly.
- Ensure that the three actions each address substantially different elements of the main topic, leveraging the diversity of the tool set, while still remaining contextually relevant.
- The system does not allow export of data in any format (CSV, JSON, Excel, etc.). Do not suggest actions about exporting, downloading, or saving data to files.
- Do not suggest actions that have already been carried out in the conversation.
- Suggest workflows on subsets of data. Do not suggest analysis of large datasets.

## Output Format
- Output must be a JSON array (and nothing else) with exactly three strings.
- Always return exactly three appropriate actions (never more, never less). If the conversation context or tools do not support three contextually relevant actions, produce the most logically appropriate or useful actions, ensuring the output array still contains three strings. Output must always be a JSON array, with no surrounding text or formatting.

Available Tools:
{", ".join(tool_info)}"""

    else:
        # Get current page context
        # breakpoint()
        if body.frontend_url:
            context_tool = ContextAnalyzerTool(
                metadata=ContextAnalyzerMetdata(current_frontend_url=body.frontend_url),
                input_schema={},
            )
            try:
                context_output = await context_tool.arun()
                context_info = f"\nCurrent page context: {context_output.model_dump_json(exclude={'raw_path', 'query_params'})}"
            except Exception:
                context_info = ""
        else:
            context_info = ""

        content = [
            {
                "role": "user",
                "content": f"USER JOURNEY: \n{body.model_dump(exclude={'thread_id'}, mode='json')['click_history']}{context_info}",
            }
        ]
        system_prompt = f"""
Guidelines:

- Generate three user actions based on the user's current location and journey, each targeting a significantly different aspect. Each action must be phrased exactly as a user instruction to the system (e.g., "Show...", "Find...", "Analyze...").
- **CRITICAL**: Actions must be in imperative mood (commands), NOT interrogative (questions). Do NOT end actions with question marks. User actions must always be phrased from the user's perspective only. Do NOT rephrase actions from the perspective of the LLM or system—do not use formulations such as: "Would you like me to...", "Should I analyze...", "Do you want me to...", "Can you...", "What is..." etc.
- At least one action MUST be literature-related (such as searching for papers or finding publications).
- Explore a range of distinct possibilities, such as visuals, metrics, literature, associated models, etc. Be creative and leverage the variety of available tools.
- Only include actions that can be performed using the available tools.
- This LLM cannot call any tools directly; base your suggestions solely on tool descriptions and do not assume access to tools beyond what is described.
- Focus on demonstrating what the chat can help with, based on the user's current page and recent navigation.
- Keep each action succinct and clear.
- When determining which actions to suggest, refer only to the stated purposes and required minimal inputs of the tools; do not simulate or attempt tool execution.
- If the current page context includes entity IDs or other parameters, actions MUST explicitly include these values in the text (e.g., "Show morphology with ID abc-123"). This ensures clarity for both the user and the main LLM.
- Brain regions should be mentioned by their name (e.g., "Somatosensory cortex", "Hippocampus"), NOT by their ID. Use the brain region ID to infer or reference the brain region name if needed.
- Literature-related actions MUST use only general keywords or concepts (like brain region names or scientific terms) and NEVER database-specific or entity IDs.
- Ignore any page context information with the value `None` or `null`; do not reference or use such values in suggested actions.
- Ensure the three actions each address substantially different elements, utilizing the diversity of the tool set.
- Do not suggest actions involving data export, download, or saving to files, as these are not permitted (e.g., CSV, JSON, Excel, etc.).
- Suggest workflows only on subsets of data (e.g. on the first entry); do not propose analysis for large datasets.
- Emphasize the most recent navigation and current page, but cross-page questions related to the navigation history are allowed if relevant (Current time: {datetime.now(timezone.utc).isoformat()}).

Input format:
- USER JOURNEY—list of pages visited, each with a timestamp.
- Current page context—extracted information from the current URL with the following fields:
  - `observed_entity_type`: The type of entity being viewed (e.g., "morphology", "neuron", "simulation-campaign", "trace" etc...). If None, user is on a general page.
  - `current_entity_id`: The UUID of the specific entity being viewed. If None, user is on a list/overview page.
  - `brain_region_id`: Brain region ID from query parameters (br_id). If None, no brain region filter is active.

Typical action patterns:
- If `current_entity_id` is present: Suggest actions to analyze, visualize, or get more details about that specific entity (mention the entity ID explicitly).
- If `current_entity_id` is None but `observed_entity_type` is present: Suggest actions to search, filter, or retrieve entities of that type.
- If `brain_region_id` is present: Suggest actions related to that brain region by name (e.g., find related entities within the brain region, explore it in various atlases, search literature about it).
- If most fields are None: Suggest exploratory actions to help user discover available data or capabilities.

Output format:
- Return a JSON array containing exactly three appropriate user action strings (never more, never less). The output must be only the JSON array, with no surrounding text or formatting.
Available Tools:

{",".join(tool_info)}"""

    messages = [{"role": "system", "content": system_prompt}, *content]
    start = time.time()
    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model="gpt-5-nano",
        reasoning_effort="minimal",
        response_format=QuestionsSuggestions,
    )
    logger.debug(
        f"Used {response.usage.model_dump()} tokens. Response time: {time.time() - start}"
    )
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
