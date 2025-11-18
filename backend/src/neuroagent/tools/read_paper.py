"""Read Paper tool for extracting content from URLs."""

import logging
from datetime import datetime
from typing import Any, ClassVar

import httpx
from pydantic import BaseModel, ConfigDict, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class ReadPaperInput(BaseModel):
    """Input schema for Read Paper tool."""

    urls: list[str] = Field(description="URLs to extract content from.")


class ReadPaperMetadata(BaseMetadata):
    """Metadata for Read Paper tool."""

    exa_api_key: str


class ContentResult(BaseModel):
    """Article results schema for Literature Search tool."""

    title: str
    url: str
    publishedDate: datetime | None = None
    author: str | None = None
    id: str
    image: str | None = None
    text: str

    model_config = ConfigDict(extra="ignore")


class ReadPaperOutput(BaseModel):
    """Output schema for Literature Search tool."""

    results: list[ContentResult]


class ReadPaperTool(BaseTool):
    """Tool that extracts content from specific URLs using Exa AI."""

    name: ClassVar[str] = "read-paper"
    name_frontend: ClassVar[str] = "Read Paper"
    utterances: ClassVar[list[str]] = [
        "Extract content from this URL",
        "Get the full text of this article",
        "Read this paper for me",
        "Tell me more about the second paper.",
    ]
    description: ClassVar[str] = (
        "Extract content from specific URLs using Exa AI - performs targeted crawling of web pages to retrieve their full content. "
        "Useful for reading articles, PDFs, or any web page when you have the exact URL. "
        "Typically to be used when the user asks for more information about a paper/link, or asks for full text."
        "Use in combination with `literature-search-tool` and `web-search-tool` when the user asks for more info about a paper/url. "
        "Returns the complete text content of the specified URL."
        "Each returned article has an `image` field. When it is not None, feel free to embed the images in the chat throughout your response (e.g. ()[https://url.of.image.png])."
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
        payload: dict[str, Any] = {
            "urls": self.input_schema.urls,
            "contents": {
                "text": True,  # Full text
                "livecrawl": "preferred",
                "extras": {"imageLinks": 3},
            },
        }

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                "https://api.exa.ai/contents",
                headers={
                    "x-api-key": self.metadata.exa_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            if response.status_code != 200:
                raise ValueError(
                    f"The Exa search endpoint returned a non 200 response code. Error: {response.text}"
                )
            data = response.json()

            return ReadPaperOutput(
                results=[ContentResult(**res) for res in data["results"]]
            )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        No known way of checking if the API is live.
        """
        return True
