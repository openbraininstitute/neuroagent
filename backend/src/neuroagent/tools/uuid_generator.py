"""UUID generator tool."""

import logging
import uuid
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class UuidInput(BaseModel):
    """Input schema for UUID tool."""

    count: int = Field(default=1, description="Number of UUIDs to generate")
    version: int = Field(default=4, description="UUID version (1 or 4)")


class UuidMetadata(BaseMetadata):
    """Metadata for UUID tool."""

    pass


class UuidToolOutput(BaseModel):
    """Output of the UUID tool."""

    uuids: list[str]
    version: int


class UuidTool(BaseTool):
    """Tool that generates UUIDs."""

    name: ClassVar[str] = "uuid-tool"
    name_frontend: ClassVar[str] = "UUID Generator"
    utterances: ClassVar[list[str]] = [
        "Generate a UUID",
        "Create unique identifier",
        "Generate random ID",
    ]
    description: ClassVar[str] = "Generates UUID (Universally Unique Identifier) strings"
    description_frontend: ClassVar[str] = """Generate unique identifiers (UUIDs):
    • Version 1: Time-based UUIDs
    • Version 4: Random UUIDs (default)
    • Multiple UUIDs at once
    
    Perfect for creating unique identifiers for data, sessions, or objects."""
    metadata: UuidMetadata
    input_schema: UuidInput

    async def arun(self) -> UuidToolOutput:
        """Generate UUIDs."""
        if self.input_schema.count < 1 or self.input_schema.count > 100:
            raise ValueError("count must be between 1 and 100")
        
        if self.input_schema.version == 1:
            uuids = [str(uuid.uuid1()) for _ in range(self.input_schema.count)]
        elif self.input_schema.version == 4:
            uuids = [str(uuid.uuid4()) for _ in range(self.input_schema.count)]
        else:
            raise ValueError("version must be 1 or 4")

        return UuidToolOutput(uuids=uuids, version=self.input_schema.version)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True