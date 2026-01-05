"""Threads CRUDs."""

import logging
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from openai import AsyncOpenAI
from pydantic import AwareDatetime
from redis import asyncio as aioredis
from sqlalchemy import desc, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from neuroagent.app.app_utils import (
    format_messages_output,
    format_messages_vercel,
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
    MessagesRead,
    MessagesReadVercel,
    PaginatedParams,
    PaginatedResponse,
    SearchMessagesList,
    SearchMessagesResult,
    ThreadCreate,
    ThreadGenerateBody,
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


@router.get("/search")
async def search(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    query: str,
    virtual_lab_id: UUID | None = None,
    project_id: UUID | None = None,
    limit: int = 20,
) -> SearchMessagesList:
    """Get threads for a user."""
    validate_project(
        virtual_lab_id=virtual_lab_id,
        project_id=project_id,
        groups=user_info.groups,
    )

    search_query = func.plainto_tsquery("english", query)

    sql_query = (
        select(Messages)
        .options(selectinload(Messages.parts), selectinload(Messages.thread))
        .join(Threads, Messages.thread_id == Threads.thread_id)
        .where(
            Threads.user_id == user_info.sub,
            Threads.vlab_id == virtual_lab_id,
            Threads.project_id == project_id,
            Messages.search_vector.op("@@")(search_query),
        )
        .distinct(Messages.thread_id)
        .order_by(
            Messages.thread_id,
            func.ts_rank(Messages.search_vector, search_query).desc(),
            Messages.creation_date.desc(),
        )
        .limit(limit)
    )

    result = await session.execute(sql_query)
    messages = result.scalars().all()
    return SearchMessagesList(
        result_list=[
            SearchMessagesResult(
                thread_id=msg.thread_id,
                message_id=msg.message_id,
                title=msg.thread.title,
                content=msg.parts[-1].output.get("content", {})[0].get("text"),
            )
            for msg in messages
        ]
    )


@router.patch("/{thread_id}/generate_title")
async def generate_title(
    session: Annotated[AsyncSession, Depends(get_session)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    thread: Annotated[Threads, Depends(get_thread)],
    redis_client: Annotated[aioredis.Redis | None, Depends(get_redis_client)],
    fastapi_response: Response,
    body: ThreadGenerateBody,
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
            headers={
                "Access-Control-Expose-Headers": ",".join(
                    list(limit_headers.model_dump(by_alias=True).keys())
                ),
                **limit_headers.model_dump(by_alias=True),
            },
        )
    fastapi_response.headers.update(
        {
            "Access-Control-Expose-Headers": ",".join(
                list(limit_headers.model_dump(by_alias=True).keys())
            ),
            **limit_headers.model_dump(by_alias=True),
        }
    )
    # Send it to OpenAI longside with the system prompt asking for summary
    system_prompt = "Given the user's first message of a conversation, generate a short title for this conversation (max 5 words)."

    parse_kwargs: dict[str, Any] = {
        "instructions": system_prompt,
        "input": body.first_user_message,
        "model": settings.llm.suggestion_model,
        "text_format": ThreadGeneratedTitle,
        "store": False,
    }

    if "gpt-5" in settings.llm.suggestion_model:
        parse_kwargs["reasoning"] = {"effort": "minimal"}

    response = await openai_client.responses.parse(**parse_kwargs)

    # Update the thread title and modified date + commit
    if response.output_parsed:
        thread.title = response.output_parsed.title
    else:
        logger.warning("Unable to generate title.")
    thread.update_date = utc_now()
    await session.commit()
    await session.refresh(thread)
    return ThreadsRead(**thread.__dict__)


@router.get("")
async def get_threads(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    pagination_params: PaginatedParams = Depends(),
    virtual_lab_id: UUID | None = None,
    project_id: UUID | None = None,
    exclude_empty: bool = False,
    creation_date_lte: AwareDatetime | None = None,
    creation_date_gte: AwareDatetime | None = None,
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

    # Add condition to exclude empty threads if requested
    if exclude_empty:
        where_conditions.append(exists().where(Messages.thread_id == Threads.thread_id))

    # Add creation date filters if provided
    if creation_date_lte is not None:
        where_conditions.append(Threads.creation_date <= creation_date_lte)
    if creation_date_gte is not None:
        where_conditions.append(Threads.creation_date >= creation_date_gte)

    if pagination_params.cursor is not None:
        comparison_op = (
            column_attr < pagination_params.cursor
            if sort.startswith("-")
            else column_attr > pagination_params.cursor
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
    _: Annotated[Threads, Depends(get_thread)],
    thread_id: str,
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    pagination_params: PaginatedParams = Depends(),
    entity: list[Literal["USER", "ASSISTANT"]] | None = Query(default=None),
    sort: Literal["creation_date", "-creation_date"] = "-creation_date",
    vercel_format: bool = False,
) -> PaginatedResponse[MessagesRead] | PaginatedResponse[MessagesReadVercel]:
    """Get all messages of the thread."""
    tool_hil_mapping = {tool.name: tool.hil for tool in tool_list}

    where_conditions = [Messages.thread_id == thread_id]
    if entity:
        where_conditions.append(or_(*[Messages.entity == ent for ent in entity]))
    if pagination_params.cursor:
        where_conditions.append(
            Messages.creation_date < pagination_params.cursor
            if sort.startswith("-") or vercel_format
            else Messages.creation_date > pagination_params.cursor
        )

    result = await session.execute(
        select(Messages)
        .options(selectinload(Messages.parts))
        .where(*where_conditions)
        .order_by(
            desc(Messages.creation_date)
            if sort.startswith("-")
            else Messages.creation_date
        )
        .limit(pagination_params.page_size + 1)
    )
    db_messages = result.scalars().all()

    has_more = len(db_messages) > pagination_params.page_size
    db_messages = db_messages[:-1] if has_more else db_messages

    if vercel_format:
        return format_messages_vercel(
            db_messages,
            tool_hil_mapping,
            has_more,
            pagination_params.page_size,
        )
    else:
        return format_messages_output(
            db_messages,
            has_more,
            pagination_params.page_size,
        )
