"""Endpoints for agent's question answering pipeline."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Annotated, Any, AsyncIterator

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
from semantic_router import SemanticRouter
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import (
    commit_messages,
    rate_limit,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Threads,
)
from neuroagent.app.dependencies import (
    get_accounting_session_factory,
    get_agents_routine,
    get_context_variables,
    get_openai_client,
    get_redis_client,
    get_semantic_routes,
    get_session,
    get_settings,
    get_starting_agent,
    get_thread,
    get_user_info,
)
from neuroagent.app.schemas import (
    QuestionsSuggestions,
    QuestionsSuggestionsInChat,
    UserClickHistory,
    UserInfo,
)
from neuroagent.app.stream import stream_agent_response
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
    body: UserClickHistory,
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    redis_client: Annotated[aioredis.Redis | None, Depends(get_redis_client)],
    fastapi_response: Response,
    vlab_id: str | None = None,
    project_id: str | None = None,
) -> QuestionsSuggestions | None:
    """Generate suggested question for the user before the first chat input."""
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
            headers=limit_headers.model_dump(by_alias=True),
        )
    fastapi_response.headers.update(limit_headers.model_dump(by_alias=True))

    # Send it to OpenAI longside with the system prompt asking for summary
    messages = [
        {
            "role": "system",
            "content": """You are a smart assistant that analyzes user behavior to suggest one concise, engaging question the user might ask—specifically about finding relevant literature.

            Platform Context:
            The Open Brain Platform provides an atlas-driven exploration of the mouse brain, with access to:
            - Neuron morphology (axon, soma, dendrite structures)
            - Electrophysiology (electrical recordings of neuronal activity)
            - Ion channels
            - Neuron density
            - Bouton density
            - Synapse-per-connection counts
            - Electrical models (“E-models”)
            - Morpho-electrical models (“ME-models”)
            - Synaptome (network of neuronal connections)

            Users can:
            1. Explore and build digital brain models at scales from molecular to whole-region circuits
            2. Customize or create new cellular-composition models
            3. Run simulations and perform data analyses
            4. Access both Experimental and Model data

            User History Format:
            - user_history is a list of navigation sessions.
            - Each session is a sequence of clicks:
            * ['brain_region', <region_name>]
            * ['artifact', <artifact_type>]
            * ['data_type', <"Experimental data" | "Model Data">]
            - Artifacts include:
            * Morphology
            * Electrophysiology
            * Neuron density
            * Bouton density
            * Synapse per connection
            * E-model
            * ME-model
            * Synaptome
            - The last element in each session is the user’s most recent click and thus the most relevant.

            Task:
            Given the user’s navigation history and recent messages, generate one short, literature-focused question they might ask next. Prioritize their latest interactions. The question should be:
            - Directly related to searching for scientific papers
            - Engaging and motivate the user to interact with the chat.
            - Clear and concise
            - Focused on literature retrieval only""",
        },
        {"role": "user", "content": "USER JOURNEY: " + json.dumps(body.click_history)},
    ]

    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model=settings.openai.suggestion_model,
        response_format=QuestionsSuggestions,
    )

    return response.choices[0].message.parsed


@router.post("/question_suggestions_in_chat")
async def question_suggestions_in_chat(
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    body: UserClickHistory,
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    redis_client: Annotated[aioredis.Redis | None, Depends(get_redis_client)],
    fastapi_response: Response,
    thread: Annotated[Threads, Depends(get_thread)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> QuestionsSuggestionsInChat | None:
    """Generate suggested question taking into account the user journey and the user previous messages."""
    vlab_id = thread.vlab_id
    project_id = thread.project_id
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
        route_path="/qa/question_suggestions_in_chat",
        limit=limit,
        expiry=settings.rate_limiter.expiry_suggestions,
        user_sub=user_info.sub,
    )
    if rate_limited:
        raise HTTPException(
            status_code=429,
            detail={"error": "Rate limit exceeded"},
            headers=limit_headers.model_dump(by_alias=True),
        )
    fastapi_response.headers.update(limit_headers.model_dump(by_alias=True))

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

    if not db_messages:
        raise HTTPException(
            status_code=404,
            detail={"error": "No messages found in thread"},
        )

    messages = [
        {
            "role": "system",
            "content": """You are a smart assistant that analyzes user behavior and conversation history to suggest three concise, engaging questions the user might next ask—specifically about finding relevant literature.

            Platform Context:
            The Open Brain Platform provides an atlas-driven exploration of the mouse brain, with access to:
            - Neuron morphology (axon, soma, dendrite structures)
            - Electrophysiology (electrical recordings of neuronal activity)
            - Ion channels
            - Neuron density
            - Bouton density
            - Synapse-per-connection counts
            - Electrical models (“E-models”)
            - Morpho-electrical models (“ME-models”)
            - Synaptome (network of neuronal connections)

            Users can:
            1. Explore and build digital brain models at scales from molecular to whole-region circuits
            2. Customize or create new cellular-composition models
            3. Run simulations and perform data analyses
            4. Access both Experimental and Model data

            User History Format:
            - user_history is a list of navigation sessions.
            - Each session is a sequence of clicks:
            * ['brain_region', <region_name>]
            * ['artifact', <artifact_type>]
            * ['data_type', <"Experimental data" | "Model Data">]
            - Artifacts include:
            * Morphology
            * Electrophysiology
            * Neuron density
            * Bouton density
            * Synapse per connection
            * E-model
            * ME-model
            * Synaptome
            - The last element in each session is the user’s most recent click and thus the most relevant.

            Task:
            Given the user’s navigation history and recent messages, generate three short, literature-focused questions they might ask next. Prioritize their latest interactions, but weigh the content of their messages more heavily than their click history. Each question should be:
            - Directly related to searching for scientific papers
            - Clear and concise
            - Focused on literature retrieval only""",
        },
        {
            "role": "user",
            "content": "USER JOURNEY : \n"
            + json.dumps(body.click_history)
            + "\n USER MESSAGES : \n"
            + json.dumps(
                [
                    {
                        k: v
                        for k, v in json.loads(msg.content).items()
                        if k in ["role", "content"]
                    }
                    for msg in db_messages
                ]
            ),
        },
    ]

    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model=settings.openai.suggestion_model,
        response_format=QuestionsSuggestionsInChat,
    )

    return response.choices[0].message.parsed


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
    semantic_router: Annotated[SemanticRouter | None, Depends(get_semantic_routes)],
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
                headers=limit_headers.model_dump(by_alias=True),
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

    messages: list[Messages] = await thread.awaitable_attrs.messages
    # Since the session is not reinstantiated in stream.py
    # we need to lazy load the tool_calls in advance since in
    # any case they will be needed to convert the db schema
    # to OpenAI messages
    for msg in messages:
        if msg.entity == Entity.AI_TOOL:
            # This awaits the lazy loading, ensuring tool_calls is populated now.
            await msg.awaitable_attrs.tool_calls

    if (
        not messages
        or messages[-1].entity == Entity.AI_MESSAGE
        or not messages[-1].is_complete
    ):
        messages.append(
            Messages(
                thread_id=thread.thread_id,
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": user_request.content}),
                is_complete=True,
            )
        )

    background_tasks.add_task(
        commit_messages, request.app.state.engine, messages, thread
    )
    async with accounting_context(
        subtype=ServiceSubtype.ML_LLM,
        user_id=thread.user_id,
        proj_id=thread.project_id,
        count=1,
    ):
        if semantic_router and user_request.content:
            selected_route = await semantic_router.acall(user_request.content)
            if selected_route.name:  # type: ignore
                # If a predefined route is detected, return predefined response
                async def yield_predefined_response(
                    response: str,
                ) -> AsyncIterator[str]:
                    """Imitate the LLM streaming."""
                    for chunk in response.split(" "):
                        await asyncio.sleep(0.01)
                        yield f"0:{json.dumps(chunk + ' ', separators=(',', ':'))}\n"

                response = next(
                    route.metadata["response"]  # type: ignore
                    for route in semantic_router.routes
                    if route.name == selected_route.name  # type: ignore
                )
                messages.append(
                    Messages(
                        thread_id=thread.thread_id,
                        entity=Entity.AI_MESSAGE,
                        content=json.dumps({"role": "assistant", "content": response}),
                        is_complete=True,
                    )
                )
                return StreamingResponse(
                    yield_predefined_response(response),
                    media_type="text/event-stream",
                    headers={
                        "x-vercel-ai-data-stream": "v1",
                        **limit_headers.model_dump(by_alias=True),
                    },
                )

        stream_generator = stream_agent_response(
            agents_routine=agents_routine,
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
            **limit_headers.model_dump(by_alias=True),
        },
    )
