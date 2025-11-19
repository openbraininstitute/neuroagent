"""Web Search tool for searching the web."""

import logging
from datetime import datetime
from typing import Any, ClassVar

import httpx
from pydantic import BaseModel, ConfigDict, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class WebSearchInput(BaseModel):
    """Input schema for Web Search tool."""

    query: str = Field(description="Search query for web search")
    num_results: int = Field(
        default=5, ge=1, le=10, description="Number of results to return"
    )
    start_publish_date: datetime | None = Field(
        default=None,
        description="Filter results published after this date (ISO 8601 format)",
    )
    end_publish_date: datetime | None = Field(
        default=None,
        description="Filter results published before this date (ISO 8601 format)",
    )


class WebSearchMetadata(BaseMetadata):
    """Metadata for Web Search tool."""

    exa_api_key: str


class SearchResults(BaseModel):
    """Search results schema for Web Search tool."""

    title: str
    url: str
    publishedDate: datetime | None = None
    author: str | None = None
    id: str
    image: str | None = None
    text: str

    model_config = ConfigDict(extra="ignore")


class WebSearchOutput(BaseModel):
    """Output schema for Web Search tool."""

    results: list[SearchResults]


class WebSearchTool(BaseTool):
    """Tool that performs real-time web searches."""

    name: ClassVar[str] = "web-search-tool"
    name_frontend: ClassVar[str] = "Web Search"
    utterances: ClassVar[list[str]] = [
        "Find information online",
        "Look up this topic on the internet",
        "Search the web for this",
    ]
    description: ClassVar[str] = (
        "Search the web. Performs real-time web searches and can scrape content from specific URLs. "
        "Supports configurable result counts and returns the content from the most relevant websites."
    )
    description_frontend: ClassVar[str] = (
        "Search the web. Performs real-time web searches and can scrape content from specific URLs. "
        "Supports configurable result counts and returns the content from the most relevant websites."
    )
    metadata: WebSearchMetadata
    input_schema: WebSearchInput

    async def arun(self) -> WebSearchOutput:
        """Perform web search.

        Returns
        -------
            WebSearchOutput containing search results
        """
        payload: dict[str, Any] = {
            "query": self.input_schema.query,
            "type": "auto",
            "numResults": self.input_schema.num_results,
            "contents": {
                "text": {
                    "maxCharacters": 3000  # Len of excerpts. Not specified = full page
                },
                "livecrawl": "preferred",
                "extras": {"imageLinks": 1},
            },
        }

        if self.input_schema.start_publish_date:
            payload["startPublishedDate"] = (
                self.input_schema.start_publish_date.isoformat()
            )
        if self.input_schema.end_publish_date:
            payload["endPublishedDate"] = self.input_schema.end_publish_date.isoformat()

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                "https://api.exa.ai/search",
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

            return WebSearchOutput(
                results=[SearchResults(**res) for res in data["results"]]
            )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        No known way of checking if the API is live.
        """
        return True
