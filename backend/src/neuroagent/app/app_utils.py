"""App utilities functions."""

import logging
from typing import Any

from fastapi import HTTPException
from openai import AsyncOpenAI
from openai.types.embedding import Embedding
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.app.config import Settings
from neuroagent.tools.base_tool import BaseTool

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


async def get_embeddings(
    openai_client: AsyncOpenAI,
    to_embed: list[str] | str,
    embedding_model: str,
    embedding_dim: int,
) -> list[Embedding]:
    """Embed tool description for later retrieval."""
    embeddings = await openai_client.embeddings.create(
        input=to_embed, model=embedding_model, dimensions=embedding_dim
    )
    return embeddings.data


async def retrieve_tools(
    tools_embedding_dict: dict[str, list[float]],
    embedded_query: list[float],
    tool_list: list[type[BaseTool]],
    max_tools: int,
) -> list[type[BaseTool]]:
    """Get the top-k most relevant tools given a user query."""
    # Get the cosine similarity between tools and query
    tool_query_similarity = cosine_similarity(
        [embedded_query], list(tools_embedding_dict.values())
    ).squeeze(axis=0)

    # Sort the tools based on their similarity with the query
    sorted_tool_name, sorted_tool_scores = zip(
        *sorted(
            [
                (tool_name, score)
                for tool_name, score in zip(
                    tools_embedding_dict.keys(), tool_query_similarity
                )
            ],
            key=lambda x: x[1],
            reverse=True,
        )
    )
    logger.info(
        f"Selected tools: {', '.join(sorted_tool_name[:max_tools])} with score {sorted_tool_scores[:max_tools]}"
    )
    return [tool for tool in tool_list if tool.name in sorted_tool_name[:max_tools]]
