"""Endpoints for agent's question answering pipeline."""

import json
import logging
from contextlib import asynccontextmanager
from typing import Annotated, Any, AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.constants import ServiceSubtype
from openai import AsyncOpenAI
from redis import asyncio as aioredis

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import (
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
    get_settings,
    get_starting_agent,
    get_thread,
    get_user_info,
)
from neuroagent.app.schemas import QuestionsSuggestions, UserClickHistory, UserInfo
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
    vlab_id: str | None = None,
    project_id: str | None = None,
) -> QuestionsSuggestions:
    """Generate a short thread title based on the user's first message and update thread's title."""
    if vlab_id is not None and project_id is not None:
        validate_project(
            groups=user_info.groups,
            virtual_lab_id=vlab_id,
            project_id=project_id,
        )
        limit = settings.rate_limiter.limit_suggestions_inside
    else:
        limit = settings.rate_limiter.limit_suggestions_outside

    await rate_limit(
        redis_client=redis_client,
        route_path="/qa/question_suggestions",
        limit=limit,
        expiry=settings.rate_limiter.expiry_suggestions,
        user_sub=user_info.sub,
    )

    # Send it to OpenAI longside with the system prompt asking for summary
    messages = [
        {
            "role": "system",
            "content": "We provide a description of the platform, the open brain platform allows an atlas driven exploration of the mouse brain with different artifacts "
            "related to experimental and model data and more specifically neuron morphology (neuron structure including axons, soma and dendrite), electrophysiological recording "
            "(ie the electrical behavior of the neuron), ion channel, neuron density, bouton density, synapses, connections, electrical models also referred to as e-models, me-models "
            "which is the model of neuron with a specific morphology and electrical type, and the synaptome dictating how neurons are connected together. "
            "The platform also allows user to explore and build digital brain models at different scales ranging from molecular level to single neuron and larger circuits and brain regions. "
            "Users can also customize the models or create their own ones and change the cellular composition, and then run simulation experiments and perform analysis. "
            "The user is navigating on the website, and we record the last elements he accessed on the website. Here is what the user's history will look like :"
            "user_history = [[['brain_region', 'example'], ['artifact', 'example'], ['artifact', 'example'], ['artifact', 'example']], [['brain_region', 'example'], ['artifact', 'example']]]"
            "'brain_region' can be any region of the mouse brain."
            "'artifact' can be :  'Morphology','Electrophysiology','Neuron density','Bouton density','Synapse per connection','E-model','ME-model','Synaptome' "
            "and 'data_type' can be 'Experimental data' or 'Model Data'"
            "The last element of the list represents the last click of the user, so it should naturally be more relevant."
            "From the user history, try to infer the user's intent on the platform. From it generate some questions the user might want to ask to a chatbot that is able to search for papers in the literature."
            "The questions should only be about the literature. Each question should be short and concise. In total there should not be more than 3 questions.",
        },
        {"role": "user", "content": json.dumps(body.click_history)},
    ]

    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model=settings.openai.suggestion_model,
        response_format=QuestionsSuggestions,
    )
    return QuestionsSuggestions(
        suggestions=response.choices[0].message.parsed.suggestions  # type: ignore
    )


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
) -> StreamingResponse:
    """Run a single agent query in a streamed fashion."""
    try:
        await rate_limit(
            redis_client=redis_client,
            route_path="/qa/chat_streamed/{thread_id}",
            limit=settings.rate_limiter.limit_chat,
            expiry=settings.rate_limiter.expiry_chat,
            user_sub=thread.user_id,
        )
    except HTTPException:
        # Only reraise the rate limit exception if we're outside vlab/project context
        if thread.vlab_id is None or thread.project_id is None:
            raise

    if len(user_request.content) > settings.misc.query_max_size:
        raise HTTPException(
            status_code=413,
            detail=f"Query string has {len(user_request.content)} characters. Maximum allowed is {settings.misc.query_max_size}.",
        )

    messages: list[Messages] = await thread.awaitable_attrs.messages

    if not messages or messages[-1].entity == Entity.AI_MESSAGE:
        messages.append(
            Messages(
                order=len(messages),
                thread_id=thread.thread_id,
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": user_request.content}),
            )
        )
    # Choose the appropriate context managers based on vlab_id and project_id
    accounting_context = (
        accounting_session_factory.oneshot_session
        if thread.vlab_id is not None and thread.project_id is not None
        else noop_accounting_context
    )

    async with accounting_context(
        subtype=ServiceSubtype.ML_LLM,
        user_id=thread.user_id,
        proj_id=thread.project_id,
        count=1,
    ):
        stream_generator = stream_agent_response(
            agents_routine=agents_routine,
            agent=agent,
            messages=messages,
            context_variables=context_variables,
            thread=thread,
            request=request,
            max_turns=settings.agent.max_turns,
            max_parallel_tool_calls=settings.agent.max_parallel_tool_calls,
        )
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={"x-vercel-ai-data-stream": "v1"},
    )
