"""Threads CRUDs."""

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from httpx import AsyncClient
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.app.app_utils import validate_project
from neuroagent.app.config import Settings
from neuroagent.app.database.db_utils import get_thread
from neuroagent.app.database.schemas import MessagesRead, ThreadsRead, ThreadUpdate
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, utc_now
from neuroagent.app.dependencies import (
    get_httpx_client,
    get_kg_token,
    get_openai_client,
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
) -> list[ThreadsRead]:
    """Get threads for a user."""
    thread_result = await session.execute(
        select(Threads).where(Threads.user_id == user_id)
    )
    threads = thread_result.scalars().all()
    return [ThreadsRead(**thread.__dict__) for thread in threads]


@router.get("/{thread_id}")
async def get_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exist
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
    thread.update_date = utc_now()
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


@router.patch("/{thread_id}/generate_title")
async def generate_title(
    session: Annotated[AsyncSession, Depends(get_session)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    thread: Annotated[Threads, Depends(get_thread)],
) -> ThreadsRead:
    """Generate a short thread title based on the user's first message and update thread's title."""
    # Get the first user message from the DB
    first_user_message_query = await session.execute(
        select(Messages)
        .where(Messages.entity == Entity.USER)
        .order_by(Messages.order)
        .limit(1)
    )
    first_user_message = first_user_message_query.scalar_one_or_none()
    if not first_user_message:
        raise HTTPException(
            status_code=404, detail="No user message in this conversation"
        )

    # Send it to OpenAI longside with the system prompt asking for summary
    messages = [
        {
            "role": "system",
            "content": "Given the user's first message of a conversation, generate a short and descriptive title for this conversation.",
        },
        json.loads(first_user_message.content),
    ]
    response = await openai_client.chat.completions.create(
        messages=messages,
        model=settings.openai.model,
    )

    # Update the thread title and modified date + commit
    thread.title = response.choices[0].message.content.strip('"')  # type: ignore
    thread.update_date = utc_now()
    await session.commit()
    await session.refresh(thread)
    return ThreadsRead(**thread.__dict__)
