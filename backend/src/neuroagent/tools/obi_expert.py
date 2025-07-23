"""OBI Expert tool."""

import asyncio
from typing import ClassVar, Literal

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseTool


class OBIExpertInput(BaseModel):
    """Inputs for the person get all tool."""

    document_type: Literal["glossaryItem", "news"] = Field(
        description="Type of documents to retrieve"
    )
    page: int = Field(
        default=1, ge=1, description="Page number to retrieve (1-based index)"
    )
    page_size: int = Field(
        default=5, ge=1, le=100, description="Number of documents to retrieve per page"
    )
    sort: Literal["newest", "oldest"] = Field(
        default="newest", description="Sort order of the documents"
    )
    query: str | None = Field(
        default=None, description="Optional text to match in title or content"
    )


class OBIExpertMetadata(BaseModel):
    """Metadata for the OBI Expert tool."""

    sanity_url: str
    httpx_client: AsyncClient


class OBIExpertOutputSingle(BaseModel):
    """Output schema for a single document."""

    id: str
    title: str
    content: str
    url: str
    created_at: str
    updated_at: str


class OBIExpertOutput(BaseModel):
    """Output schema for the OBI Expert tool."""

    results: list[OBIExpertOutputSingle]
    total_items: int


class OBIExpertTool(BaseTool):
    """OBI Expert tool for retrieving documents from the OBI Sanity API."""

    name: ClassVar[str] = "obi-expert"
    name_frontend: ClassVar[str] = "OBI Expert"
    description: ClassVar[
        str
    ] = """Search and retrieve documents from the OBI Sanity API. Use this tool to:
    """
    description_frontend: ClassVar[str] = (
        """Search and retrieve documents from the OBI Sanity API."""
    )
    metadata: OBIExpertMetadata
    input_schema: OBIExpertInput

    @staticmethod
    def build_query(
        document_type: str,
        page: int,
        page_size: int,
        sort: Literal["newest", "oldest"],
        query: str | None = None,
    ) -> str:
        """Build a GROQ query for retrieving documents with pagination and sorting.

        Parameters
        ----------
        document_type : str
            Type of document to query for (e.g., "glossaryItem", "news")
        page : int
            Page number (1-based indexing)
        page_size : int
            Number of items to return per page
        sort : {"newest", "oldest"}
            Sort order for the results
        query : str, optional
            Text to match in title or content fields, by default None

        Returns
        -------
        str
            GROQ query string for Sanity API

        Notes
        -----
        The query includes:
        - Type filtering
        - Optional text matching in title and content
        - Sorting by creation or update date
        - Pagination
        - Field selection
        """
        # Base query with type filter
        base_query = f'*[_type == "{document_type}"'

        # Add text matching if query is provided
        if query:
            base_query += f' && (title match "*{query}*" || content match "*{query}*")'

        # Close filter bracket
        base_query += "]"

        # Add sorting
        sort_field = "_createdAt" if sort == "newest" else "_updatedAt"
        sort_order = "desc" if sort == "newest" else "asc"
        base_query += f" | order({sort_field} {sort_order})"

        # Add pagination
        start = (page - 1) * page_size
        base_query += f"[{start}...{start + page_size}]"

        # Select fields
        base_query += ' { "id": _id, title, content, url, "created_at": _createdAt, "updated_at": _updatedAt }'

        return base_query

    @staticmethod
    def build_count_query(document_type: str, query: str | None = None) -> str:
        """Build a GROQ query to count total matching documents.

        Parameters
        ----------
        document_type : str
            Type of document to count (e.g., "glossaryItem", "news")
        query : str, optional
            Text to match in title or content fields, by default None

        Returns
        -------
        str
            GROQ count query string for Sanity API

        Notes
        -----
        The count query applies the same filtering as the main query:
        - Type filtering
        - Optional text matching in title and content
        But excludes:
        - Sorting
        - Pagination
        - Field selection
        """
        base_query = f'*[_type == "{document_type}"'

        # Add text matching if query is provided
        if query:
            base_query += f' && (title match "*{query}*" || content match "*{query}*")'

        base_query += "]"
        return f"count({base_query})"

    async def arun(self) -> OBIExpertOutput:
        """Extract documents from Sanity."""
        # Common headers for both requests
        headers = {"Authorization": "Bearer dummy-token"}

        # Get documents
        results_query = self.build_query(
            document_type=self.input_schema.document_type,
            page=self.input_schema.page,
            page_size=self.input_schema.page_size,
            sort=self.input_schema.sort,
            query=self.input_schema.query,
        )

        # Get total count
        count_query = self.build_count_query(
            document_type=self.input_schema.document_type, query=self.input_schema.query
        )

        # Make both requests concurrently
        results_response, count_response = await asyncio.gather(
            self.metadata.httpx_client.get(
                self.metadata.sanity_url,
                params={"query": results_query},
                headers=headers,
            ),
            self.metadata.httpx_client.get(
                self.metadata.sanity_url, params={"query": count_query}, headers=headers
            ),
        )

        results_response.raise_for_status()
        count_response.raise_for_status()

        results_data = results_response.json()
        count_data = count_response.json()

        return OBIExpertOutput(
            results=[
                OBIExpertOutputSingle(**doc) for doc in results_data.get("result", [])
            ],
            total_items=count_data.get("result", 0),
        )
