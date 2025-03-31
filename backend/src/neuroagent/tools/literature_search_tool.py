"""Literature Search tool."""

import logging
from collections import defaultdict
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field, field_validator

from neuroagent.tools.autogenerated_types.literature_search_models import (
    ParagraphMetadata,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class LiteratureSearchInput(BaseModel):
    """Inputs of the literature search API."""

    query: str = Field(
        description=(
            "Query to match against the text of paragraphs coming from the body of scientific"
            " articles. The body does not contain the title nor the authors. The matching is done using the bm25 algorithm, so the query"
            " should be based on relevant keywords to ensure maximal efficiency."
        )
    )
    article_number: int = Field(
        default=5, ge=1, le=10, description="Number of articles to return."
    )
    article_types: list[str] | None = Field(
        default=None,
        description="Filter that restricts the type of retrieved articles.",
    )
    authors: list[str] | None = Field(
        default=None,
        description="Filter that restricts the authors of retrieved articles.",
    )
    journals: list[str] | None = Field(
        default=None,
        description="Filter that restricts the journal of publication of retrieved articles. Should be the ISSN of the journal.",
    )
    date_from: str | None = Field(
        default=None, description="Publication date lowerbound. Format YYYY-MM-DD"
    )
    date_to: str | None = Field(
        default=None, description="Publication date upperbound. Format YYYY-MM-DD"
    )


class LiteratureSearchMetadata(BaseMetadata):
    """Metadata class for LiteratureSearchTool."""

    literature_search_url: str
    token: str
    retriever_k: int
    use_reranker: bool


class ParagraphOutput(BaseModel):
    """Paragraph parameters."""

    section: str | None
    paragraph: str

    @field_validator("paragraph", mode="before")
    @classmethod
    def truncate_paragraph(cls, text: str) -> str:
        """Truncate long test."""
        max_length = 10000
        if isinstance(text, str) and len(text) > max_length:
            return text[:max_length]
        return text


class ArticleOutput(BaseModel):
    """Results of the Litterature Search API."""

    article_title: str
    article_authors: list[str]
    article_doi: str | None
    pubmed_id: str | None
    date: str | None
    article_type: str | None
    journal_issn: str | None
    journal_name: str | None
    cited_by: int | None
    impact_factor: float | None
    abstract: str | None
    paragraphs: list[ParagraphOutput]

    @field_validator("abstract", mode="before")
    @classmethod
    def truncate_text(cls, text: str) -> str:
        """Truncate long test."""
        max_length = 10000
        if isinstance(text, str) and len(text) > max_length:
            return text[:max_length]
        return text


class LiteratureSearchToolOutput(BaseModel):
    """Output schema for the literature search tool."""

    articles: list[ArticleOutput]


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
    It returns a list of scientific articles that have paragraphs matching the query (in the sense of the bm25 algorithm), alongside with the metadata of the articles they were extracted from."""
    metadata: LiteratureSearchMetadata
    input_schema: LiteratureSearchInput
    output_schema: ClassVar[type[LiteratureSearchToolOutput]] = (
        LiteratureSearchToolOutput
    )

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
        req_body = self.create_query(
            query=self.input_schema.query,
            article_types=self.input_schema.article_types,
            authors=self.input_schema.authors,
            journals=self.input_schema.journals,
            date_from=self.input_schema.date_from,
            date_to=self.input_schema.date_to,
            retriever_k=self.metadata.retriever_k,
            use_reranker=self.metadata.use_reranker,
            reranker_k=100
            if self.metadata.retriever_k > 100
            else self.metadata.retriever_k,  # LS allows for max 100 results for now
        )
        # Send the request
        response = await self.metadata.httpx_client.get(
            self.metadata.literature_search_url,
            headers={"Authorization": f"Bearer {self.metadata.token}"},
            params=req_body,
            timeout=None,
        )
        if response.status_code != 200:
            return response.json()
        else:
            return self._process_output(
                output=response.json(), article_number=self.input_schema.article_number
            )

    @staticmethod
    def create_query(
        query: str,
        article_types: list[str] | None,
        authors: list[str] | None,
        journals: list[str] | None,
        date_from: str | None,
        date_to: str | None,
        retriever_k: int | None,
        reranker_k: int | None,
        use_reranker: bool | None,
    ) -> dict[str, str | int | list[str]]:
        """Create query for the Literature Search API."""
        req_body = {
            "query": query,
            "article_types": article_types,
            "authors": authors,
            "journals": journals,
            "date_from": date_from,
            "date_to": date_to,
            "retriever_k": retriever_k,
            "use_reranker": use_reranker,
            "reranker_k": reranker_k,
        }

        return {k: v for k, v in req_body.items() if v is not None}

    @staticmethod
    def _process_output(output: list[dict[str, Any]], article_number: int) -> str:
        """Process output."""
        paragraphs_metadata = [ParagraphMetadata(**paragraph) for paragraph in output]

        # Aggregate the paragraphs into articles
        articles: dict[str, list[ParagraphOutput]] = defaultdict(list)
        article_metadata: dict[str, ParagraphMetadata] = {}

        i = 0
        while len(articles) < article_number and i < len(paragraphs_metadata):
            paragraph = paragraphs_metadata[i]
            articles[paragraph.article_id].append(
                ParagraphOutput(
                    section=paragraph.section, paragraph=paragraph.paragraph
                )
            )
            if paragraph.article_id not in article_metadata:
                article_metadata[paragraph.article_id] = paragraph
            i += 1

        paragraphs_output = [
            ArticleOutput(
                article_title=article_metadata[article_id].article_title,
                article_authors=article_metadata[article_id].article_authors,
                paragraphs=articles[article_id],
                article_doi=article_metadata[article_id].article_doi,
                pubmed_id=article_metadata[article_id].pubmed_id,
                date=article_metadata[article_id].date,
                article_type=article_metadata[article_id].article_type,
                journal_issn=article_metadata[article_id].journal_issn,
                journal_name=article_metadata[article_id].journal_name,
                cited_by=article_metadata[article_id].cited_by,
                impact_factor=article_metadata[article_id].impact_factor,
                abstract=article_metadata[article_id].abstract,
            )
            for article_id in articles.keys()
        ]
        return LiteratureSearchToolOutput(articles=paragraphs_output).model_dump_json()

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
