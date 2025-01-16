"""Message related CRUD operations."""

import json
import logging
from typing import Annotated, Any, Literal
from datetime import datetime
from enum import Enum

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from pydantic import BaseModel, ConfigDict

from neuroagent.app.database.db_utils import get_thread
from neuroagent.app.database.schemas import MessagesRead
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads
from neuroagent.app.dependencies import get_session
from neuroagent.app.routers.threads import router as threads_router
from neuroagent.app.dependencies import get_starting_agent
from neuroagent.new_types import Agent

logger = logging.getLogger(__name__)

# Create a messages router
router = APIRouter()


class ToolCall(BaseModel):
    tool_call_id: str
    name: str
    arguments: str
    validated: Literal["accepted", "rejected", "pending", "not_required"]


class MessageResponse(BaseModel):
    message_id: str
    entity: str
    thread_id: str
    order: int
    creation_date: datetime
    msg_content: dict[str, Any]
    tool_calls: list[ToolCall]


# Define your routes here
@router.get("/")
async def get_thread_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exists
    thread_id: str,
    starting_agent: Annotated[Agent, Depends(get_starting_agent)],
) -> list[MessageResponse]:
    """Get all messages of the thread."""
    # Create mapping of tool names to their HIL requirement
    tool_hil_mapping = {tool.name: tool.hil for tool in starting_agent.tools}

    messages_result = await session.execute(
        select(Messages)
        .where(
            Messages.thread_id == thread_id,
        )
        .options(joinedload(Messages.tool_calls))  # Eager load tool_calls
        .order_by(Messages.order)
    )
    db_messages = messages_result.unique().scalars().all()

    messages = []
    for msg in db_messages:
        # Create a clean dict without SQLAlchemy attributes
        message_data = {
            "message_id": msg.message_id,
            "entity": msg.entity.value,  # Convert enum to string
            "thread_id": msg.thread_id,
            "order": msg.order,
            "creation_date": msg.creation_date.isoformat(),  # Convert datetime to string
            "msg_content": json.loads(msg.content),
        }

        # Map validation status based on tool requirements
        tool_calls_data = []
        for tc in msg.tool_calls:
            requires_validation = tool_hil_mapping.get(tc.name, False)

            if tc.validated is True:
                validation_status = "accepted"
            elif tc.validated is False:
                validation_status = "rejected"
            elif not requires_validation:
                validation_status = "not_required"
            else:
                validation_status = "pending"

            tool_calls_data.append(
                {
                    "tool_call_id": tc.tool_call_id,
                    "name": tc.name,
                    "arguments": tc.arguments,
                    "validated": validation_status,
                }
            )

        message_data["tool_calls"] = tool_calls_data
        messages.append(MessageResponse(**message_data))

    return messages


# Include the messages router under threads at the end of the file
threads_router.include_router(
    router,
    prefix="/{thread_id}/messages",
)
