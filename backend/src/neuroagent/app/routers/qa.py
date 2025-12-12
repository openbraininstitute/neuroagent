"""Endpoints for agent's question answering pipeline."""

import logging
from contextlib import asynccontextmanager
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
from httpx import AsyncClient
from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.constants import ServiceSubtype
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    get_httpx_client,
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
    ContextAnalyzerInput,
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
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
    body: QuestionsSuggestionsRequest,
    vlab_id: UUID | None = None,
    project_id: UUID | None = None,
) -> QuestionsSuggestions:
    """Generate suggested questions based on the user's previous messages."""
    if body.thread_id is None:
        # if there is no thread ID, we simply go without messages.
        is_in_chat = False

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
        # Get the AI and User messages from the conversation:
        thread = await session.get(
            Threads, body.thread_id, options=[selectinload(Threads.messages)]
        )
        if not thread:
            raise HTTPException(
                status_code=404,
                detail=f"Thread with id {body.thread_id} not found.",
            )
        openai_messages = await messages_to_openai_content(thread.messages)

        # Remove the tool calls.
        user_ai_messages = []
        for message in openai_messages:
            if message["role"] == "user" or (
                message["role"] == "assistant" and not message.get("tool_calls")
            ):
                user_ai_messages.append(message)

        is_in_chat = bool(openai_messages)

    tool_info = [f"{tool.name}: {tool.description}" for tool in tool_list]

    # ====================================IN CHAT===============================================
    if is_in_chat:
        content = user_ai_messages[
            -4:
        ]  # 4 last messages, no special reason for that number
        system_prompt = f"""
Guidelines:

- Generate three user actions, each targeting a significantly different aspect or subtopic relevant to the main topic of the conversation. Each action should be phrased exactly as if the user is instructing the system to perform the action (e.g., "Show...", "Find...", "Analyze..."). Each action should be independent, and information contained or revealed in one action cannot be re-used, referred to, or assumed in the others. Any shared context or information must be restated in each action where necessary.
- **CRITICAL**: Actions must be in imperative mood (commands), NOT interrogative (questions). Do NOT end actions with question marks. Actions must always be phrased strictly from the user's perspective only. Do NOT generate or rephrase actions from the LLM's perspective. Avoid any formulations such as: "Would you like me to...", "Should I analyze...", "Do you want me to...", "Would it be helpful if I...", "Shall I retrieve...", "Can you...", "What is..." etc.
- Explore various distinct possibilities, e.g., visuals, metrics, literature, associated models, etc. Be creative.
- Only include actions that can be performed using the available tools described below.
- This LLM cannot call any tools; actions suggested must be based solely on the tool descriptions. Do not assume access to tools beyond what is described.
- Focus on advancing the user's workflow and showcasing what the chat can help with. Suggest logical next steps, deeper exploration, or related topics using the available tool information. Avoid producing mere variations of previous actions.
- Keep actions succinct and clear.
- When evaluating which actions make sense, refer only to the tools' purposes and minimal relevant input as described in the provided list; do not call or simulate tool execution.
- When suggesting actions, take into account any relevant entities, such as IDs, parameters, or references that have already been provided earlier in the conversation. If a tool requires such an input and it is already present and contextually appropriate, suggest actions that utilize this information directly.
- Ensure that the three actions each address substantially different elements of the main topic, leveraging the diversity of the tool set, while still remaining contextually relevant.
- The system does not allow export of data in any format (CSV, JSON, Excel, etc.). Do not suggest actions about exporting, downloading, or saving data to files.
- Do not suggest actions that have already been carried out in the conversation.
- Suggest workflows on subsets of data (max 5 elements). Do not suggest analysis or retrieval of large datasets, such as retrieving full lists of entities or resolving full hierarchies (e.g., all child brain regions). Suggested actions must only span small, manageable subsets (no more than 5 entities) to avoid triggering huge workflows. Do not suggest actions that can generate a lot of data.

Tool Description Format
- `tool_name: tool_description`

Output Format
- Output must be a JSON array (and nothing else) with exactly three strings.
- Always return exactly three appropriate actions (never more, never less). If the conversation context or tools do not support three contextually relevant actions, produce the most logically appropriate or useful actions, ensuring the output array still contains three strings. Output must always be a JSON array, with no surrounding text or formatting.

Available Tools:
{chr(10).join(tool_info)}"""

    # ====================================NOT IN CHAT===========================================
    else:
        # Get current page context
        if body.frontend_url:
            context_tool = ContextAnalyzerTool(
                metadata=ContextAnalyzerMetdata(current_frontend_url=body.frontend_url),
                input_schema=ContextAnalyzerInput(),
            )
            try:
                # Get current page info
                context_output = await context_tool.arun()

                # Get BR name from ID
                if context_output.brain_region_id is not None:
                    headers: dict[str, str] = {}
                    if vlab_id is not None:
                        headers["virtual-lab-id"] = str(vlab_id)
                    if project_id is not None:
                        headers["project-id"] = str(project_id)

                    # Query GET ONE Brain Region in entitycore
                    response = await httpx_client.get(
                        url=settings.tools.entitycore.url.rstrip("/")
                        + f"/brain-region/{context_output.brain_region_id}",
                        headers=headers,
                    )
                    if response.status_code != 200:
                        brain_region_name = None

                    brain_region_name = response.json()["name"]
                else:
                    brain_region_name = None

                # Dump page context
                context_output_json = context_output.model_dump(
                    mode="json", exclude={"raw_path", "query_params"}
                )

                # Add resolved BR name. Even if `None` it carries info
                # if brain_region_name is not None:
                #     context_output_json["brain_region_name"] = brain_region_name
                #     context_output_json.pop("brain_region_id", None)
                context_output_json["brain_region_name"] = brain_region_name

                context_info = f"\nCurrent page context: {context_output_json}"
            except Exception:
                context_info = ""
        else:
            context_info = ""

        content = [
            {
                "role": "user",
                "content": context_info,
            }
        ]
        system_prompt = f"""
Guidelines:
- Generate three user actions based on the user's current location, each action targeting a distinctly different aspect. Each action must be written as a natural, conversational command a user would say (e.g., "Show me...", "Find papers about...", "Analyze the...", "Compare...", "Visualize...").
- **CRITICAL**: Actions must use the imperative mood (commands), not interrogative (questions). Do not end actions with question marks. User actions must always be worded from the user's perspective only, never rephrase from the LLM or system's viewpoint. Avoid phrases such as: "Would you like me to...", "Should I analyze...", "Do you want me to...", "Can you...", "What is..." etc.
- Use conversational, natural phrasing that sounds like how real users speak. Prefer phrases like "Show me...", "Find...", "Get...", "Compare...", "Visualize..." and avoid robotic or stiff language.
- At least one action MUST be literature-related (such as searching for papers or finding publications).
- For non-literature actions, focus on the current page context provided in the user message.
- Explore a diverse set of possibilities: visuals, metrics, literature, related models, etc. Apply creativity and use the variety of tools available.
- Only include actions possible with the provided toolset. Reference only described tool capabilities and minimal required inputs, and do not simulate tool responses.
- The LLM cannot execute tools directly; base all actions on tool descriptions alone. Do not assume access to tools beyond their described capabilities.
- Focus on demonstrating what the chat can help with based on the user's current page. Explore creative options based on available tools.
- Keep actions succinct and clear.
- When selecting actions, refer only to described tool purposes and minimal required inputs. Do not simulate or mimic tool usage.
- If the current page context contains entity IDs or other parameters, explicitly state these values in the action text for clarity.
- Refer to brain regions by their names (e.g., "Somatosensory cortex", "Hippocampus"), never by their IDs.
- Ignore any page context information with value `None` or `null`; do not use such values in suggested actions.
- Ensure all three actions cover substantially different features or elements, making use of the tool set's diversity.
- Do not suggest actions involving exporting, downloading, or saving data/files (e.g., CSV, JSON, Excel).
- Suggest workflows on subsets of data (max 5 elements). Do not suggest analysis of large datasets, such as full hierarchies. Do not suggest actions that can generate a lot of data.

Tool Description Format
- `tool_name: tool_description`

Input format:
- Current page context with fields:
- `observed_entity_type`: Type of entity being viewed. `None` means a general page.
- `current_entity_id`: UUID of the specific entity being viewed. (`brain_region_id` is NOT an entity ID.) `None` means a list/overview page.
- `brain_region_id`: This identifies the selected brain region but is not an entity ID. `None` means no region filter is active.
- `brain_region_name`: Name of the brain region with this ID. `None` means that the name resolving could not be performed from the ID

Typical action patterns:
- If `current_entity_id` is present: Suggest actions to analyze, visualize, or get more details about that specific entity (mention the entity ID explicitly. The entity ID is NOT `brain_region_id`.).
- If `current_entity_id` is None but `observed_entity_type` is present: Suggest actions to search, filter, or retrieve entities of that type.
- If `brain_region_name` is present: Suggest actions about that brain region by name (e.g., find related entities in the region, search literature about it etc...).
- If most fields are None, or there is no user input: Suggest exploratory actions to help users discover available data or features.
- For the literature-related action, use only high-level concepts or keywords from the current page context (e.g., page topics, regions, or scientific terms), not database-specific IDs.
- The remaining two actions must focus on features or data available from the current page context.

Output format:
- Output must strictly be a JSON array containing exactly three user action strings (never more, never less); do not return any surrounding text, commentary, or formatting.
- After producing the actions, briefly validate that all requirements are satisfied (distinctness, literature, page context, tool set limits) before finalizing the output.

Tool description:
{chr(10).join(tool_info)}"""

    messages = [{"role": "system", "content": system_prompt}, *content]
    parse_kwargs = {
        "messages": messages,
        "model": settings.llm.suggestion_model,
        "response_format": QuestionsSuggestions,
    }
    if "gpt-5" in settings.llm.suggestion_model:
        parse_kwargs["reasoning_effort"] = "minimal"

    response = await openai_client.beta.chat.completions.parse(**parse_kwargs)  # type: ignore
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
