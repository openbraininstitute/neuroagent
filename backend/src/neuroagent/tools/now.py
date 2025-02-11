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


class NowTool(BaseTool):
    """Tool that returns the current UTC timestamp."""

    name: ClassVar[str] = "now-tool"
    name_frontend: ClassVar[str] = "Now"
    description: ClassVar[str] = (
        "Returns the current UTC timestamp as an ISO-8601 formatted string"
    )
    input_schema: NowInput
    metadata: NowMetadata

    async def arun(self) -> str:
        """Get current UTC timestamp.

        Returns
        -------
            Current UTC timestamp as ISO-8601 formatted string
        """
        logger.info("Getting current UTC timestamp")
        return datetime.now(timezone.utc).isoformat()
