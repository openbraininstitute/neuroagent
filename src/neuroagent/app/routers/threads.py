"""Threads CRUDs."""

import json
import logging
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.app.app_utils import validate_project
from neuroagent.app.config import Settings
from neuroagent.app.database.db_utils import get_thread
from neuroagent.app.database.schemas import (
    MessagesRead,
    PaginatedMessagesRead,
    PaginatedParams,
    PaginatedThreadsRead,
    ThreadsRead,
    ThreadUpdate,
)
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads
from neuroagent.app.dependencies import (
    get_httpx_client,
    get_kg_token,
    get_session,
    get_settings,
    get_user_id,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["Threads' CRUD"])


@router.post("/")
async def create_thread(
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    token: Annotated[str, Depends(get_kg_token)],
    virtual_lab_id: str,
    project_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    user_id: Annotated[str, Depends(get_user_id)],
    title: str = "New chat",
) -> ThreadsRead:
    """Create thread."""
    # We first need to check if the combination thread/vlab/project is valid
    await validate_project(
        httpx_client=httpx_client,
        vlab_id=virtual_lab_id,
        project_id=project_id,
        token=token,
        vlab_project_url=settings.virtual_lab.get_project_url,
    )
    new_thread = Threads(
        user_id=user_id,
        title=title,
        vlab_id=virtual_lab_id,
        project_id=project_id,
    )
    session.add(new_thread)
    await session.commit()
    await session.refresh(new_thread)

    return ThreadsRead(**new_thread.__dict__)


@router.get("/")
async def get_threads(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_id: Annotated[str, Depends(get_user_id)],
    pagination_params: Annotated[PaginatedParams, Query()],
) -> PaginatedThreadsRead:
    """Get threads for a user."""
    # Get threads in updated order and output the total number or threads for total pages.
    query = await session.execute(
        select(Threads, func.count().over().label("total_count"))
        .where(Threads.user_id == user_id)
        .order_by(Threads.update_date.desc())
        .limit(pagination_params.page_size)
        .offset((pagination_params.page - 1) * pagination_params.page_size)
    )

    threads = query.fetchall()
    total_pages = (
        ceil(threads[0].total_count / pagination_params.page_size) if threads else 0
    )
    return PaginatedThreadsRead(
        page=pagination_params.page,
        page_size=pagination_params.page_size,
        total_pages=total_pages,
        results=[ThreadsRead(**thread[0].__dict__) for thread in threads],
    )


@router.get("/{thread_id}")
async def get_thread_metadata(
    thread: Annotated[Threads, Depends(get_thread)],
) -> ThreadsRead:
    """Get all messages of the thread."""
    return ThreadsRead(**thread.__dict__)


@router.get("/{thread_id}/messages")
async def get_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exist
    pagination_params: Annotated[PaginatedParams, Query()],
    thread_id: str,
) -> PaginatedMessagesRead:
    """Get all messages of the thread."""
    messages_query = await session.execute(
        select(Messages, func.count().over().label("total_count"))
        .where(
            Messages.thread_id == thread_id,
            Messages.entity.in_([Entity.USER, Entity.AI_MESSAGE]),
        )
        .order_by(Messages.order)
        .limit(pagination_params.page_size)
        .offset((pagination_params.page - 1) * pagination_params.page_size)
    )

    db_messages = messages_query.fetchall()

    messages = []
    for msg in db_messages:
        messages.append(
            MessagesRead(
                msg_content=json.loads(msg[0].content)["content"],
                **msg[0].__dict__,
            )
        )
    total_pages = (
        ceil(db_messages[0].total_count / pagination_params.page_size)
        if db_messages
        else 0
    )
    return PaginatedMessagesRead(
        page=pagination_params.page,
        page_size=pagination_params.page_size,
        total_pages=total_pages,
        results=messages,
    )


@router.patch("/{thread_id}")
async def update_thread_title(
    session: Annotated[AsyncSession, Depends(get_session)],
    update_thread: ThreadUpdate,
    thread: Annotated[Threads, Depends(get_thread)],
) -> ThreadsRead:
    """Update thread."""
    thread_data = update_thread.model_dump(exclude_unset=True)
    for key, value in thread_data.items():
        setattr(thread, key, value)
    await session.commit()
    await session.refresh(thread)
    return ThreadsRead(**thread.__dict__)


@router.delete("/{thread_id}")
async def delete_thread(
    session: Annotated[AsyncSession, Depends(get_session)],
    thread: Annotated[Threads, Depends(get_thread)],
) -> dict[str, str]:
    """Delete the specified thread."""
    await session.delete(thread)
    await session.commit()
    return {"Acknowledged": "true"}
