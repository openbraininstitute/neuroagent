"""Endpoints for agent's question answering pipeline."""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Threads,
)
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_context_variables,
    get_openai_client,
    get_settings,
    get_starting_agent,
    get_thread,
)
from neuroagent.app.schemas import QuestionsSuggestions, UserHistory
from neuroagent.app.stream import stream_agent_response
from neuroagent.new_types import (
    Agent,
    ClientRequest,
)

router = APIRouter(prefix="/qa", tags=["Run the agent"])

logger = logging.getLogger(__name__)


@router.post("/question_suggestions")
async def question_suggestions(
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    body: UserHistory,
) -> QuestionsSuggestions:
    """Generate a short thread title based on the user's first message and update thread's title."""
    # Send it to OpenAI longside with the system prompt asking for summary
    messages = [
        {
            "role": "system",
            "content": "The user is navigating on a website, and we record all of his last clicks. "
            "user_click_history = [[['brain_region', 'example'], ['artifact', 'example'], ['artifact', 'example'], ['artifact', 'example']], [['brain_region', 'example'], ['artifact', 'example']]]"
            "'brain_region' casn be any region of the mouse brain."
            "'artifact' can be :  'Morphology','Electrophysiology','Neuron density','Bouton density','Synapse per connection','E-model','ME-model','Synaptome' "
            "and 'data_type' can be 'Experimental data' or 'Model Data'"
            "The first element of the list represents the last click of the user, so it should naturally be more relevant."  # THIS SHOULD BE CHECKED !!
            "From these clicks, try to infer some potential questions the user might want to ask to a chatbot that is able to search for papers in the litterature."
            "The questions should only be about the litterature. Each question should be short and concise, no more than 20 words. In total there should not be more than 5 questions.",
        },
        {"role": "user", "content": json.dumps(body.history)},
    ]
    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model=settings.openai.model,
        response_format=QuestionsSuggestions,
    )
    return QuestionsSuggestions(
        suggestions=response.choices[0].message.parsed.suggestions  # type: ignore
    )


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
