"""OBI Expert tool."""

import asyncio
from typing import Any, ClassVar, Literal, Optional

import httpx
from pydantic import BaseModel, Field


from neuroagent.tools.base_tool import BaseMetadata, BaseTool


def flatten_portable_text(blocks: list[dict[str, Any]] | dict[str, Any]) -> str:
    """Recursively flatten Portable Text blocks into a single string.

    Parameters
    ----------
    blocks : list[dict[str, Any]] | dict[str, Any]
        A list of Portable Text blocks or a single block

    Returns
    -------
    str
        The flattened text content
    """
    # Handle single block case
    if isinstance(blocks, dict):
        blocks = [blocks]

    lines = []
    for block in blocks:
        # Handle basic text blocks
        if block.get("_type") == "block" and "children" in block:
            text = "".join(child.get("text", "") for child in block.get("children", []))
            if text:
                lines.append(text)

        # Recursively handle nested blocks
        elif "content" in block and isinstance(block["content"], (list, dict)):
            nested_text = flatten_portable_text(block["content"])
            if nested_text:
                lines.append(nested_text)

        # Handle arrays of blocks
        elif isinstance(block, list):
            nested_text = flatten_portable_text(block)
            if nested_text:
                lines.append(nested_text)

        # Handle other block types that might contain text
        elif "text" in block:
            lines.append(block["text"])

    return "\n\n".join(filter(None, lines))


class OBIExpertInput(BaseModel):
    """Inputs for the OBI Expert tool."""

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


class OBIExpertMetadata(BaseMetadata):
    """Metadata for the OBI Expert tool."""

    sanity_url: str


class SanityDocument(BaseModel):
    """Shared schema for Sanity documents."""

    id: str
    created_at: str
    updated_at: str


class NewsDocument(SanityDocument):
    """Schema for news documents."""

    title: str
    category: str
    content: str | None


class GlossaryItemDocument(SanityDocument):
    """Schema for glossary item documents."""

    name: str
    description: str


class OBIExpertOutput(BaseModel):
    """Output schema for the OBI Expert tool."""

    results: list[NewsDocument] | list[GlossaryItemDocument]
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
        extra_keys: list[str] | None = None,
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
        extra_keys: list[str], optional
            Additional fields to fetch from the document, by default None

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
        - Field selection including any extra keys requested
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

        # Build field selection
        base_fields = {
            "id": "_id",
            "created_at": "_createdAt",
            "updated_at": "_updatedAt",
            "content": "content",
            "title": "title",
            "category": "category",
        }

        # Add extra keys if provided
        if extra_keys:
            for key in extra_keys:
                if key not in base_fields:
                    base_fields[key] = key

        # Convert to GROQ projection syntax
        field_selection = ", ".join(f'"{k}": {v}' for k, v in base_fields.items())
        base_query += f" {{ {field_selection} }}"

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

    @staticmethod
    def parse_document(document_type: str, doc: dict[str, Any]) -> SanityDocument:
        """Parse a Sanity document into the appropriate Pydantic model.

        Parameters
        ----------
        document_type : str
            Type of document to parse (e.g., "glossaryItem", "news")
        doc : dict[str, Any]
            Raw document data from Sanity

        Returns
        -------
        SanityDocument
            Parsed document as the appropriate Pydantic model subclass

        Notes
        -----
        - Handles Portable Text content flattening
        - Maps document types to their corresponding Pydantic models
        - Preserves all base fields (id, created_at, updated_at)
        """
        # Base fields present in all documents
        base_fields = {
            "id": doc["id"],
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"],
        }

        # Map document types to their corresponding models and required fields
        if document_type == "news":
            # Process Portable Text content if present
            content_portable_text = doc.get("content")
            if isinstance(content_portable_text, (dict, list)):
                content = flatten_portable_text(content_portable_text)
            else:
                content = None
            return NewsDocument(
                **base_fields,
                title=doc.get("title", ""),
                category=doc.get("category", ""),
                content=content,
            )
        elif document_type == "glossaryItem":
            return GlossaryItemDocument(
                **base_fields,
                name=doc.get("name", ""),
                description=doc.get("description", ""),
            )
        else:
            raise ValueError(f"Unsupported document type: {document_type}")

    async def arun(self) -> OBIExpertOutput:
        """Extract documents from Sanity."""
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
        async with httpx.AsyncClient() as client:
            results_response, count_response = await asyncio.gather(
                client.get(
                    self.metadata.sanity_url,
                    params={"query": results_query},
                ),
                client.get(
                    self.metadata.sanity_url,
                    params={"query": count_query},
                ),
            )

        results_response.raise_for_status()
        count_response.raise_for_status()

        results_data = results_response.json()
        count_data = count_response.json()

        # Process results using the parse_document method
        processed_results = [
            self.parse_document(self.input_schema.document_type, doc)
            for doc in results_data.get("result", [])
        ]

        return OBIExpertOutput(
            results=processed_results,
            total_items=count_data.get("result", 0),
        )
