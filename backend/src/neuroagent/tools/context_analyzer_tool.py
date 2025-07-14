"""From url gives back what is on the current page."""

from typing import ClassVar

from pydantic import Field, BaseModel
from pydantic.json_schema import SkipJsonSchema


from neuroagent.tools.base_tool import BaseTool


class ContextAnalyzerInput(BaseModel):
    """Input class for the Context Analyzer tool, empty since no inputs."""

    pass


class ContextAnalyzerMetdata(BaseModel):
    """Metadata for the Context Analyzer tool."""

    frontend_url: str


class ContextAnalyzerOutput(BaseModel):
    """Output of the Context Analyzer tool."""


class ContextAnalyzerTool(BaseTool):
    """."""

    name: ClassVar[str] = "context-analyzer-tool"
    name_frontend: ClassVar[str] = "Context Analyzer"
    description: ClassVar[str] = (
        """Gets a description of the current page the user is on. Call this tool when the user needs guidance on the platform."""
    )
    description_frontend: ClassVar[str] = (
        """Allows to get the current page the user is navigating. This allows the Agent to help the user navigate the website."""
    )
    metadata: ContextAnalyzerMetdata
    input_schema: ContextAnalyzerInput

    async def arun(self):
        """From the current url, gives information on the current page.

        Returns
        -------
            Description of the current page the user is on, formatted as a string.
        """

        return

    @classmethod
    async def is_online(frontend_url: str | None) -> bool:
        """Check if the tool is online."""
        return frontend_url is not None
