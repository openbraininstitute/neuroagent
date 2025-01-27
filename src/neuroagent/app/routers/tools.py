"""Conversation related CRUD operations."""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.app.database.db_utils import get_thread
from neuroagent.app.database.schemas import (
    ExecuteToolCallRequest,
    ExecuteToolCallResponse,
    ToolCallSchema,
)
from neuroagent.app.database.sql_schemas import Messages, Role, Threads, ToolCalls
from neuroagent.app.dependencies import (
    get_context_variables,
    get_session,
    get_starting_agent,
)
from neuroagent.new_types import Agent, HILValidation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["Tool's CRUD"])


@router.get("/{thread_id}/{message_id}")
async def get_tool_calls(
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exist
    session: Annotated[AsyncSession, Depends(get_session)],
    thread_id: str,
    message_id: str,
) -> list[ToolCallSchema]:
    """Get tool calls of a specific message."""
    # Find relevant messages
    relevant_message = await session.get(Messages, message_id)

    # Check if message exists, and if of right type.
    if not relevant_message:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": "Message not found.",
            },
        )
    if relevant_message.role != Role.ASSISTANT:
        return []

    # Get the nearest previous message with content that triggered calls to the tools.
    previous_content_message_result = await session.execute(
        select(Messages)
        .where(
            Messages.thread_id == thread_id,
            Messages.order < relevant_message.order,
            Messages.role != Role.TOOL,
            Messages.has_content,
        )
        .order_by(desc(Messages.order))
        .limit(1)
    )
    previous_content_message = previous_content_message_result.scalars().one_or_none()
    if not previous_content_message:
        return []

    # Get all the "AI_TOOL" messsages in between.
    ai_tool_messages_query = await session.execute(
        select(Messages)
        .where(
            Messages.thread_id == thread_id,
            Messages.order < relevant_message.order,
            Messages.order >= previous_content_message.order,
            Messages.has_tool_calls,
        )
        .order_by(Messages.order)
    )
    ai_tool_messages = ai_tool_messages_query.scalars().all()

    # We should maybe give back the message_id, for easier search after.
    tool_calls_response = []
    for ai_tool_message in ai_tool_messages:
        tool_calls = await ai_tool_message.awaitable_attrs.tool_calls
        for tool in tool_calls:
            tool_calls_response.append(
                ToolCallSchema(
                    tool_call_id=tool.tool_call_id,
                    name=tool.name,
                    arguments=json.loads(tool.arguments),
                )
            )

    return tool_calls_response


@router.get("/output/{thread_id}/{tool_call_id}")
async def get_tool_returns(
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exist
    session: Annotated[AsyncSession, Depends(get_session)],
    thread_id: str,
    tool_call_id: str,
) -> list[dict[str, Any] | str]:
    """Given a tool id, return its output."""
    messages_result = await session.execute(
        select(Messages)
        .where(
            Messages.thread_id == thread_id,
            Messages.role == Role.TOOL,
        )
        .order_by(Messages.order)
    )
    tool_messages = messages_result.scalars().all()

    tool_output = []
    for msg in tool_messages:
        msg_content = json.loads(msg.payload)
        if msg_content.get("tool_call_id") == tool_call_id:
            tool_output.append(msg_content["content"])

    return tool_output


@router.patch("/validation/{thread_id}/{tool_call_id}")
async def validate_input(
    user_request: HILValidation,
    _: Annotated[Threads, Depends(get_thread)],
    tool_call_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    starting_agent: Annotated[Agent, Depends(get_starting_agent)],
) -> ToolCallSchema:
    """Validate HIL inputs."""
    # We first find the AI TOOL message to modify.
    tool_call = await session.get(ToolCalls, tool_call_id)
    if not tool_call:
        raise HTTPException(status_code=404, detail="Specified tool call not found.")
    if tool_call.validated is not None:
        raise HTTPException(
            status_code=403, detail="The tool call has already been validated."
        )

    tool_call.validated = user_request.is_validated  # Accepted or rejected

    # If the user specified a json, take it as the new one
    # We modify only if the user validated
    if user_request.validated_inputs and user_request.is_validated:
        # Find the corresponding tool (class) to do input validation
        tool = next(
            tool for tool in starting_agent.tools if tool.name == tool_call.name
        )

        # Validate the input JSON provided by user
        try:
            tool.__annotations__["input_schema"](**user_request.validated_inputs)
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=e.errors())
        tool_call.arguments = json.dumps(user_request.validated_inputs)

    await session.commit()
    await session.refresh(tool_call)
    return ToolCallSchema(
        tool_call_id=tool_call.tool_call_id,
        name=tool_call.name,
        arguments=json.loads(tool_call.arguments),
    )


@router.patch("/{thread_id}/execute/{tool_call_id}")
async def execute_tool_call(
    thread_id: str,
    tool_call_id: str,
    request: ExecuteToolCallRequest,
    _: Annotated[Threads, Depends(get_thread)],  # validates thread belongs to user
    session: Annotated[AsyncSession, Depends(get_session)],
    starting_agent: Annotated[Agent, Depends(get_starting_agent)],
    context_variables: Annotated[dict[str, Any], Depends(get_context_variables)],
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

    # Add modified tool_call to session
    session.add(tool_call)

    # Handle rejection case
    if request.validation == "rejected":
        message = {
            "role": "tool",
            "tool_call_id": tool_call.tool_call_id,
            "tool_name": tool_call.name,
            "content": "The tool call has been invalidated by the user.",
        }
        content = message["content"]
    else:  # Handle acceptance case
        # Get the tool from the agent's tools
        tool_map = {tool.name: tool for tool in starting_agent.tools}
        name = tool_call.name

        if name not in tool_map:
            message = {
                "role": "tool",
                "tool_call_id": tool_call.tool_call_id,
                "tool_name": name,
                "content": f"Error: Tool {name} not found.",
            }
            content = message["content"]
        else:
            tool = tool_map[name]
            kwargs = json.loads(tool_call.arguments)

            try:
                # Validate input schema
                input_schema = tool.__annotations__["input_schema"](**kwargs)

                # Execute the tool
                tool_metadata = tool.__annotations__["metadata"](**context_variables)
                tool_instance = tool(input_schema=input_schema, metadata=tool_metadata)

                raw_result = await tool_instance.arun()

                # Process the result
                result = (
                    raw_result
                    if isinstance(raw_result, str)
                    else json.dumps(raw_result)
                )
                message = {
                    "role": "tool",
                    "tool_call_id": tool_call.tool_call_id,
                    "tool_name": name,
                    "content": result,
                }
                content = message["content"]

            except ValidationError:
                # Return early with validation-error status without committing to DB
                return ExecuteToolCallResponse(status="validation-error", content=None)
            except Exception as err:
                error_message = str(err)
                message = {
                    "role": "tool",
                    "tool_call_id": tool_call.tool_call_id,
                    "tool_name": name,
                    "content": error_message,
                }
                content = message["content"]

    # Add the tool response as a new message
    new_message = Messages(
        order=0,  # This will be set correctly below
        thread_id=thread_id,
        entity=Role.TOOL,
        payload=json.dumps(message),
    )

    # Get the latest message order for this thread
    latest_message = await session.execute(
        select(Messages)
        .where(Messages.thread_id == thread_id)
        .order_by(desc(Messages.order))
        .limit(1)
    )
    latest = latest_message.scalar_one_or_none()
    new_message.order = (latest.order + 1) if latest else 0

    session.add(new_message)
    await session.commit()

    return ExecuteToolCallResponse(status="done", content=content)
