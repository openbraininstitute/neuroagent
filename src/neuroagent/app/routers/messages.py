"""Message related CRUD operations."""

import json
import logging
from typing import Annotated
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

logger = logging.getLogger(__name__)

# Create a messages router
router = APIRouter()


class ToolCall(BaseModel):
    tool_call_id: str
    name: str
    arguments: str
    validated: bool | None


class MessageResponse(BaseModel):
    message_id: str
    entity: str
    thread_id: str
    order: int
    creation_date: datetime
    msg_content: str
    tool_calls: list[ToolCall]


# Define your routes here
@router.get("/")
async def get_thread_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exists
    thread_id: str,
) -> list[MessageResponse]:
    """Get all messages of the thread."""
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
            "msg_content": json.loads(msg.content)["content"],
        }

        # Always include tool_calls data
        tool_calls_data = [
            {
                "tool_call_id": tc.tool_call_id,
                "name": tc.name,
                "arguments": tc.arguments,
                "validated": tc.validated,
            }
            for tc in msg.tool_calls
        ]
        message_data["tool_calls"] = tool_calls_data

        messages.append(MessageResponse(**message_data))

    return messages


# Include the messages router under threads at the end of the file
threads_router.include_router(
    router,
    prefix="/{thread_id}/messages",
)
