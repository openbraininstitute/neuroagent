"""Rate limit related operations."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from redis import asyncio as aioredis

from neuroagent.app.app_utils import parse_redis_data, validate_project
from neuroagent.app.config import Settings
from neuroagent.app.dependencies import get_redis_client, get_settings, get_user_info
from neuroagent.app.schemas import RateLimitInfo, RateLimitOutput, UserInfo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rate_limit", tags=["Rate operations"])


@router.get("")
async def get_rate_limit(
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    redis_client: Annotated[aioredis.Redis, Depends(get_redis_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    vlab_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
) -> RateLimitOutput:
    """Let the user know about its current rate limits."""
    # Default response if redis is deactivated
    if redis_client is None:
        return RateLimitOutput(
            chat_streamed=RateLimitInfo(limit=-1, remaining=-1, reset_in=-1),
            question_suggestions=RateLimitInfo(limit=-1, remaining=-1, reset_in=-1),
            generate_title=RateLimitInfo(limit=-1, remaining=-1, reset_in=-1),
        )

    # Validate that the user belongs to the project if provided and define limits
    user_sub = user_info.sub
    if vlab_id is not None and project_id is not None:
        validate_project(
            groups=user_info.groups,
            virtual_lab_id=vlab_id,
            project_id=project_id,
        )
        limit_suggestion = settings.rate_limiter.limit_suggestions_inside
    else:
        limit_suggestion = settings.rate_limiter.limit_suggestions_outside

    limit_chat = settings.rate_limiter.limit_chat
    limit_title = settings.rate_limiter.limit_title

    # Get the keys associated to the user in redis
    keys = await redis_client.keys(f"*{user_sub}*")

    # Prepare the usage count and the ttl
    async with redis_client.pipeline() as pipe:
        for key in keys:
            pipe.get(key)
            pipe.pttl(key)

        # Run all tasks async
        completed = await pipe.execute()

    # Match the results back to keys
    results = dict(
        zip(keys, [completed[i : i + 2] for i in range(0, len(completed), 2)])
    )

    return RateLimitOutput(
        chat_streamed=parse_redis_data(
            field="chat_streamed", redis_info=results, limit=limit_chat
        ),
        question_suggestions=parse_redis_data(
            field="question_suggestions", redis_info=results, limit=limit_suggestion
        ),
        generate_title=parse_redis_data(
            field="generate_title", redis_info=results, limit=limit_title
        ),
    )
