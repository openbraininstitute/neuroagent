"""Endpoints for agent's question answering pipeline."""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from openai.types.chat.chat_completion import ChatCompletion
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.config import Settings
from neuroagent.app.database.db_utils import get_thread
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Threads,
    utc_now,
)
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_context_variables,
    get_openai_client,
    get_session,
    get_settings,
    get_starting_agent,
)
from neuroagent.new_types import (
    Agent,
    AgentRequest,
    AgentResponse,
    HILResponse,
)
from neuroagent.stream import stream_agent_response

router = APIRouter(prefix="/qa", tags=["Run the agent"])

logger = logging.getLogger(__name__)


@router.post("/run", response_model=AgentResponse)
async def run_simple_agent(
    user_request: AgentRequest,
    agent_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
    agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
) -> AgentResponse:
    """Run a single agent query."""
    response = await agent_routine.arun(
        agent,
        [
            Messages(
                order=0,
                thread_id="Dummy_thread_id",
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": user_request.query}),
            )
        ],
        context_variables,
    )
    return AgentResponse(message=response.messages[-1]["content"])


@router.post("/chat/{thread_id}")
async def run_chat_agent(
    user_request: AgentRequest,
    agent_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
    agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
    session: Annotated[AsyncSession, Depends(get_session)],
    thread: Annotated[Threads, Depends(get_thread)],
) -> AgentResponse | list[HILResponse]:
    """Run a single agent query."""
    # Temporary solution
    context_variables["vlab_id"] = thread.vlab_id
    context_variables["project_id"] = thread.project_id

    messages: list[Messages] = await thread.awaitable_attrs.messages
    if not messages or messages[-1].entity != Entity.AI_TOOL:
        messages.append(
            Messages(
                order=len(messages),
                thread_id=thread.thread_id,
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": user_request.query}),
            )
        )
    response = await agent_routine.arun(agent, messages, context_variables)

    # Save the new messages in DB
    thread.update_date = utc_now()
    await session.commit()

    if response.hil_messages is not None:
        return response.hil_messages
    return AgentResponse(message=response.messages[-1]["content"])


@router.post("/chat_streamed/{thread_id}")
async def stream_chat_agent(
    user_request: AgentRequest,
    request: Request,
    agents_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
    agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
    thread: Annotated[Threads, Depends(get_thread)],
) -> StreamingResponse:
    """Run a single agent query in a streamed fashion."""
    # Temporary solution
    context_variables["vlab_id"] = thread.vlab_id
    context_variables["project_id"] = thread.project_id

    messages: list[Messages] = await thread.awaitable_attrs.messages
    if not messages or messages[-1].entity != Entity.AI_TOOL:
        messages.append(
            Messages(
                order=len(messages),
                thread_id=thread.thread_id,
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": user_request.query}),
            )
        )
    stream_generator = stream_agent_response(
        agents_routine,
        agent,
        messages,
        context_variables,
        thread,
        request,
    )
    return StreamingResponse(stream_generator, media_type="text/event-stream")


@router.post("/generate_title")
async def generate_title(
    user_request: AgentRequest,
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ChatCompletion:
    """Generate a short thread title based on the user's first message."""
    messages = [
        {
            "role": "system",
            "content": "Given the user's first message of a conversation, generate a short and descriptive title for this conversation.",
        },
        {"role": "user", "content": user_request.query},
    ]
    return await openai_client.chat.completions.create(
        messages=messages,
        model=settings.openai.model,  # type: ignore
    )  # Sending the entire response, use whatever you need.
