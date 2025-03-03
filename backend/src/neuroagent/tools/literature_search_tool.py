"""Literature Search tool."""

import json
import logging
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, ConfigDict, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class LiteratureSearchInput(BaseModel):
    """Inputs of the literature search API."""

    query: str = Field(
        description=(
            "Query to match against the text of paragraphs coming from scientific"
            " articles. The matching is done using the bm25 algorithm, so the query"
            " should be based on keywords to ensure maximal efficiency."
        )
    )


class LiteratureSearchMetadata(BaseMetadata):
    """Metadata class for LiteratureSearchTool."""

    literature_search_url: str
    token: str
    retriever_k: int
    reranker_k: int
    use_reranker: bool


class ParagraphMetadata(BaseModel):
    """Metadata for an article."""

    article_title: str
    article_authors: list[str]
    paragraph: str
    section: str | None = None
    article_doi: str | None = None
    journal_issn: str | None = None
    model_config = ConfigDict(extra="ignore")


class LiteratureSearchTool(BaseTool):
    """Class defining the Literature Search logic."""

    name: ClassVar[str] = "literature-search-tool"
    name_frontend: ClassVar[str] = "Literature Search"
    description_frontend: ClassVar[
        str
    ] = """Search through scientific papers to find relevant information. This tool is particularly useful for:
    • Finding scientific facts about neuroscience and medicine
    • Getting information from peer-reviewed articles
    • Accessing research findings and academic knowledge

    The search will return relevant paragraphs from scientific papers along with their source information."""
    description: ClassVar[
        str
    ] = """Searches the scientific literature. The tool should be used to gather general scientific knowledge. It is best suited for questions about neuroscience and medicine that are not about morphologies.
    It returns a list of paragraphs fron scientific papers that match the query (in the sense of the bm25 algorithm), alongside with the metadata of the articles they were extracted from, such as:
    - title
    - authors
    - paragraph_text
    - section
    - article_doi
    - journal_issn"""
    input_schema: LiteratureSearchInput
    metadata: LiteratureSearchMetadata

    async def arun(self) -> str:
        """Async search the scientific literature and returns citations.

        Returns
        -------
            List of paragraphs and their metadata
        """
        logger.info(
            f"Entering literature search tool. Inputs: {self.input_schema.query=}"
        )

        # Prepare the request's body
        req_body = {
            "query": self.input_schema.query,
            "retriever_k": self.metadata.retriever_k,
            "use_reranker": self.metadata.use_reranker,
            "reranker_k": self.metadata.reranker_k,
        }

        # Send the request
        response = await self.metadata.httpx_client.get(
            self.metadata.literature_search_url,
            headers={"Authorization": f"Bearer {self.metadata.token}"},
            params=req_body,  # type: ignore
            timeout=None,
        )

        return self._process_output(response.json())

    @staticmethod
    def _process_output(output: list[dict[str, Any]]) -> str:
        """Process output."""
        paragraphs_metadata = [
            ParagraphMetadata(
                article_title=paragraph["article_title"],
                article_authors=paragraph["article_authors"],
                paragraph=paragraph["paragraph"],
                section=paragraph["section"],
                article_doi=paragraph["article_doi"],
                journal_issn=paragraph["journal_issn"],
            ).model_dump()
            for paragraph in output
        ]
        return json.dumps(paragraphs_metadata)

    @classmethod
    async def is_online(
        cls, *, httpx_client: AsyncClient, literature_search_url: str
    ) -> bool:
        """Check if the tool is online."""
        url = literature_search_url
        if url.endswith("retrieval/"):
            url = url[: -len("retrieval/")]
        elif url.endswith("retrieval"):
            url = url[: -len("retrieval")]
        response = await httpx_client.get(
            url,
        )
        return response.status_code == 200
