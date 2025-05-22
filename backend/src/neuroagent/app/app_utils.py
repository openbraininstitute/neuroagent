"""App utilities functions."""

import json
import logging
import re
from pathlib import Path
from typing import Any

import yaml
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from redis import asyncio as aioredis
from semantic_router import Route
from semantic_router.encoders import OpenAIEncoder
from semantic_router.index import LocalIndex
from semantic_router.routers import SemanticRouter
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Messages, Threads, utc_now
from neuroagent.schemas import BrainRegions

logger = logging.getLogger(__name__)


class RateLimitHeaders(BaseModel):
    """Headers for the rate limits."""

    x_ratelimit_limit: str = Field(alias="x-ratelimit-limit")
    x_ratelimit_remaining: str = Field(alias="x-ratelimit-remaining")
    x_ratelimit_reset: str = Field(alias="x-ratelimit-reset")

    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True)


def setup_engine(
    settings: Settings, connection_string: str | None = None
) -> AsyncEngine | None:
    """Get the SQL engine."""
    if connection_string:
        engine_kwargs: dict[str, Any] = {"url": connection_string}
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


async def rate_limit(
    redis_client: aioredis.Redis | None,
    route_path: str,
    limit: int,
    expiry: int,
    user_sub: str,
) -> tuple[RateLimitHeaders, bool]:
    """Check rate limiting for a given route and user.

    Parameters
    ----------
    redis_client : aioredis.Redis
        Redis client instance
    route_path : str
        Path of the route being accessed
    limit : int
        Maximum number of requests allowed
    expiry : int
        Time in seconds before the rate limit resets
    user_sub : str
        User identifier

    Returns
    -------
    RateLimitHeaders
        Pydantic class detailing rate limit info and meant to be dumped in response headers.
    rate_limited
        Whether the user is rate limited. In parent endpoint raise error if True.
    """
    if redis_client is None:
        return RateLimitHeaders(
            x_ratelimit_limit="-1", x_ratelimit_remaining="-1", x_ratelimit_reset="-1"
        ), False  # redis disabled

    # Create key using normalized route path and user sub
    key = f"rate_limit:{user_sub}:{route_path}"

    # Get current count
    current = await redis_client.get(key)
    current = int(current) if current else 0

    if current > 0:
        # Get the remaining time
        ttl = await redis_client.pttl(key)
        if current + 1 > limit:
            # Rate limited
            return RateLimitHeaders(
                x_ratelimit_limit=str(limit),
                x_ratelimit_remaining="0",
                x_ratelimit_reset=str(round(ttl / 1000)),
            ), True

        # Not rate limited
        await redis_client.incr(key)
        return RateLimitHeaders(
            x_ratelimit_limit=str(limit),
            x_ratelimit_remaining=str(limit - current - 1),
            x_ratelimit_reset=str(round(ttl / 1000)),
        ), False

    # Key did not exist yet
    else:
        await redis_client.set(key, 1, ex=expiry)
        return RateLimitHeaders(
            x_ratelimit_limit=str(limit),
            x_ratelimit_remaining=str(limit - current - 1),
            x_ratelimit_reset=str(expiry),
        ), False


def get_semantic_router(settings: Settings) -> SemanticRouter | None:
    """Set the semantic router object for basic guardrails."""
    # Load routes and utterances from yaml file
    try:
        with (Path(__file__).parent.parent / "fixed_llm_responses.yml").open() as f:
            data = yaml.safe_load(f)
    except Exception:
        return None

    # Define the routes
    routes = [
        Route(
            name=route["name"],
            utterances=route["utterances"],
            metadata={"response": route["response"]},
            score_threshold=route.get("threshold"),
        )
        for route in data["routes"]
    ]

    if settings.openai.token and settings.openai.token.get_secret_value().startswith(
        "sk-"
    ):
        encoder = OpenAIEncoder(
            openai_api_key=settings.openai.token.get_secret_value(),
            name="text-embedding-3-small",
        )
    else:
        return None

    index = LocalIndex()
    return SemanticRouter(
        encoder=encoder, routes=routes, index=index, auto_sync="local"
    )


async def commit_messages(
    engine: AsyncEngine, messages: list[Messages], thread: Threads
) -> None:
    """Commit the messages in a bg task."""
    async with AsyncSession(engine) as session:
        session.add_all(messages)
        thread.update_date = utc_now()
        await session.commit()
        await session.close()


def get_br_embeddings(
    s3_client: Any, bucket_name: str, folder: str
) -> list[BrainRegions]:
    """Retrieve brain regions embeddings from s3."""
    file_list = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=folder)
    pattern = re.compile(rf"^{folder}/.*_hierarchy_embeddings.json$")
    output: list[BrainRegions] = []

    if "Contents" in file_list:
        for obj in file_list["Contents"]:
            key = obj["Key"]
            if pattern.match(key):
                file_obj = s3_client.get_object(Bucket=bucket_name, Key=key)
                content = json.loads(file_obj["Body"].read().decode("utf-8"))
                output.append(BrainRegions(**content))
    return output
