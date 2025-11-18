"""Read Paper tool for extracting content from URLs."""

import logging
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class ReadPaperInput(BaseModel):
    """Input schema for Read Paper tool."""

    url: str = Field(description="The URL to extract content from")


class ReadPaperMetadata(BaseMetadata):
    """Metadata for Read Paper tool."""

    pass


class ReadPaperOutput(BaseModel):
    """Output schema for Read Paper tool."""

    content: str


class ReadPaperTool(BaseTool):
    """Tool that extracts content from specific URLs using Exa AI."""

    name: ClassVar[str] = "read-paper"
    name_frontend: ClassVar[str] = "Read Paper"
    utterances: ClassVar[list[str]] = [
        "Extract content from this URL",
        "Get the full text of this article",
        "Read this paper for me",
    ]
    description: ClassVar[str] = (
        "Extract content from specific URLs using Exa AI - performs targeted crawling of web pages to retrieve their full content. "
        "Useful for reading articles, PDFs, or any web page when you have the exact URL. "
        "Use in combination with literature-search-tool and web-search-tool when the user asks for more info about a paper/url. "
        "Returns the complete text content of the specified URL."
    )
    description_frontend: ClassVar[str] = (
        "Extract content from specific URLs. Performs targeted crawling of web pages to retrieve their full content. "
        "Useful for reading articles, PDFs, or any web page when you have the exact URL. "
        "Returns the complete text content of the specified URL."
    )
    metadata: ReadPaperMetadata
    input_schema: ReadPaperInput

    async def arun(self) -> ReadPaperOutput:
        """Extract content from the specified URL.

        Returns
        -------
            ReadPaperOutput containing the extracted content
        """
        # TODO: Implement URL content extraction using Exa AI
        raise NotImplementedError("Read Paper tool implementation pending")

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Returns True if the Exa AI service is accessible.
        """
        # TODO: Implement health check for Exa AI service
        return True
