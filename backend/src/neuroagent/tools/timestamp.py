"""Timestamp formatter tool."""

import logging
from datetime import datetime, timezone
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class TimestampInput(BaseModel):
    """Input schema for Timestamp tool."""

    format_type: str = Field(
        default="iso", 
        description="Format type: 'iso', 'human', 'unix', or 'custom'"
    )
    custom_format: str = Field(
        default="%Y-%m-%d %H:%M:%S", 
        description="Custom format string (used when format_type is 'custom')"
    )


class TimestampMetadata(BaseMetadata):
    """Metadata for Timestamp tool."""

    pass


class TimestampToolOutput(BaseModel):
    """Output of the timestamp tool."""

    timestamp: str
    format_used: str
    utc_time: str


class TimestampTool(BaseTool):
    """Tool that formats current timestamp in various formats."""

    name: ClassVar[str] = "timestamp-tool"
    name_frontend: ClassVar[str] = "Timestamp Formatter"
    utterances: ClassVar[list[str]] = [
        "Format the current time",
        "Get timestamp in different format",
        "Show me the time",
        "Current timestamp",
    ]
    description: ClassVar[str] = (
        "Returns current timestamp in various formats: ISO, human-readable, "
        "Unix timestamp, or custom format."
    )
    description_frontend: ClassVar[str] = """Format timestamps in different ways:
    • ISO format (default): 2024-01-15T10:30:00Z
    • Human readable: January 15, 2024 10:30 AM
    • Unix timestamp: 1705315800
    • Custom format: Use your own format string

    Always returns current UTC time in the specified format."""
    metadata: TimestampMetadata
    input_schema: TimestampInput

    async def arun(self) -> TimestampToolOutput:
        """Format current timestamp.

        Returns
        -------
            Dictionary containing formatted timestamp and metadata
        """
        now = datetime.now(timezone.utc)
        
        if self.input_schema.format_type == "iso":
            formatted = now.isoformat()
        elif self.input_schema.format_type == "human":
            formatted = now.strftime("%B %d, %Y %I:%M %p UTC")
        elif self.input_schema.format_type == "unix":
            formatted = str(int(now.timestamp()))
        elif self.input_schema.format_type == "custom":
            formatted = now.strftime(self.input_schema.custom_format)
        else:
            raise ValueError(f"Invalid format_type: {self.input_schema.format_type}")

        return TimestampToolOutput(
            timestamp=formatted,
            format_used=self.input_schema.format_type,
            utc_time=now.isoformat(),
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True