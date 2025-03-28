"""App utilities functions."""

import logging
from typing import Any
from math import ceil

from fastapi import HTTPException
from redis import asyncio as aioredis
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED
from pydantic import BaseModel

from neuroagent.app.config import Settings

logger = logging.getLogger(__name__)


def setup_engine(
    settings: Settings, connection_string: str | None = None
) -> AsyncEngine | None:
    """Get the SQL engine."""
    if connection_string:
        engine_kwargs: dict[str, Any] = {"url": connection_string}
        if "sqlite" in settings.db.prefix:  # type: ignore
            # https://fastapi.tiangolo.com/tutorial/sql-databases/#create-the-sqlalchemy-engine
            engine_kwargs["connect_args"] = {"check_same_thread": False}
        engine = create_async_engine(**engine_kwargs)
    else:
        logger.warning("The SQL db_prefix needs to be set to use the SQL DB.")
        return None
    try:
        engine.connect()
        logger.info(
            "Successfully connected to the SQL database"
            f" {connection_string if not settings.db.password else connection_string.replace(settings.db.password.get_secret_value(), '*****')}."
        )
        return engine
    except SQLAlchemyError:
        logger.warning(
            "Failed connection to SQL database"
            f" {connection_string if not settings.db.password else connection_string.replace(settings.db.password.get_secret_value(), '*****')}."
        )
        return None


def validate_project(
    groups: list[str],
    virtual_lab_id: str | None = None,
    project_id: str | None = None,
) -> None:
    """Check user appartenance to vlab and project before running agent."""
    if virtual_lab_id and not project_id:
        belongs_to_vlab = any([f"/vlab/{virtual_lab_id}" in group for group in groups])
        if not belongs_to_vlab:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="User does not belong to the virtual-lab.",
            )
    elif virtual_lab_id and project_id:
        # Certified approach by Bilal
        belongs_to_vlab_and_project = any(
            [f"/proj/{virtual_lab_id}/{project_id}" in group for group in groups]
        )
        if not belongs_to_vlab_and_project:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="User does not belong to the project.",
            )
    elif not virtual_lab_id and project_id:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Virtual-lab ID must be provided when providing a project ID",
        )
    else:
        # No vlab nor project provided, nothing to do.
        return


class RateLimitInfo(BaseModel):
    """Rate limit information returned in headers."""

    x_ratelimit_limit: int
    x_ratelimit_remaining: int
    x_ratelimit_reset: int


async def rate_limit(
    redis_client: aioredis.Redis | None,
    route_path: str,
    limit: int,
    expiry: int,
    user_sub: str,
) -> RateLimitInfo:
    """Check rate limiting for a given route and user.

    When redis_client is None, returns -1 for all rate limit values to indicate
    that rate limiting is disabled.
    """
    if redis_client is None:
        return RateLimitInfo(
            x_ratelimit_limit=-1, x_ratelimit_remaining=-1, x_ratelimit_reset=-1
        )

    # Create key using normalized route path and user sub
    key = f"rate_limit:{user_sub}:{route_path}"

    # Get current count and TTL
    current = await redis_client.get(key)
    current = int(current) if current else 0
    ttl = ceil(await redis_client.pttl(key) / 1000)  # Convert to seconds and round up

    if current > 0:
        if current + 1 > limit:
            raise HTTPException(
                status_code=429,
                detail={"error": "Rate limit exceeded", "retry_after": ttl},
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(ttl),
                },
            )
        await redis_client.incr(key)
    else:
        await redis_client.set(key, 1, ex=expiry)
        ttl = expiry

    return RateLimitInfo(
        x_ratelimit_limit=limit,
        x_ratelimit_remaining=limit - (current + 1),
        x_ratelimit_reset=ttl,
    )
