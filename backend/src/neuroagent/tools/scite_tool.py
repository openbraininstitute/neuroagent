"""Now tool for getting current UTC timestamp."""

import logging
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class SciteAIInput(BaseModel):
    """Input schema for Scite AI tool (empty as no inputs needed)."""

    query: str = Field(description="Keyword search input to sciteAI.")


class SciteAIMetadata(BaseMetadata):
    """Metadata for Scite AI tool."""

    httpx_client: AsyncClient
    scite_url: str
    scite_token: str


class PaperOutput(BaseModel):
    """Output schema for papers of the tool."""

    article_title: str
    article_authors: list[str]
    article_doi: str | None
    date: str | None
    journal_issn: str | list[str] | None
    journal_name: str | None
    abstract: str | None
    paragraphs: list[str]


class SciteAIToolOutput(BaseModel):
    """Output schema of the SciteAI tool."""

    articlt_list: list[PaperOutput]


class SciteAITool(BaseTool):
    """Tool that returns Scite AI results."""

    name: ClassVar[str] = "scite-tool"
    name_frontend: ClassVar[str] = "SciteAI"
    description: ClassVar[str] = (
        """Use Scite AI to get results from the literature. Please cite your sources in the answer."""
    )
    description_frontend: ClassVar[str] = """Temp."""
    metadata: SciteAIMetadata
    input_schema: SciteAIInput

    async def arun(self) -> SciteAIToolOutput:
        """Get paper results using Scite AI.

        Returns
        -------
            List of papers.
        """
        logger.info(
            f"Getting scite ai results with inputs : {self.input_schema.model_dump()}"
        )

        response = await self.metadata.httpx_client.get(
            self.metadata.scite_url + "/api_partner/search",
            headers={"Authorization": f"Bearer {self.metadata.scite_token}"},
            params={"term": self.input_schema.query},
            timeout=None,
        )

        return self._process_output(response.json())

    @staticmethod
    def _process_output(output: dict[str, Any]) -> SciteAIToolOutput:
        papers = []

        for paps in output["hits"]:
            papers.append(
                PaperOutput(
                    article_title=paps.get("title", ""),
                    article_authors=[
                        author.get("authorName") for author in paps.get("authors", [])
                    ],
                    article_doi=paps.get("doi"),
                    date=paps.get("date"),
                    journal_issn=paps.get("issns"),
                    journal_name=paps.get("publisher"),
                    abstract=paps.get("abstract"),
                    paragraphs=[
                        citation.get("snippet")
                        for citation in paps.get("citations", [])
                    ],
                )
            )

        return SciteAIToolOutput(articlt_list=papers)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, scite_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            scite_url,
        )
        return response.status_code == 200
