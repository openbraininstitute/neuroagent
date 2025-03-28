"""Semantic scholar tool for outsourced LS."""

import json
from typing import ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field, SecretStr

from neuroagent.base_types import AgentsNames, BaseMetadata, BaseTool


class SemanticScholarMetadata(BaseMetadata):
    """Metadata of the Semantic Scholar tool."""

    # Not required, but limit of 1k RPS across all unauthenticated users in the world.
    semantic_scholar_api_key: SecretStr | None = None


class SemanticScholarInput(BaseModel):
    """Input of the Semantic Scholar tool."""

    query: str = Field(
        description="Used for pagination. When returning a list of results, start with the element at this position in the list."
    )
    offset: int = Field(
        default=0,
        description="Parameter defines the result offset. It skips the given number of results. It's used for pagination. (e.g., 0 (default) is the first page of results, 10 is the 2nd page of results, 20 is the 3rd page of results, etc.).",
    )
    limit: int = Field(
        default=5, le=100, description="The maximum number of results to return."
    )


class SemanticScholarTool(BaseTool):
    """Perform literature search using the google scholar API."""

    name: ClassVar[str] = "semantic-scholar-tool"
    name_frontend: ClassVar[str] = "Semantic Scholar Search"
    description: ClassVar[
        str
    ] = """Powerful literature retrieval that uses the Semantic Scholar API.
        Returns references to papers that match the given query.
        Always refer to the articles using the full title, the authors and a summary of the article.
        Typically, the tool's response includes a `tldr` field that provides such summary."""
    description_frontend: ClassVar[str] = (
        "Uses the Semantic Scholar API to search the literature"
    )
    agents: ClassVar[list[str]] = [AgentsNames.LITERATURE_AGENT.value]
    metadata: SemanticScholarMetadata
    input_schema: SemanticScholarInput

    async def arun(self) -> str:
        """Run the tool."""
        headers = (
            {"x-api-key": self.metadata.semantic_scholar_api_key.get_secret_value()}
            if self.metadata.semantic_scholar_api_key
            else None
        )
        request = await self.metadata.httpx_client.get(
            "https://api.semanticscholar.org/graph/v1/paper/search",
            params={
                "query": self.input_schema.query,
                "fields": "paperId,externalIds,url,title,abstract,venue,referenceCount,citationCount,influentialCitationCount,openAccessPdf,publicationTypes,publicationDate,journal,authors,tldr",
                "fieldsOfStudy": "Medicine,Biology",
                "offset": self.input_schema.offset,
                "limit": self.input_schema.limit,
            },
            headers=headers,
        )
        return json.dumps(request.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient) -> bool:
        """Check if the tool is online."""
        ping_request = await httpx_client.get(
            "https://status.api.semanticscholar.org/api/v2/status.json"
        )
        if ping_request.status_code == 200:
            status = ping_request.json()["status"]
            return status["description"] == "All Systems Operational"
        else:
            return False
