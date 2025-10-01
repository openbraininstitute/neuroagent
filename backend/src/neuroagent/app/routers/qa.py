"""Endpoints for agent's question answering pipeline."""

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncIterator
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
)
from fastapi.responses import StreamingResponse
from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.constants import ServiceSubtype
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import (
    commit_messages,
    rate_limit,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads
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
        messages_result = await session.execute(
            select(Messages)
            .where(
                Messages.thread_id == thread.thread_id,
                or_(
                    Messages.entity == Entity.USER,
                    Messages.entity == Entity.AI_MESSAGE,
                ),
            )
            .order_by(Messages.creation_date)
        )
        db_messages = messages_result.unique().scalars().all()

        is_in_chat = bool(db_messages)
        if not is_in_chat and not body.click_history:
            raise HTTPException(
                status_code=404,
                detail="The thread is empty and the 'click_history' wasn't provided.",
            )

    if is_in_chat:
        content = f"CONVERSATION MESSAGES: \n{json.dumps([{k: v for k, v in json.loads(msg.content).items() if k in ['role', 'content']} for msg in db_messages])}"
    else:
        content = (
            f"USER JOURNEY: \n{body.model_dump(exclude={'thread_id'})['click_history']}"
        )

    messages = [
        {
            "role": "system",
            "content": f"""You are a smart assistant that analyzes user behavior and conversation history to suggest three concise,
            engaging questions the user might ask next, specifically about finding relevant scientific literature.

            Platform Context:
            The Open Brain Platform provides an atlas-driven exploration of the mouse brain, offering access to:
            - Neuron morphology (axon, soma, dendrite structures)
            - Electrophysiology (electrical recordings of neuronal activity)
            - Ion channels
            - Neuron density
            - Bouton density
            - Synapse-per-connection counts
            - Electrical models (“E-models”)
            - Morpho-electrical models (“ME-models”)
            - Synaptome (network of neuronal connections)

            User Capabilities:
            - Explore and build digital brain models at scales ranging from molecular to whole-region circuits.
            - Customize or create new cellular-composition models.
            - Run simulations and perform data analyses.
            - Access both experimental and model data.

            User Journey Format:
            - User journey is a list of clicks performed by the user.
            - Each click represent the brain region and artifact the user was viewing. The timestamp of the click is added.
            - Artifacts may include:
            * Morphology
            * Electrophysiology
            * Neuron density
            * Bouton density
            * Synapse per connection
            * E-model
            * ME-model
            * Synaptome
            - The current date and time is {datetime.now(timezone.utc).isoformat()}. Weight the user clicks depending on how old they are. The more recent clicks should be given a higher importance.

            Task:
            Using either the user’s navigation history or their recent messages, generate three short, literature-focused questions they might ask next.

            Each question must:
            - Directly relate to searching for scientific papers.
            - Be clear, concise, and easy to understand.
            - Focus exclusively on literature retrieval.

            The upcoming user message will either prepend its content with 'CONVERSATION MESSAGES:' indicating that messages from the conversation are dumped, or 'USER JOURNEY:' indicating that the navigation history is dumped.""",
        },
        {"role": "user", "content": content},
    ]

    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model=settings.llm.suggestion_model,
        response_format=QuestionsSuggestions,
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
    request: Request,
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
    filtered_models: Annotated[
        list[OpenRouterModelResponse], Depends(get_openrouter_models)
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

    # Check that the requested model is authorized
    if user_request.model in [model.id for model in filtered_models]:
        agent.model = user_request.model
        logger.info(f"Loading model {agent.model}.")
    else:
        raise HTTPException(
            status_code=404, detail={"error": f"Model {user_request.model} not found."}
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
