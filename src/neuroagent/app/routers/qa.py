"""Endpoints for agent's question answering pipeline."""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.config import Settings
from neuroagent.app.database.db_utils import get_thread
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
)
from neuroagent.app.stream import stream_agent_response
from neuroagent.new_types import (
    Agent,
    ClientRequest,
)

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

    # Insert dynamically vlab and proj id to avoid over-validating in the dependencies
    # and to avoid cyclic dependencies.
    context_variables["vlab_id"] = thread.vlab_id
    context_variables["project_id"] = thread.project_id

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
        agents_routine,
        agent,
        messages,
        context_variables,
        thread,
        request,
    )
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={"x-vercel-ai-data-stream": "v1"},
    )
