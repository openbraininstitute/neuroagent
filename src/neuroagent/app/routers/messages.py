"""Message related CRUD operations."""

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.app.database.db_utils import get_thread
from neuroagent.app.database.schemas import MessagesRead
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads
from neuroagent.app.dependencies import get_session
from neuroagent.app.routers.threads import router as threads_router

logger = logging.getLogger(__name__)

# Create a messages router
router = APIRouter()


# Define your routes here
@router.get("/")
async def get_thread_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exists
    thread_id: str,
) -> list[MessagesRead]:
    """Get all messages of the thread."""
    messages_result = await session.execute(
        select(Messages)
        .where(
            Messages.thread_id == thread_id,
            Messages.entity.in_([Entity.USER, Entity.AI_MESSAGE]),
        )
        .order_by(Messages.order)
    )
    db_messages = messages_result.scalars().all()

    messages = []
    for msg in db_messages:
        messages.append(
            MessagesRead(
                msg_content=json.loads(msg.content)["content"],
                **msg.__dict__,
            )
        )

    return messages


# Include the messages router under threads at the end of the file
threads_router.include_router(
    router,
    prefix="/{thread_id}/messages",
)
