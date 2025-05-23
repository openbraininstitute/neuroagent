"""Threads CRUDs."""

import datetime
import json
import logging
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from neuroagent.app.app_utils import (
    rate_limit,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, utc_now
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
    MessagesRead,
    PaginatedParams,
    PaginatedResponse,
    ThreadCreate,
    ThreadGeneratBody,
    ThreadGeneratedTitle,
    ThreadsRead,
    ThreadUpdate,
    ToolCall,
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
    pagination_params: PaginatedParams = Depends(),
    virtual_lab_id: str | None = None,
    project_id: str | None = None,
    sort: Literal[
        "update_date", "creation_date", "-update_date", "-creation_date"
    ] = "-update_date",
) -> PaginatedResponse[ThreadsRead]:
    """Get threads for a user."""
    validate_project(
        virtual_lab_id=virtual_lab_id,
        project_id=project_id,
        groups=user_info.groups,
    )
    sort_column = sort.lstrip("-")
    column_attr = getattr(Threads, sort_column)

    where_conditions = [
        Threads.user_id == user_info.sub,
        Threads.vlab_id == virtual_lab_id,
        Threads.project_id == project_id,
    ]

    if pagination_params.cursor is not None:
        comparison_op = (
            column_attr < datetime.datetime.fromisoformat(pagination_params.cursor)
            if sort.startswith("-")
            else column_attr > datetime.datetime.fromisoformat(pagination_params.cursor)
        )
        where_conditions.append(comparison_op)

    query = (
        select(Threads)
        .where(*where_conditions)
        .order_by(desc(column_attr) if sort.startswith("-") else column_attr)
        .limit(pagination_params.page_size + 1)
    )

    thread_result = await session.execute(query)
    threads = thread_result.scalars().all()
    has_more = len(threads) > pagination_params.page_size
    to_return = threads[:-1] if has_more else threads

    return PaginatedResponse(
        next_cursor=getattr(to_return[-1], sort_column) if to_return else None,
        has_more=has_more,
        page_size=pagination_params.page_size,
        results=[ThreadsRead(**thread.__dict__) for thread in to_return],
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


@router.get("/{thread_id}/messages")
async def get_thread_messages(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exists
    thread_id: str,
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    pagination_params: PaginatedParams = Depends(),
) -> PaginatedResponse[MessagesRead]:
    """Get all messages of the thread."""
    # Create mapping of tool names to their HIL requirement
    tool_hil_mapping = {tool.name: tool.hil for tool in tool_list}

    # Fetch boundary dates for pagination
    where_conditions = [
        Messages.thread_id == thread_id,
        Messages.entity.in_([Entity.USER, Entity.AI_MESSAGE]),
    ]
    # Ensure cursor is a datetime, not a string
    cursor = pagination_params.cursor
    if cursor:
        where_conditions.append(
            Messages.creation_date < datetime.datetime.fromisoformat(cursor)
        )

    creation_date_results = await session.execute(
        select(Messages.creation_date)
        .where(*where_conditions)
        .order_by(desc(Messages.creation_date))
        .limit(pagination_params.page_size + 1)
    )
    creation_dates = creation_date_results.scalars().all()

    if not creation_dates:
        return PaginatedResponse(
            next_cursor=None,
            has_more=False,
            page_size=pagination_params.page_size,
            results=[],
        )

    has_more = len(creation_dates) > pagination_params.page_size
    page_dates = creation_dates[:-1] if has_more else creation_dates
    newest_msg_in_page, oldest_msg_in_page = page_dates[0], page_dates[-1]

    # Fetch full Messages for the window and eager-load tool calls
    all_msg_in_page_query = (
        select(Messages)
        .options(selectinload(Messages.tool_calls))
        .where(
            Messages.thread_id == thread_id,
            Messages.creation_date <= newest_msg_in_page,
            Messages.creation_date >= oldest_msg_in_page,
        )
        .order_by(desc(Messages.creation_date))
    )
    all_msg_in_page_result = await session.execute(all_msg_in_page_query)
    db_messages = all_msg_in_page_result.scalars().all()

    # Format to MessagesRead schema
    messages: list[MessagesRead] = []
    tool_call_buffer: list[dict] = []

    for msg in reversed(db_messages):
        if msg.entity in [Entity.USER, Entity.AI_MESSAGE]:
            message_data = {
                "id": msg.message_id,
                "role": msg.entity.value,
                "thread_id": msg.thread_id,
                "is_complete": msg.is_complete,
                "created_at": msg.creation_date,
                "content": json.loads(msg.content).get("content"),
                "parts": None,
            }
            # add tool calls and reset buffer after attaching
            if msg.entity == Entity.AI_MESSAGE:
                message_data["parts"] = [
                    ToolCall(**tool_call) for tool_call in tool_call_buffer
                ]
                tool_call_buffer = []
            messages.append(MessagesRead(**message_data))

        # Buffer tool calls until the next AI_MESSAGE
        elif msg.entity == Entity.AI_TOOL:
            for tc in msg.tool_calls:
                requires_validation = tool_hil_mapping.get(tc.name, False)
                if tc.validated is True:
                    status = "accepted"
                elif tc.validated is False:
                    status = "rejected"
                elif not requires_validation:
                    status = "not_required"
                else:
                    status = "pending"

                tool_call_buffer.append(
                    {
                        "tool_call_id": tc.tool_call_id,
                        "name": tc.name,
                        "arguments": tc.arguments,
                        "validated": status,
                    }
                )

        # Merge the actual tool result back into the buffered part
        elif msg.entity == Entity.TOOL:
            tool_call_id = json.loads(msg.content).get("tool_call_id")
            tool_call = next(
                (
                    item
                    for item in tool_call_buffer
                    if item["tool_call_id"] == tool_call_id
                ),
                None,
            )
            # Does this work ? it changes the reference in the list.
            if tool_call:
                tool_call["results"] = msg.content

    # Reverse back to descending order and build next_cursor
    ordered = list(reversed(messages))
    next_cursor = ordered[-1].created_at if has_more else None

    return PaginatedResponse(
        next_cursor=next_cursor,
        has_more=has_more,
        page_size=pagination_params.page_size,
        results=ordered,
    )
