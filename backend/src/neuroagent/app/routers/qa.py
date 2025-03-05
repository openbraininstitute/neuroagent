"""Endpoints for agent's question answering pipeline."""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import vercel_to_openai
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Threads,
)
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_context_variables,
    get_settings,
    get_starting_agent,
    get_thread,
    get_thread_agnostic_context_variable,
)
from neuroagent.app.stream import stream_agent_response
from neuroagent.new_types import Agent, ClientRequest, ClientRequestWithHistory

router = APIRouter(prefix="/qa", tags=["Run the agent"])

logger = logging.getLogger(__name__)


@router.post("/chat_streamed/{thread_id}")
async def stream_chat_agent(
    user_request: ClientRequest,
    request: Request,
    agents_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
    agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
    thread: Annotated[Threads, Depends(get_thread)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> StreamingResponse:
    """Run a single agent query in a streamed fashion."""
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
    stream_generator = stream_agent_response(
        agents_routine=agents_routine,
        agent=agent,
        messages=messages,
        context_variables=context_variables,
        thread=thread,
        request=request,
    )
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={"x-vercel-ai-data-stream": "v1"},
    )


@router.post("/streamed_completion")
async def stream_agent_completion(
    user_request: ClientRequestWithHistory,
    request: Request,
    agents_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
    agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[
        dict[str, Any], Depends(get_thread_agnostic_context_variable)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> StreamingResponse:
    """Run an agentic step on a provided history."""
    if len(user_request.messages[-1].content) > settings.misc.query_max_size:
        raise HTTPException(
            status_code=413,
            detail=f"Query string has {len(user_request.messages[-1].content)} characters. Maximum allowed is {settings.misc.query_max_size}.",
        )
    stream_generator = stream_agent_response(
        agents_routine=agents_routine,
        agent=agent,
        messages=vercel_to_openai(user_request.messages),
        context_variables=context_variables,
        request=request,
        thread=None,
    )
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={"x-vercel-ai-data-stream": "v1"},
    )
