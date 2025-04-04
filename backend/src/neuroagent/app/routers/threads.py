"""Threads CRUDs."""

import json
import logging
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from sqlalchemy import desc, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from neuroagent.app.app_utils import (
    rate_limit,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Messages, Threads, utc_now
from neuroagent.app.dependencies import (
    get_openai_client,
    get_redis_client,
    get_s3_client,
    get_session,
    get_settings,
    get_thread,
    get_tool_list,
    get_user_info,
)
from neuroagent.app.schemas import (
    MessageResponse,
    ThreadCreate,
    ThreadGeneratBody,
    ThreadGeneratedTitle,
    ThreadsRead,
    ThreadUpdate,
    UserInfo,
)
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import delete_from_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["Threads' CRUD"])


@router.post("")
async def create_thread(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    body: ThreadCreate = ThreadCreate(),
) -> ThreadsRead:
    """Create thread."""
    # We first need to check if the combination thread/vlab/project is valid
    validate_project(
        virtual_lab_id=body.virtual_lab_id,
        project_id=body.project_id,
        groups=user_info.groups,
    )
    new_thread = Threads(
        user_id=user_info.sub,
        title=body.title,
        vlab_id=body.virtual_lab_id,
        project_id=body.project_id,
    )
    session.add(new_thread)
    await session.commit()
    await session.refresh(new_thread)

    return ThreadsRead(**new_thread.__dict__)


@router.patch("/{thread_id}/generate_title")
async def generate_title(
    session: Annotated[AsyncSession, Depends(get_session)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    thread: Annotated[Threads, Depends(get_thread)],
    redis_client: Annotated[aioredis.Redis | None, Depends(get_redis_client)],
    fastapi_response: Response,
    body: ThreadGeneratBody,
) -> ThreadsRead:
    """Generate a short thread title based on the user's first message and update thread's title."""
    limit_headers, rate_limited = await rate_limit(
        redis_client=redis_client,
        route_path="/threads/{thread_id}/generate_title",
        limit=settings.rate_limiter.limit_title,
        expiry=settings.rate_limiter.expiry_title,
        user_sub=thread.user_id,
    )
    if rate_limited:
        raise HTTPException(
            status_code=429,
            detail={"error": "Rate limit exceeded"},
            headers=limit_headers.model_dump(by_alias=True),
        )
    fastapi_response.headers.update(limit_headers.model_dump(by_alias=True))
    # Send it to OpenAI longside with the system prompt asking for summary
    messages = [
        {
            "role": "system",
            "content": "Given the user's first message of a conversation, generate a short title for this conversation (max 5 words).",
        },
        {"role": "user", "content": body.first_user_message},
    ]

    response = await openai_client.beta.chat.completions.parse(
        messages=messages,  # type: ignore
        model=settings.openai.model,
        response_format=ThreadGeneratedTitle,
    )

    # Update the thread title and modified date + commit
    thread.title = response.choices[0].message.parsed.title  # type: ignore
    thread.update_date = utc_now()
    await session.commit()
    await session.refresh(thread)
    return ThreadsRead(**thread.__dict__)


@router.get("")
async def get_threads(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    virtual_lab_id: str | None = None,
    project_id: str | None = None,
    sort: Literal[
        "update_date", "creation_date", "-update_date", "-creation_date"
    ] = "-update_date",
) -> list[ThreadsRead]:
    """Get threads for a user."""
    validate_project(
        virtual_lab_id=virtual_lab_id,
        project_id=project_id,
        groups=user_info.groups,
    )
    sort_column = sort.lstrip("-")
    query = (
        select(Threads)
        .where(
            Threads.user_id == user_info.sub,
            Threads.vlab_id == virtual_lab_id,
            Threads.project_id == project_id,
        )
        .order_by(
            desc(getattr(Threads, sort_column))
            if sort.startswith("-")
            else getattr(Threads, sort_column)
        )
    )

    thread_result = await session.execute(query)
    threads = thread_result.scalars().all()
    return [ThreadsRead(**thread.__dict__) for thread in threads]


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
    s3_client: Annotated[Any, Depends(get_s3_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
) -> dict[str, str]:
    """Delete the specified thread and its associated S3 objects."""
    # Delete the thread from database
    await session.delete(thread)
    await session.commit()

    # Delete associated S3 objects first
    delete_from_storage(
        s3_client=s3_client,
        bucket_name=settings.storage.bucket_name,
        user_id=user_info.sub,
        thread_id=thread.thread_id,
    )

    # note that the above is not atomic and if only one of the two operations fails, the other will still be executed
    # if this becomes an issue, we can redisgn

    return {"Acknowledged": "true"}


@router.get("/{thread_id}")
async def get_thread_by_id(
    thread: Annotated[Threads, Depends(get_thread)],
) -> ThreadsRead:
    """Get a specific thread by ID."""
    return ThreadsRead(**thread.__dict__)


# Define your routes here
@router.get("/{thread_id}/messages")
async def get_thread_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exists
    thread_id: str,
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    entity: list[Literal["USER", "AI_TOOL", "TOOL", "AI_MESSAGE"]] | None = Query(
        default=None
    ),
    sort: Literal["creation_date", "-creation_date"] = "creation_date",
) -> list[MessageResponse]:
    """Get all messages of the thread."""
    # Create mapping of tool names to their HIL requirement
    tool_hil_mapping = {tool.name: tool.hil for tool in tool_list}

    if entity:
        entity_where = or_(*[Messages.entity == ent for ent in entity])
    else:
        entity_where = true()
    messages_result = await session.execute(
        select(Messages)
        .where(Messages.thread_id == thread_id, entity_where)
        .options(joinedload(Messages.tool_calls))  # Eager load tool_calls
        .order_by(desc(Messages.order) if sort.startswith("-") else Messages.order)
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
