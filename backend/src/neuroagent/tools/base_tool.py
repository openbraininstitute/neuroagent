"""Base tool."""

import logging
from abc import ABC, abstractmethod
from typing import Any, ClassVar

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
    vlab_id: str | None
    project_id: str | None


class BaseTool(BaseModel, ABC):
    """Base class for the tools."""

    name: ClassVar[str]
    name_frontend: ClassVar[str] = ""
    description: ClassVar[str]
    description_frontend: ClassVar[str] = ""
    metadata: BaseMetadata
    input_schema: BaseModel
    hil: ClassVar[bool] = False
    json_schema: ClassVar[dict[str, Any] | None] = None

    @classmethod
    def pydantic_to_openai_schema(cls) -> dict[str, Any]:
        """Convert pydantic schema to OpenAI json."""
        if cls.json_schema is not None:
            parameters = cls.json_schema
        else:
            parameters = cls.__annotations__["input_schema"].model_json_schema()

        # The name and description are duplicated to accomodate for
        # models compatible with flat and nested JSON schema.
        # E.g. o3 is flattened JSON schema compatible only
        new_retval: dict[str, Any] = {
            "type": "function",
            "name": cls.name,
            "description": cls.description,
            "function": {
                "name": cls.name,
                "description": cls.description,
                "strict": False,
                "parameters": parameters,
            },
        }
        new_retval["function"]["parameters"]["additionalProperties"] = False

        return new_retval

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
