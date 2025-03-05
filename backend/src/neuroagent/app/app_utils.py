"""App utilities functions."""

import json
import logging
from typing import Any

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.app.config import Settings
from neuroagent.new_types import ClientMessage

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


def vercel_to_openai(messages: list[ClientMessage]):
    """Turn vercel messages into openai format."""
    openai_messages = []

    for message in messages:
        parts = []

        parts.append({"type": "text", "text": message.content})

        if message.experimental_attachments:
            for attachment in message.experimental_attachments:
                if attachment.contentType.startswith("image"):
                    parts.append(
                        {"type": "image_url", "image_url": {"url": attachment.url}}
                    )

                elif attachment.contentType.startswith("text"):
                    parts.append({"type": "text", "text": attachment.url})

        if message.toolInvocations:
            tool_calls = [
                {
                    "id": tool_invocation.toolCallId,
                    "type": "function",
                    "function": {
                        "name": tool_invocation.toolName,
                        "arguments": json.dumps(tool_invocation.args),
                    },
                }
                for tool_invocation in message.toolInvocations
            ]

            openai_messages.append({"role": "assistant", "tool_calls": tool_calls})

            tool_results = [
                {
                    "role": "tool",
                    "content": json.dumps(tool_invocation.result),
                    "tool_call_id": tool_invocation.toolCallId,
                }
                for tool_invocation in message.toolInvocations
            ]

            openai_messages.extend(tool_results)

            continue

        openai_messages.append({"role": message.role, "content": parts})

    return openai_messages
