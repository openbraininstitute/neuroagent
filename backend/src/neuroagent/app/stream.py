"""Wrapper around streaming methods to reinitiate connections due to the way fastAPI StreamingResponse works."""

from typing import Any, AsyncIterator

from fastapi import Request
from httpx import AsyncClient
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.database.sql_schemas import Messages
from neuroagent.new_types import Agent


async def stream_agent_response(
    agents_routine: AgentsRoutine,
    agent: Agent,
    messages: list[Messages],
    context_variables: dict[str, Any],
    request: Request,
    max_turns: int = 10,
    max_parallel_tool_calls: int = 5,
) -> AsyncIterator[str]:
    """Redefine fastAPI connections to enable streaming."""
    # Restore the OpenAI client
    if isinstance(agents_routine.client, AsyncOpenAI):
        openai_client = AsyncOpenAI(
            api_key=agents_routine.client.api_key,
            base_url=agents_routine.client.base_url,
        )
        connected_agents_routine = AgentsRoutine(client=openai_client)
    else:
        openai_client = agents_routine.client
        connected_agents_routine = AgentsRoutine(client=openai_client)

    # Restore the httpx client
    httpx_client = AsyncClient(
        timeout=300.0,
        verify=False,
        headers=context_variables["httpx_client"].headers,  # nosec: B501
    )
    context_variables["httpx_client"] = httpx_client
    context_variables["openai_client"] = AsyncOpenAI(
        api_key=context_variables["openai_client"].api_key
    )

    # Restore the session
    engine = request.app.state.engine
    session = AsyncSession(engine)
    context_variables["session"] = session

    iterator = connected_agents_routine.astream(
        agent=agent,
        messages=messages,
        context_variables=context_variables,
        max_turns=max_turns,
        max_parallel_tool_calls=max_parallel_tool_calls,
    )
    async for chunk in iterator:
        yield chunk
