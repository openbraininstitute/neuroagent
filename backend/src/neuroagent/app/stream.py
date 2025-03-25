"""Wrapper around streaming methods to reinitiate connections due to the way fastAPI StreamingResponse works."""

import json
from typing import Any, AsyncIterator

from fastapi import Request
from httpx import AsyncClient
from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.constants import ServiceSubtype
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import get_accounting_context_manager
from neuroagent.app.database.sql_schemas import Messages, Threads, utc_now
from neuroagent.new_types import Agent


async def stream_agent_response(
    agents_routine: AgentsRoutine,
    agent: Agent,
    messages: list[Messages],
    context_variables: dict[str, Any],
    thread: Threads,
    request: Request,
    accounting_session_factory: AsyncAccountingSessionFactory,
) -> AsyncIterator[str]:
    """Redefine fastAPI connections to enable streaming."""
    # Restore the OpenAI client
    if isinstance(agents_routine.client, AsyncOpenAI):
        connected_agents_routine = AgentsRoutine(
            client=AsyncOpenAI(api_key=agents_routine.client.api_key)
        )
    else:
        connected_agents_routine = AgentsRoutine(client=agents_routine.client)

    # Restore the httpx client
    httpx_client = AsyncClient(
        timeout=300.0,
        verify=False,
        headers={
            "x-request-id": context_variables["httpx_client"].headers["x-request-id"]
        },
    )
    context_variables["httpx_client"] = httpx_client
    # Restore the session
    engine = request.app.state.engine
    session = AsyncSession(engine)
    # Need to rebind the messages to the session
    session.add_all(messages)

    # Choose the appropriate context managers based on vlab_id and project_id
    accounting_context = get_accounting_context_manager(
        vlab_id=thread.vlab_id,
        project_id=thread.project_id,
        accounting_session_factory=accounting_session_factory,
    )

    # Initial cost estimate for each token type
    max_spending_per_request = 0.03
    completion_cost_per_token = 6 * 1e-7

    # the below is way higher than the allowed max count of completion tokens, however
    # it corresponds to the maximum spending per request
    max_completion_tokens = int(
        max_spending_per_request / completion_cost_per_token
    )  # = 50k

    async with (
        accounting_context(
            subtype=ServiceSubtype.ML_LLM,
            user_id=thread.user_id,
            proj_id=thread.project_id,
            count=1,
        ) as cached_session,
        accounting_context(
            subtype=ServiceSubtype.ML_RAG,
            user_id=thread.user_id,
            proj_id=thread.project_id,
            count=1,
        ) as prompt_session,
        accounting_context(
            subtype=ServiceSubtype.ML_RETRIEVAL,
            user_id=thread.user_id,
            proj_id=thread.project_id,
            count=max_completion_tokens,  # The 5 should be replaced bu `max_turns` in the future
        ) as completion_session,
    ):
        iterator = connected_agents_routine.astream(agent, messages, context_variables)
        async for chunk in iterator:
            if chunk.startswith("accounting:"):
                break
            yield chunk

        # Update the token counts with actual usage
        chunk_dict = json.loads(chunk.strip("accounting:"))
        if cached_session is not None:  # Only update if we're using real accounting
            prompt_tokens = chunk_dict["prompt_tokens"]
            cached_tokens = chunk_dict["cached_tokens"]
            completion_tokens = chunk_dict["completion_tokens"]

            cached_session.count = cached_tokens
            prompt_session.count = prompt_tokens
            completion_session.count = completion_tokens

    # Save the new messages in DB
    thread.update_date = utc_now()

    # For some weird reason need to re-add messages, but only post validation ones
    session.add_all(messages)

    await session.commit()
    await session.close()
