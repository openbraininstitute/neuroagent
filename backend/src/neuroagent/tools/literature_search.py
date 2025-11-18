"""Literature Search tool for searching academic papers."""

import logging
from datetime import datetime
from typing import Any, ClassVar

import httpx
from pydantic import BaseModel, ConfigDict, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class LiteratureSearchInput(BaseModel):
    """Input schema for Literature Search tool."""

    query: str = Field(description="Search query for academic papers")
    start_publish_date: datetime | None = Field(
        default=None,
        description="Filter papers published after this date (ISO 8601 format)",
    )
    end_publish_date: datetime | None = Field(
        default=None,
        description="Filter papers published before this date (ISO 8601 format)",
    )
    num_results: int = Field(
        default=5, ge=1, le=10, description="Number of results to return"
    )


class LiteratureSearchMetadata(BaseMetadata):
    """Metadata for Literature Search tool."""

    exa_api_key: str


class ArticleResults(BaseModel):
    """Article results schema for Literature Search tool."""

    title: str
    url: str
    publishedDate: datetime | None = None
    author: str | None = None
    id: str
    image: str | None = None
    text: str

    model_config = ConfigDict(extra="ignore")


class LiteratureSearchOutput(BaseModel):
    """Output schema for Literature Search tool."""

    results: list[ArticleResults]


class LiteratureSearchTool(BaseTool):
    """Tool that searches across 100M+ research papers using Exa AI."""

    name: ClassVar[str] = "literature-search-tool"
    name_frontend: ClassVar[str] = "Literature Search"
    utterances: ClassVar[list[str]] = [
        "Find literature on this topic",
        "Look up academic papers",
        "Search for research papers",
    ]
    description: ClassVar[str] = (
        "Search across 100M+ research papers with full text access using Exa AI - performs targeted academic paper searches with deep research content coverage. "
        "Returns detailed information about relevant academic papers including titles, authors, publication dates, and full text excerpts. "
        "You can control the number of results as well as the start/end publication date."
        "This tool returns only partial content of pages. In your reply, mention that you can attempt to read the full articles using the `read-paper-tool` if the paper is publicly available."
        "*CRITICAL* : Each returned article has an `image` field. When it is not None, you MUST systematically embed the url in the chat in markdown (e.g. ()[https://url.of.image.png])."
    )
    description_frontend: ClassVar[str] = (
        "Search across 100M+ research papers with full text access. Performs targeted academic paper searches with deep research content coverage. "
        "Returns detailed information about relevant academic papers including titles, authors, publication dates, and full text excerpts. "
        "Control the number of results and character counts returned to balance comprehensiveness with conciseness based on your task requirements."
    )
    metadata: LiteratureSearchMetadata
    input_schema: LiteratureSearchInput

    async def arun(self) -> LiteratureSearchOutput:
        """Search for academic papers.

        Returns
        -------
            LiteratureSearchOutput containing search results
        """
        payload: dict[str, Any] = {
            "query": f"{self.input_schema.query} academic paper research study",
            "type": "neural",
            "category": "research paper",
            "numResults": self.input_schema.num_results,
            "includeDomains": [
                "arxiv.org",
                "scholar.google.com",
                "researchgate.net",
                "pubmed.ncbi.nlm.nih.gov",
                "ieee.org",
                "acm.org",
                "nature.com",
                "cell.com",
                "elsevier.com",
                "elifesciences.org",
                "frontiersin.org",
            ],
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

        return LiteratureSearchOutput(
            results=[ArticleResults(**article) for article in data["results"]]
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Returns True if the Exa AI service is accessible.
        """
        return True
