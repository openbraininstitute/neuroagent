"""Threads CRUDs."""

import json
import logging
import time
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from openai import AsyncOpenAI
from pydantic import AwareDatetime
from redis import asyncio as aioredis
from sqlalchemy import desc, exists, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from neuroagent.app.app_utils import (
    format_messages_output,
    format_messages_vercel,
    rate_limit,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Task,
    Threads,
    TokenConsumption,
    TokenType,
    utc_now,
)
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
    CompressResponse,
    MessagesRead,
    MessagesReadVercel,
    PaginatedParams,
    PaginatedResponse,
    SearchMessagesList,
    SearchMessagesResult,
    ThreadCreate,
    ThreadGeneratBody,
    ThreadGeneratedTitle,
    ThreadsRead,
    ThreadUpdate,
    ThreadUsage,
    UserInfo,
)
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import (
    delete_from_storage,
    get_token_count,
    messages_to_openai_content,
)

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
        select(
            Messages.thread_id,
            Messages.message_id,
            Threads.title,
            Messages.content,
        )
        .select_from(Messages)
        .join(Threads, Messages.thread_id == Threads.thread_id)
        .where(
            Threads.user_id == user_info.sub,
            Threads.vlab_id == virtual_lab_id,
            Threads.project_id == project_id,
            Messages.entity.in_(["USER", "AI_MESSAGE"]),
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
    results = result.fetchall()
    return SearchMessagesList(
        result_list=[
            SearchMessagesResult(
                thread_id=result[0],
                message_id=result[1],
                title=result[2],
                content=json.loads(result[3])["content"],
            )
            for result in results
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
    messages = [
        {
            "role": "system",
            "content": "Given the user's first message of a conversation, generate a short title for this conversation (max 5 words).",
        },
        {"role": "user", "content": body.first_user_message},
    ]

    parse_kwargs = {
        "messages": messages,
        "model": settings.llm.suggestion_model,
        "response_format": ThreadGeneratedTitle,
    }

    if "gpt-5" in settings.llm.suggestion_model:
        parse_kwargs["reasoning_effort"] = "minimal"

    response = await openai_client.beta.chat.completions.parse(**parse_kwargs)  # type: ignore

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
    _: Annotated[Threads, Depends(get_thread)],  # to check if thread exists
    thread_id: str,
    tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)],
    pagination_params: PaginatedParams = Depends(),
    entity: list[Literal["USER", "AI_TOOL", "TOOL", "AI_MESSAGE"]] | None = Query(
        default=None
    ),
    sort: Literal["creation_date", "-creation_date"] = "-creation_date",
    vercel_format: bool = Query(default=False),
) -> PaginatedResponse[MessagesRead] | PaginatedResponse[MessagesReadVercel]:
    """Get all messages of the thread."""
    # Create mapping of tool names to their HIL requirement
    tool_hil_mapping = {tool.name: tool.hil for tool in tool_list}

    if vercel_format:
        entity = ["USER", "AI_MESSAGE"]

    if entity:
        entity_where = or_(*[Messages.entity == ent for ent in entity])
    else:
        entity_where = true()

    where_conditions = [Messages.thread_id == thread_id, entity_where]

    if pagination_params.cursor is not None:
        comparison_op = (
            Messages.creation_date < pagination_params.cursor
            if (sort.startswith("-") or vercel_format)
            else Messages.creation_date > pagination_params.cursor
        )
        where_conditions.append(comparison_op)

    # Only get the relevent info for output format, we will then make the full query after.
    messages_result = await session.execute(
        select(Messages.message_id, Messages.creation_date, Messages.entity)
        .where(*where_conditions)
        .order_by(
            desc(Messages.creation_date)
            if (sort.startswith("-") or vercel_format)
            else Messages.creation_date
        )
        .limit(pagination_params.page_size + 1)
    )
    # This is a list of tuples with (message_id, creation_date, entitty)
    db_cursor = messages_result.all()

    if not db_cursor:
        return PaginatedResponse(
            next_cursor=None,
            has_more=False,
            page_size=pagination_params.page_size,
            results=[],
        )

    has_more = len(db_cursor) > pagination_params.page_size
    if not vercel_format and has_more:
        db_cursor = db_cursor[:-1]

    if vercel_format:
        # We set the most recent boudary to the cursor if it exists.
        date_conditions = (
            [(Messages.creation_date < pagination_params.cursor)]
            if pagination_params.cursor
            else []
        )

        # If there are more messages we set the oldest bound for the messages.
        if has_more:
            if db_cursor[-2][2] == Entity.USER:
                date_conditions.append(Messages.creation_date >= db_cursor[-2][1])
            else:
                date_conditions.append(Messages.creation_date > db_cursor[-1][1])
                # This is a trick to include all tool from last AI.

        # Get all messages in the date frame.
        all_msg_in_page_query = (
            select(Messages)
            .options(selectinload(Messages.tool_calls))
            .where(Messages.thread_id == thread_id, *date_conditions)
            .order_by(desc(Messages.creation_date))
        )
        all_msg_in_page_result = await session.execute(all_msg_in_page_query)
        db_messages = all_msg_in_page_result.scalars().all()
    else:
        # Here we simply get all messages with the ID found before.
        # Pagination needs to happen on non-joined parent.
        # Once we have them we can eager load the tool calls
        complete_messages_results = await session.execute(
            select(Messages)
            .options(selectinload(Messages.tool_calls))
            .where(Messages.message_id.in_([msg[0] for msg in db_cursor]))
            .order_by(
                desc(Messages.creation_date)
                if sort.startswith("-")
                else Messages.creation_date
            )
        )
        db_messages = complete_messages_results.scalars().all()
    if vercel_format:
        return format_messages_vercel(
            db_messages, tool_hil_mapping, has_more, pagination_params.page_size
        )
    else:
        return format_messages_output(
            db_messages, tool_hil_mapping, has_more, pagination_params.page_size
        )


@router.get("/{thread_id}/usage")
async def get_thread_usage(
    session: Annotated[AsyncSession, Depends(get_session)],
    thread_id: UUID,
) -> ThreadUsage:
    """Get token usage for a thread.

    If the last message is a summary (only message in thread), only completion
    tokens are returned since the summary prompt is not part of the conversation.
    """
    latest_message_subq = (
        select(Messages.message_id)
        .where(
            Messages.thread_id == thread_id,
            Messages.entity.in_([Entity.AI_TOOL, Entity.AI_MESSAGE, Entity.USER]),
        )
        .order_by(desc(Messages.creation_date))
        .limit(1)
        .scalar_subquery()
    )

    result = await session.execute(
        select(
            TokenConsumption.type, TokenConsumption.count, TokenConsumption.task
        ).where(TokenConsumption.message_id == latest_message_subq)
    )

    tokens = result.all()

    if not tokens:
        return ThreadUsage()

    # Check if any token has SUMMARY task
    is_summary = any(row[2] == Task.SUMMARY for row in tokens)

    # If last message is a summary, only return completion tokens
    if is_summary:
        return ThreadUsage(
            **{
                TokenType(row[0]).value: row[1]
                for row in tokens
                if TokenType(row[0]) == TokenType.COMPLETION
            }
        )

    return ThreadUsage(**{TokenType(row[0]).value: row[1] for row in tokens})


@router.post("/{thread_id}/compress")
async def compress_conversation(
    thread: Annotated[Threads, Depends(get_thread)],
    session: Annotated[AsyncSession, Depends(get_session)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CompressResponse:
    """Compress the current thread to manage the context window."""
    sql_messages = await thread.awaitable_attrs.messages
    openai_messages = await messages_to_openai_content(sql_messages)

    # Check if first message is a previous summary (when thread has parent)
    has_previous_summary = (
        thread.parent_thread_id
        and openai_messages
        and openai_messages[0].get("role") == "user"
    )

    # Build summarization prompt
    system_prompt = """You are a specialized conversation summarizer for a neuroscience research AI assistant.

Your task is to create a structured summary that preserves all information needed for the assistant to continue helping with neuroscience research.

Output format (use these exact section headers):

## Research Intent
What scientific questions is the user investigating? What are the research goals?

## Data Accessed
Which brain regions, cell types, morphologies, or datasets were queried?
- For each data artifact, note: what it is, what was retrieved, key findings

## Analyses Performed
What computational analyses, visualizations, or workflows were executed?
- Include tool names, parameters used, and results

## Key Scientific Details
Preserve exact technical information:
- Brain region names (e.g., "SSp", "primary somatosensory cortex")
- Cell type classifications (e.g., "L5_TPC:A", "pyramidal")
- Morphology IDs and circuit identifiers
- Query parameters and API calls
- Literature references (DOIs, paper titles, authors)
- Data values and statistical results

## Current State
- What has been completed?
- What analyses are in progress?
- What remains to be investigated?

## Breadcrumbs
Identifiers and references needed to reconstruct context:
- Morphology IDs
- Brain region IDs
- File paths for plots/data
- API endpoints used
- Search queries executed

RULES:
1. Be specific with identifiers - "morphology_id: 12345" not "some morphology"
2. Preserve exact brain region names and cell type classifications
3. Keep all data IDs and file paths
4. Maintain chronological flow within sections
5. If a section has no content, write "None" - don't skip it
6. For tool calls, preserve: tool names, key parameters, result summaries

{previous_summary_instruction}"""

    previous_summary_instruction = (
        """
## Previous Summary Update
The first user message contains a previous summary. Update it with new information from subsequent messages:
- Merge new content into existing sections
- Preserve all existing identifiers, data, and references
- Do not discard any information from the previous summary"""
        if has_previous_summary
        else ""
    )
    system_prompt = system_prompt.format(
        previous_summary_instruction=previous_summary_instruction
    )

    messages = [{"role": "system", "content": system_prompt}, *openai_messages]
    completion_kwargs = {
        "messages": messages,
        "model": settings.llm.compression_model,
    }
    if "gpt-5" in settings.llm.suggestion_model:
        completion_kwargs["reasoning_effort"] = "minimal"

    start = time.time()
    response = await openai_client.chat.completions.create(**completion_kwargs)  # type: ignore
    logger.info(
        f"Compression took {time.time() - start:.2f}s for {len(openai_messages)} messages"
    )
    token_count = get_token_count(response.usage)
    new_thread = Threads(
        user_id=thread.user_id,
        title=thread.title,
        parent_thread_id=thread.thread_id,
        project_id=thread.project_id,
        vlab_id=thread.vlab_id,
        messages=[
            Messages(
                thread_id=thread.thread_id,
                entity=Entity.USER,
                content=json.dumps(
                    {"role": "user", "content": response.choices[0].message.content}
                ),
                is_complete=True,
                token_consumption=[
                    TokenConsumption(
                        type=token_type,
                        task=Task.SUMMARY,
                        count=count,
                        model=settings.llm.compression_model,
                    )
                    for token_type, count in [
                        (TokenType.INPUT_CACHED, token_count["input_cached"]),
                        (TokenType.INPUT_NONCACHED, token_count["input_noncached"]),
                        (TokenType.COMPLETION, token_count["completion"]),
                    ]
                    if count
                ],
            )
        ],
    )
    session.add(new_thread)
    await session.commit()
    await session.refresh(new_thread)
    return CompressResponse(thread_id=new_thread.thread_id)
