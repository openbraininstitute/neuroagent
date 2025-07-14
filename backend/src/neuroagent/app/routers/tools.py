"""Conversation related CRUD operations."""

import inspect
import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from pydantic.json_schema import SkipJsonSchema
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, ToolCalls
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_context_variables,
    get_healthcheck_variables,
    get_session,
    get_thread,
    get_tool_list,
    get_user_info,
)
from neuroagent.app.schemas import (
    ExecuteToolCallRequest,
    ExecuteToolCallResponse,
    ToolMetadata,
    ToolMetadataDetailed,
    UserInfo,
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
            "content": f"Tool call refused by the user. User's feedback: {request.feedback}"
            if request.feedback
            else "This tool call has been refused by the user. DO NOT re-run it unless explicitly asked by the user.",
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

    # Add the tool response as a new message
    new_message = Messages(
        thread_id=thread_id,
        entity=Entity.TOOL,
        content=json.dumps(message),
        is_complete=True,
    )

    session.add(tool_call)
    session.add(new_message)
    await session.commit()

    return ExecuteToolCallResponse(status="done", content=message["content"])


@router.get("")
def get_available_tools(
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    _: Annotated[UserInfo, Depends(get_user_info)],
) -> list[ToolMetadata]:
    """Return the list of available tools with their basic metadata."""
    return [
        ToolMetadata(name=tool.name, name_frontend=tool.name_frontend)
        for tool in tool_list
    ]


@router.get("/{name}")
async def get_tool_metadata(
    name: str,
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    healthcheck_variables: Annotated[
        dict[str, Any], Depends(get_healthcheck_variables)
    ],
    _: Annotated[UserInfo, Depends(get_user_info)],
) -> ToolMetadataDetailed:
    """Return detailed metadata for a specific tool."""
    tool_class = next((tool for tool in tool_list if tool.name == name), None)
    if not tool_class:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")

    # Get the parameters required by is_online
    is_online_params = inspect.signature(tool_class.is_online).parameters
    is_online_kwargs = {
        param: healthcheck_variables[param]
        for param in is_online_params
        if param in healthcheck_variables
    }

    try:
        is_online = await tool_class.is_online(**is_online_kwargs)
    except Exception:
        logger.exception(f"Error checking tool {tool_class.name} online status")
        is_online = False

    input_schema: dict[str, Any] = {"parameters": []}
    if tool_class.json_schema is not None:
        json_schema = tool_class.json_schema

        # Extract parameters from JSON schema
        if "properties" in json_schema:
            for name, prop in json_schema["properties"].items():
                parameter = {
                    "name": name,
                    "required": name in json_schema.get("required", []),
                    "default": str(prop.get("default")) if "default" in prop else None,
                    "description": prop.get("description", ""),
                }
                input_schema["parameters"].append(parameter)
    else:
        for name in tool_class.__annotations__["input_schema"].model_fields:
            field = tool_class.__annotations__["input_schema"].model_fields[name]
            metadata = (
                tool_class.__annotations__["input_schema"].model_fields[name].metadata
            )

            if len(metadata) == 1 and metadata[0] == SkipJsonSchema():  # type: ignore[type-arg]
                continue

            is_required = field.is_required()

            parameter = {
                "name": name,
                "required": is_required,
                "default": None
                if is_required
                else str(field.default)
                if field.default is not None
                else None,
                "description": field.description,
            }
            input_schema["parameters"].append(parameter)

    return ToolMetadataDetailed(
        name=tool_class.name,
        name_frontend=tool_class.name_frontend,
        description=tool_class.description,
        description_frontend=tool_class.description_frontend,
        input_schema=json.dumps(input_schema),
        hil=tool_class.hil,
        is_online=is_online,
    )
