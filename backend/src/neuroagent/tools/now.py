"""Now tool for getting current UTC timestamp."""

import logging
from datetime import datetime, timezone
from typing import ClassVar

from pydantic import BaseModel

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class NowInput(BaseModel):
    """Input schema for Now tool (empty as no inputs needed)."""

    pass


class NowMetadata(BaseMetadata):
    """Metadata for Now tool."""

    pass


class NowToolOutput(BaseModel):
    """Output schema of the Now tool."""

    timestamp: str


class NowTool(BaseTool):
    """Tool that returns the current UTC timestamp."""

    name: ClassVar[str] = "now-tool"
    name_frontend: ClassVar[str] = "Now"
    utterances: ClassVar[list[str]] = [
        "What time is it?",
        "Get the current date",
        "What's today's date?",
    ]
    description: ClassVar[
        str
    ] = """Get the current date and time. Do not ever assume you know the current date, ALWAYS fetch it from this tool if you need it.
        ALWAYS call it for questions mentioning relative time scales. They often contain fragments like "since the last 6 months", "from yesterday", "for the past week", "from today", "during the previous year" etc...).
        When this tool is needed, ALWAYS call it first, before any other tool.
        Returns the current UTC timestamp as an ISO-8601 formatted string."""
    description_frontend: ClassVar[
        str
    ] = """Get the current time in UTC format. Use this tool to:
    • Get precise timestamps
    • Track when operations occur
    • Record timing information

    Returns the current time in standardized UTC format."""
    metadata: NowMetadata
    input_schema: NowInput

    async def arun(self) -> NowToolOutput:
        """Get current UTC timestamp.

        Returns
        -------
            Current UTC timestamp as ISO-8601 formatted string
        """
        logger.info("Getting current UTC timestamp")
        return NowToolOutput(timestamp=datetime.now(timezone.utc).isoformat())

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Always returns True as this tool doesn't depend on external services.
        """
        return True
