"""From url gives back what is on the current page."""

from typing import ClassVar

from pydantic import BaseModel

from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata
from neuroagent.utils import get_frontend_description


class ContextAnalyzerInput(BaseModel):
    """Input class for the Context Analyzer tool, empty since no inputs."""

    pass


class ContextAnalyzerMetdata(EntitycoreMetadata):
    """Metadata for the Context Analyzer tool."""

    frontend_url: str


class ContextAnalyzerOutput(BaseModel):
    """Output of the Context Analyzer tool."""

    is_in_project: bool
    full_page_path: str
    page_description: str


class ContextAnalyzerTool(BaseTool):
    """Class for the context analyzer tool."""

    name: ClassVar[str] = "context-analyzer-tool"
    name_frontend: ClassVar[str] = "Context Analyzer"
    description: ClassVar[
        str
    ] = """Gets a description of the current page the user is on. Call this tool when the user needs guidance on the platform.
    If the user has a vague question about the website USE THIS TOOL."""
    description_frontend: ClassVar[str] = (
        """Allows to get the current page the user is navigating. This allows the Agent to help the user navigate the website."""
    )
    metadata: ContextAnalyzerMetdata
    input_schema: ContextAnalyzerInput

    async def arun(self) -> ContextAnalyzerOutput:
        """From the current url, gives information on the current page.

        Returns
        -------
            Description of the current page the user is on, formatted as a string.
        """
        if self.metadata.frontend_url:
            parsed_url = await get_frontend_description(
                url=self.metadata.frontend_url,
                entitycore_url=self.metadata.entitycore_url,
                vlab_id=self.metadata.vlab_id,
                project_id=self.metadata.project_id,
                httpx_client=self.metadata.httpx_client,
            )
        else:
            raise ValueError("Please provide the current frontend url.")
        return ContextAnalyzerOutput(**parsed_url)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online. Always online."""
        return True
