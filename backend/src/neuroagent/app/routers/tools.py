"""Conversation related CRUD operations."""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, ToolCalls
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_context_variables,
    get_session,
    get_thread,
    get_tool_list,
)
from neuroagent.app.schemas import (
    ExecuteToolCallRequest,
    ExecuteToolCallResponse,
)
from neuroagent.tools.base_tool import BaseTool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["Tool's CRUD"])


@router.patch("/{thread_id}/execute/{tool_call_id}")
async def execute_tool_call(
    thread_id: str,
    tool_call_id: str,
    request: ExecuteToolCallRequest,
    _: Annotated[Threads, Depends(get_thread)],  # validates thread belongs to user
    session: Annotated[AsyncSession, Depends(get_session)],
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
    agents_routine: Annotated[AgentsRoutine, Depends(get_agents_routine)],
) -> ExecuteToolCallResponse:
    """Execute a specific tool call and update its status."""
    # Get the tool call
    tool_call = await session.get(ToolCalls, tool_call_id)
    if not tool_call:
        raise HTTPException(status_code=404, detail="Specified tool call not found.")

    # Check if tool call has already been validated
    if tool_call.validated is not None:
        raise HTTPException(
            status_code=403,
            detail="The tool call has already been validated.",
        )

    # Update tool call validation status
    tool_call.validated = request.validation == "accepted"

    # Update arguments if provided and accepted
    if request.args and request.validation == "accepted":
        tool_call.arguments = request.args

    # Handle rejection case
    if request.validation == "rejected":
        message = {
            "role": "tool",
            "tool_call_id": tool_call.tool_call_id,
            "tool_name": tool_call.name,
            "content": "The tool call has been invalidated by the user.",
        }
    else:  # Handle acceptance case
        try:
            message, _ = await agents_routine.handle_tool_call(
                tool_call=tool_call,
                tools=tool_list,
                context_variables=context_variables,
                raise_validation_errors=True,
            )
        except ValidationError:
            # Return early with validation-error status without committing to DB
            return ExecuteToolCallResponse(status="validation-error", content=None)

    # Get the latest message order for this thread
    latest_message = await session.execute(
        select(Messages)
        .where(Messages.thread_id == thread_id)
        .order_by(desc(Messages.order))
        .limit(1)
    )
    latest = latest_message.scalar_one()

    # Add the tool response as a new message
    new_message = Messages(
        order=latest.order + 1,
        thread_id=thread_id,
        entity=Entity.TOOL,
        content=json.dumps(message),
    )

    session.add(tool_call)
    session.add(new_message)
    await session.commit()

    return ExecuteToolCallResponse(status="done", content=message["content"])


@router.get("")
def get_tool_list(
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
) -> list[str]:
    """Return the list of available tools."""
    # Trivial implementation for now, to be adressed in another PR
    return [tool.name for tool in tool_list]
