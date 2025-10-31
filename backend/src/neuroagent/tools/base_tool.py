"""Base tool."""

import logging
from abc import ABC, abstractmethod
from typing import Any, ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)


class BaseMetadata(BaseModel):
    """Base class for metadata."""

    model_config = ConfigDict(extra="ignore", arbitrary_types_allowed=True)


class EntitycoreMetadata(BaseMetadata):
    """Metadata class for all Entitycore tools."""

    httpx_client: AsyncClient
    entitycore_url: str
    vlab_id: UUID | None
    project_id: UUID | None
    entity_frontend_url: str


class BaseTool(BaseModel, ABC):
    """Base class for the tools."""

    name: ClassVar[str]
    name_frontend: ClassVar[str] = ""
    description: ClassVar[str]
    description_frontend: ClassVar[str] = ""
    utterances: ClassVar[list[str]] = []
    metadata: BaseMetadata
    input_schema: BaseModel
    hil: ClassVar[bool] = False
    json_schema: ClassVar[dict[str, Any] | None] = None

    @classmethod
    def pydantic_to_openai_schema(cls) -> dict[str, Any]:
        """Convert pydantic schema to OpenAI function JSON schema."""
        # Get the schema from json_schema attribute or input_schema model
        if cls.json_schema is not None:
            schema = cls.json_schema
        else:
            schema = cls.__annotations__["input_schema"].model_json_schema()

        # Wrap in standard JSON Schema structure if needed
        if "type" not in schema and "properties" not in schema:
            schema = {"type": "object", "properties": schema}

        # Ensure additionalProperties is False
        schema.setdefault("additionalProperties", False)

        return {
            "type": "function",
            "name": cls.name,
            "description": cls.description,
            "parameters": schema,
        }

    @abstractmethod
    async def arun(self) -> BaseModel:
        """Run the tool."""

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        By default, we assume the tool is online.
        This method can be overridden by the tool to check if it is online. All the parameters
        need to be inside the `get_healthcheck_variables` dependency.
        """
        return False
