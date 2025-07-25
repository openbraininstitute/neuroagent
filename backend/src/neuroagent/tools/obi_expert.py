"""OBI Expert tool."""

import asyncio
import logging
from typing import Any, ClassVar, Literal

import httpx
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class SanityDocument(BaseModel):
    """Shared schema for Sanity documents."""

    id: str
    created_at: str
    updated_at: str

    sanity_mapping: ClassVar[dict[str, str]] = {
        # Maps pydantic model attribute names (keys) to Sanity document field names (values).
        # All pydantic class attributes must be specified here to ensure proper extraction
        # and consistent casing from Sanity documents.
        "id": "_id",
        "created_at": "_createdAt",
        "updated_at": "_updatedAt",
    }

    portable_text_attributes: ClassVar[list[str]] = [
        # List of pydantic model attributes that contain Portable Text content.
        # These fields will be flattened into plain text using the flatten_portable_text function.
    ]


class NewsDocument(SanityDocument):
    """Schema for news documents."""

    title: str
    category: str
    content: str | None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "category": "category",
        "content": "content",
    }

    portable_text_attributes: ClassVar[list[str]] = ["content"]


class GlossaryItemDocument(SanityDocument):
    """Schema for glossary item documents."""

    name: str
    description: str
    definition: str | None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "name": "Name",
        "description": "Description",
        "definition": "definition",
    }

    portable_text_attributes: ClassVar[list[str]] = ["definition"]


class FutureFeature(SanityDocument):
    """Schema for future feature documents."""

    topic: str
    feature_title: str
    description: str
    scale: str

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "topic": "Topic",
        "feature_title": "Feature_title",
        "description": "Description",
        "scale": "Scale",
    }

    portable_text_attributes: ClassVar[list[str]] = []


class Tutorial(SanityDocument):
    """Schema for tutorial documents."""

    title: str
    description: str
    transcript: str | None
    video_url: str

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "description": "description",
        "transcript": "transcript",
        "video_url": "videoUrl",
    }

    portable_text_attributes: ClassVar[list[str]] = ["transcript"]


class PublicProject(SanityDocument):
    """Schema for public project documents."""

    name: str
    introduction: str
    description: str
    videos_list: list[dict[str, Any]] | None
    authors_list: list[dict[str, Any]]

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "name": "name",
        "introduction": "introduction",
        "description": "description",
        "videos_list": "videosList",
        "authors_list": "authorsList",
    }

    portable_text_attributes: ClassVar[list[str]] = ["description"]


class Page(SanityDocument):
    """Schema for page documents."""

    title: str
    introduction: str
    content: str | None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "introduction": "introduction",
        "content": "content",
    }

    portable_text_attributes: ClassVar[list[str]] = ["content"]


SANITY_TYPE_TO_MODEL: dict[str, type[SanityDocument]] = {
    "futureFeaturesItem": FutureFeature,
    "glossaryItem": GlossaryItemDocument,
    "news": NewsDocument,
    "pages": Page,
    "publicProjects": PublicProject,
    "tutorial": Tutorial,
}


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
        # Handle blocks with children (spans)
        if "children" in block:
            text = "".join(child.get("text", "") for child in block.get("children", []))
            if text:
                lines.append(text)
        
        # Handle direct text content
        elif "text" in block:
            lines.append(block["text"])
            
        # Handle string content
        elif isinstance(block.get("content"), str):
            lines.append(block["content"])

        # Recursively handle nested content
        elif "content" in block and isinstance(block["content"], (list, dict)):
            nested_text = flatten_portable_text(block["content"])
            if nested_text:
                lines.append(nested_text)

        # Handle arrays
        elif isinstance(block, list):
            nested_text = flatten_portable_text(block)
            if nested_text:
                lines.append(nested_text)

    return "\n\n".join(filter(None, lines))


def build_base_query(document_type: str, query: str | None = None) -> str:
    """Build the base GROQ query with type filtering and text matching.

    Parameters
    ----------
    document_type : str
        Type of document to query for (e.g., "glossaryItem", "news")
    query : str, optional
        Text to match across all mapped fields, by default None

    Returns
    -------
    str
        Base GROQ query string with type filtering and text matching

    Raises
    ------
    ValueError
        If document_type is not supported
    """
    # Get the corresponding model and its field mapping
    try:
        model = SANITY_TYPE_TO_MODEL[document_type]
    except KeyError:
        raise ValueError(f"Unsupported document type: {document_type}")

    # Base query with type filter
    base_query = f'*[_type == "{document_type}"'

    # Add text matching if query is provided
    if query:
        # Get all mapped fields except id, created_at, updated_at
        searchable_fields = [
            v
            for k, v in model.sanity_mapping.items()
            if k not in ["id", "created_at", "updated_at"]
        ]
        # Build OR conditions for each field
        match_conditions = [f'{field} match "*{query}*"' for field in searchable_fields]
        base_query += f" && ({' || '.join(match_conditions)})"

    # Close filter bracket
    base_query += "]"
    return base_query


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
        Text to match across all mapped fields, by default None

    Returns
    -------
    str
        GROQ query string for Sanity API

    Notes
    -----
    The query includes:
    - Type filtering
    - Optional text matching across all mapped fields
    - Sorting by creation or update date
    - Pagination
    - Field selection based on model's sanity_mapping
    """
    model = SANITY_TYPE_TO_MODEL[document_type]
    base_query = build_base_query(document_type, query)

    # Add sorting
    sort_field = "_createdAt" if sort == "newest" else "_updatedAt"
    sort_order = "desc" if sort == "newest" else "asc"
    base_query += f" | order({sort_field} {sort_order})"

    # Add pagination
    start = (page - 1) * page_size
    base_query += f"[{start}...{start + page_size}]"

    # Convert to GROQ projection syntax using the model's sanity_mapping
    # Always include _type field
    field_selection = ", ".join(
        [f'"{k}": {v}' for k, v in model.sanity_mapping.items()] + ['"_type": _type']
    )
    base_query += f" {{ {field_selection} }}"

    return base_query


def build_count_query(document_type: str, query: str | None = None) -> str:
    """Build a GROQ query to count total matching documents.

    Parameters
    ----------
    document_type : str
        Type of document to count (e.g., "glossaryItem", "news")
    query : str, optional
        Text to match across all mapped fields, by default None

    Returns
    -------
    str
        GROQ count query string for Sanity API

    Notes
    -----
    The count query applies the same filtering as the main query:
    - Type filtering
    - Optional text matching across all mapped fields
    But excludes:
    - Sorting
    - Pagination
    - Field selection
    """
    base_query = build_base_query(document_type, query)
    return f"count({base_query})"


def parse_document(doc: dict[str, Any]) -> SanityDocument:
    """Parse a Sanity document into the appropriate Pydantic model.

    Parameters
    ----------
    doc : dict[str, Any]
        Raw document data from Sanity

    Returns
    -------
    SanityDocument
        Parsed document as the appropriate Pydantic model subclass

    Notes
    -----
    - Automatically detects document type from _type field
    - Handles Portable Text content flattening based on model's portable_text_attributes
    - Maps fields according to model's sanity_mapping
    """
    # Get the appropriate model class based on document type
    doc_type = doc["_type"]
    model_class = SANITY_TYPE_TO_MODEL[doc_type]

    # Process any portable text fields
    processed_doc = doc.copy()
    for field in model_class.portable_text_attributes:
        field_value = doc.get(field)
        if isinstance(field_value, (dict, list)):
            processed_doc[field] = flatten_portable_text(field_value)

    # Create model instance with processed data
    return model_class(**processed_doc)


class OBIExpertInput(BaseModel):
    """Inputs for the OBI Expert tool."""

    document_type: Literal[
        "futureFeaturesItem",
        "glossaryItem",
        "news",
        "pages",
        "publicProjects",
        "tutorial",
    ] = Field(description="Type of documents to retrieve")
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


class OBIExpertOutput(BaseModel):
    """Output schema for the OBI Expert tool."""

    results: (
        list[FutureFeature]
        | list[GlossaryItemDocument]
        | list[NewsDocument]
        | list[Page]
        | list[PublicProject]
        | list[Tutorial]
    )
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

    async def arun(self) -> OBIExpertOutput:
        """Extract documents from Sanity."""
        # Get documents
        results_query = build_query(
            document_type=self.input_schema.document_type,
            page=self.input_schema.page,
            page_size=self.input_schema.page_size,
            sort=self.input_schema.sort,
            query=self.input_schema.query,
        )

        # Get total count
        count_query = build_count_query(
            document_type=self.input_schema.document_type, query=self.input_schema.query
        )

        logger.debug(f"OBI Expert tool query: {results_query}")

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
            parse_document(doc) for doc in results_data.get("result", [])
        ]

        return OBIExpertOutput(
            results=processed_results,  # type: ignore[arg-type]
            total_items=count_data.get("result", 0),
        )
