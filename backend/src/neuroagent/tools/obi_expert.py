"""OBI Expert tool."""

import asyncio
import logging
from typing import Any, ClassVar, Literal

import httpx
from pydantic import BaseModel, Field, field_validator

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


def flatten_portable_text(blocks: Any) -> Any:
    """In-place function that takes an arbitrary Sanity document and recursively looks for block types.

    When it finds a dict with `_type == "block"`, it flattens the block's children into a single string
    by joining all the `text` fields from the children. This modifies the input data structure in-place.

    This is inspired by https://www.sanity.io/docs/developer-guides/presenting-block-text#ac67a867dd69

    Parameters
    ----------
    blocks : Any
        The Sanity document or data structure to process (can be any type)

    Returns
    -------
    Any
        The processed data structure (modified in-place)
    """
    # Handle None or non-container types - return as is
    if blocks is None or not isinstance(blocks, (list, dict)):
        return blocks

    # Handle list
    if isinstance(blocks, list):
        # Check if the first element is a dict with _type == "block"
        if blocks and isinstance(blocks[0], dict) and blocks[0].get("_type") == "block":
            # All elements are blocks, join them all together
            text_parts = []
            for block in blocks:
                if "children" in block:
                    for child in block["children"]:
                        if isinstance(child, dict) and "text" in child:
                            text_parts.append(child["text"])
            return "".join(text_parts)
        else:
            # Regular list - iterate through all elements and call recursively
            for i, item in enumerate(blocks):
                blocks[i] = flatten_portable_text(item)
            return blocks

    # Handle dict - iterate through all values and call recursively
    if isinstance(blocks, dict):
        for key, value in blocks.items():
            blocks[key] = flatten_portable_text(value)
        return blocks


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


class NewsDocument(SanityDocument):
    """Schema for news documents."""

    title: str | None = None
    category: str | None = None
    content: str | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "category": "category",
        "content": "content",
    }

    @field_validator("content", mode="before")
    @classmethod
    def flatten_content(cls, v: list[dict[str, Any]] | None) -> str | None:
        """Flatten the content from a list of blocks into a single string."""
        # Use the existing flatten_portable_text function to process the content
        flattened = flatten_portable_text(v)

        # If the result is None, return None
        if flattened is None:
            return None

        # If the result is a string, return it directly
        if isinstance(flattened, str):
            return flattened

        # If it's still a list, join all text elements together
        if isinstance(flattened, list):
            text_parts = []
            for item in flattened:
                if isinstance(item, str):
                    text_parts.append(item)
                elif isinstance(item, dict):
                    # Extract text from various block types
                    if "title" in item:
                        text_parts.append(item["title"])
                    elif "text" in item:
                        text_parts.append(item["text"])
                    elif "content" in item and isinstance(item["content"], str):
                        text_parts.append(item["content"])

            return " ".join(text_parts) if text_parts else ""

        # If not a string, raise validation error
        if not isinstance(flattened, str):
            raise ValueError("Content must be a string")
        return flattened


class GlossaryItemDocument(SanityDocument):
    """Schema for glossary item documents."""

    name: str | None = None
    description: str | None = None
    definition: str | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "name": "Name",
        "description": "Description",
        "definition": "definition",
    }

    @field_validator("definition", mode="before")
    @classmethod
    def flatten_definition(cls, v: list[dict[str, Any]] | None) -> str | None:
        """Flatten the definition from portable text blocks into a single string."""
        # Use the existing flatten_portable_text function to process the definition
        flattened = flatten_portable_text(v)

        # If the result is None, return None
        if flattened is None:
            return None

        # The flatten_portable_text function should return a string for portable text
        if isinstance(flattened, str):
            return flattened

        # If not a string, raise validation error
        if not isinstance(flattened, str):
            raise ValueError("Definition must be a string")
        return flattened


class FutureFeature(SanityDocument):
    """Schema for future feature documents."""

    topic: str | None = None
    feature_title: str | None = None
    description: str | None = None
    scale: str | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "topic": "Topic",
        "feature_title": "Feature_title",
        "description": "Description",
        "scale": "Scale",
    }


class Tutorial(SanityDocument):
    """Schema for tutorial documents."""

    title: str | None = None
    description: str | None = None
    transcript: str | None = None
    video_url: str | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "description": "description",
        "transcript": "transcript",
        "video_url": "videoUrl",
    }

    @field_validator("transcript", mode="before")
    @classmethod
    def flatten_transcript(cls, v: list[dict[str, Any]] | None) -> str | None:
        """Flatten the transcript from portable text blocks into a single string."""
        # Use the existing flatten_portable_text function to process the transcript
        flattened = flatten_portable_text(v)

        # If the result is None, return None
        if flattened is None:
            return None

        # The flatten_portable_text function should return a string for portable text
        if isinstance(flattened, str):
            return flattened

        # If not a string, raise validation error
        if not isinstance(flattened, str):
            raise ValueError("Transcript must be a string")
        return flattened


class PublicProject(SanityDocument):
    """Schema for public project documents."""

    name: str | None = None
    introduction: str | None = None
    description: str | None = None
    videos_list: list[dict[str, Any]] | None = None
    authors_list: list[dict[str, Any]] | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "name": "name",
        "introduction": "introduction",
        "description": "description",
        "videos_list": "videosList",
        "authors_list": "authorsList",
    }

    @field_validator("description", mode="before")
    @classmethod
    def flatten_description(cls, v: list[dict[str, Any]] | None) -> str | None:
        """Flatten the description from portable text blocks into a single string."""
        # Use the existing flatten_portable_text function to process the description
        flattened = flatten_portable_text(v)

        # If the result is None, return None
        if flattened is None:
            return None

        # The flatten_portable_text function should return a string for portable text
        if isinstance(flattened, str):
            return flattened

        # If not a string, raise validation error
        if not isinstance(flattened, str):
            raise ValueError("Description must be a string")
        return flattened


# --- PlanV2 nested object types ---


class SubscriptionItem(BaseModel):
    """Schema for subscription items within PlanV2."""

    name: str | None = None
    price: float | None = None
    currency: str | None = None
    has_special_label: bool | None = None
    special_label: str | None = None
    features: list[str] | None = None


class AdvantageItem(BaseModel):
    """Schema for advantage items within PlanV2."""

    title: str | None = None
    tooltip: str | None = None


class BooleanOptionsItem(BaseModel):
    """Schema for boolean options within PlanV2 (general_features, support)."""

    label: str | None = None
    value: bool | None = None


class PlanFeaturesItem(BaseModel):
    """Schema for plan features within PlanV2 (ai_assistant, build, simulate, notebooks)."""

    name: str | None = None
    cost: str | None = None


class CreditsDocument(SanityDocument):
    """Schema for credits documents (additional credit purchases).

    Use this document type when users ask about:
    - Buying additional credits beyond what their plan includes
    - Credit pricing tiers and volume discounts
    - How much credits cost in CHF
    - Price per credit at different quantity levels
    - Bulk credit purchase options

    NOTE: This is DIFFERENT from planV2. planV2 describes subscription plans
    (Free, Pro, Education, Enterprise) that include a certain number of credits
    per month as part of the subscription. Credits documents describe purchasing
    ADDITIONAL credits on top of the plan allowance, priced in CHF with volume
    discounts.
    """

    quantity: str | None = None
    discount: float | None = None
    price: float | None = None
    price_per_credit: float | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "quantity": "quantity",
        "discount": "discount",
        "price": "price",
        "price_per_credit": "pricePerCredit",
    }


class PlanV2Document(SanityDocument):
    """Schema for planV2 documents (subscription plans).

    Use this document type when users ask about:
    - Subscription plans and plan tiers (Free, Pro, Education, Enterprise)
    - Plan features and comparisons between tiers
    - Monthly vs yearly subscription pricing
    - What's included in Free vs Pro plans
    - Credits included per month with each plan
    - AI assistant, Build, Simulate, Notebooks features per plan
    - Support options per plan

    NOTE: This is DIFFERENT from credits. PlanV2 describes subscription plans
    that include a certain number of credits per month. For purchasing ADDITIONAL
    credits beyond the plan allowance (priced in CHF with volume discounts),
    use the credits document type instead.
    """

    name: str | None = None
    has_subtitle: bool | None = None
    subtitle: str | None = None
    custom_plan: bool | None = None
    has_contact_button: bool | None = None
    has_subscription: bool | None = None
    monthly_subscriptions: list[SubscriptionItem] | None = None
    yearly_subscriptions: list[SubscriptionItem] | None = None
    advantages: list[AdvantageItem] | None = None
    general_features: list[BooleanOptionsItem] | None = None
    ai_assistant_features: list[PlanFeaturesItem] | None = None
    build_features: list[PlanFeaturesItem] | None = None
    simulate_features: list[PlanFeaturesItem] | None = None
    notebooks_features: list[PlanFeaturesItem] | None = None
    support: list[BooleanOptionsItem] | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "name": "name",
        "has_subtitle": "has_subtitle",
        "subtitle": "subtitle",
        "custom_plan": "custom_plan",
        "has_contact_button": "has_contact_button",
        "has_subscription": "has_subscription",
        "monthly_subscriptions": "monthly_subscriptions",
        "yearly_subscriptions": "yearly_subscriptions",
        "advantages": "advantages",
        "general_features": "general_features",
        "ai_assistant_features": "ai_assistant_features",
        "build_features": "build_features",
        "simulate_features": "simulate_features",
        "notebooks_features": "notebooks_features",
        "support": "support",
    }


class Page(SanityDocument):
    """Schema for page documents."""

    title: str | None = None
    introduction: str | None = None
    content: str | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "introduction": "introduction",
        "content": "content",
    }

    @field_validator("content", mode="before")
    @classmethod
    def flatten_content(cls, v: list[dict[str, Any]] | None) -> str | None:
        """Flatten the content from various block types into a single string."""
        # Use the existing flatten_portable_text function to process the content
        flattened = flatten_portable_text(v)

        # If the result is None, return None
        if flattened is None:
            return None

        # If the result is a string, return it directly
        if isinstance(flattened, str):
            return flattened

        # If it's still a list, process it manually
        if isinstance(flattened, list):
            text_parts = []

            for block in flattened:
                if not isinstance(block, dict):
                    continue

                block_type = block.get("_type")

                if block_type == "titleHeadline":
                    # Extract title from titleHeadline blocks
                    if "title" in block:
                        text_parts.append(block["title"])

                elif block_type == "richContent":
                    # Extract text from richContent blocks
                    if "content" in block and isinstance(block["content"], list):
                        for content_block in block["content"]:
                            if (
                                isinstance(content_block, dict)
                                and content_block.get("_type") == "block"
                            ):
                                if "children" in content_block:
                                    for child in content_block["children"]:
                                        if isinstance(child, dict) and "text" in child:
                                            text_parts.append(child["text"])

                elif block_type == "previewBlock":
                    # Extract title and text from previewBlock
                    if "title" in block:
                        text_parts.append(block["title"])
                    if "text" in block and isinstance(block["text"], list):
                        for text_block in block["text"]:
                            if (
                                isinstance(text_block, dict)
                                and text_block.get("_type") == "block"
                            ):
                                if "children" in text_block:
                                    for child in text_block["children"]:
                                        if isinstance(child, dict) and "text" in child:
                                            text_parts.append(child["text"])

                elif block_type == "bulletList":
                    # Extract content from bulletList items
                    if "content" in block and isinstance(block["content"], list):
                        for bullet_item in block["content"]:
                            if isinstance(bullet_item, dict):
                                if "title" in bullet_item:
                                    text_parts.append(bullet_item["title"])
                                if "content" in bullet_item:
                                    text_parts.append(bullet_item["content"])

                elif block_type == "video":
                    # Extract caption and timestamp descriptions from video blocks
                    if "caption" in block:
                        text_parts.append(block["caption"])
                    if "timestamps" in block and isinstance(block["timestamps"], list):
                        for timestamp in block["timestamps"]:
                            if isinstance(timestamp, dict):
                                if "label" in timestamp:
                                    text_parts.append(timestamp["label"])
                                if "description" in timestamp:
                                    text_parts.append(timestamp["description"])

                elif block_type == "section":
                    # Extract name from section blocks
                    if "name" in block:
                        text_parts.append(block["name"])

                # For any other block types, try to extract common text fields
                else:
                    for key in ["title", "text", "content", "description", "caption"]:
                        if key in block:
                            value = block[key]
                            if isinstance(value, str):
                                text_parts.append(value)
                            elif isinstance(value, list):
                                # Handle nested lists (like in richContent)
                                for item in value:
                                    if isinstance(item, dict) and "text" in item:
                                        text_parts.append(item["text"])

            return " ".join(text_parts) if text_parts else ""

        # If not a string, raise validation error
        if not isinstance(flattened, str):
            raise ValueError("Content must be a string")
        return flattened


PRODUCT_VALUES = Literal[
    "explore",
    "single-cell-simulation",
    "circuit-simulation",
    "launch-notebook",
    "contribute-and-fix-data",
    "build-ion-channel-model",
    "paired-neuron-simulation",
    "neuron-skeletonization",
    "virtual-labs",
]


class DocumentationProduct(SanityDocument):
    """Schema for documentationProduct documents (obi-website staging).

    Document type with: title, slug, product, filePath, content (Portable Text),
    contentHash, uploadDate. Product is one of the PRODUCT_VALUES.
    """

    title: str | None = None
    slug: str | None = None
    product: str | None = None
    file_path: str | None = None
    content: str | None = None
    content_hash: str | None = None
    upload_date: str | None = None

    sanity_mapping: ClassVar[dict[str, str]] = {
        **SanityDocument.sanity_mapping,
        "title": "title",
        "slug": "slug",
        "product": "product",
        "file_path": "filePath",
        "content": "content",
        "content_hash": "contentHash",
        "upload_date": "uploadDate",
    }

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, v: Any) -> str | None:
        """Extract slug string from Sanity slug object { current: '...' } or use as-is if already str."""
        if v is None:
            return None
        if isinstance(v, str):
            return v
        if isinstance(v, dict) and "current" in v:
            return v["current"]
        return str(v) if v else None

    @field_validator("content", mode="before")
    @classmethod
    def flatten_content(cls, v: list[dict[str, Any]] | None) -> str | None:
        """Flatten the content from Portable Text blocks into a single string."""
        flattened = flatten_portable_text(v)
        if flattened is None:
            return None
        if isinstance(flattened, str):
            return flattened
        if isinstance(flattened, list):
            text_parts = []
            for item in flattened:
                if isinstance(item, str):
                    text_parts.append(item)
                elif isinstance(item, dict):
                    if "title" in item:
                        text_parts.append(item["title"])
                    elif "text" in item:
                        text_parts.append(item["text"])
                    elif "content" in item and isinstance(item["content"], str):
                        text_parts.append(item["content"])
            return " ".join(text_parts) if text_parts else ""
        if not isinstance(flattened, str):
            raise ValueError("Content must be a string")
        return flattened


SANITY_TYPE_TO_MODEL: dict[str, type[SanityDocument]] = {
    "credits": CreditsDocument,
    "documentationProduct": DocumentationProduct,
    "futureFeaturesItem": FutureFeature,
    "glossaryItem": GlossaryItemDocument,
    "news": NewsDocument,
    "pages": Page,
    "planV2": PlanV2Document,
    "publicProjects": PublicProject,
    "tutorial": Tutorial,
}


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
        # Note: The match operator is case-insensitive by default in GROQ
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
    sort_field = "_createdAt"
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
    - Maps fields according to model's sanity_mapping
    - Content flattening is handled by field validators in the model classes
    """
    # Get the appropriate model class based on document type
    doc_type = doc["_type"]
    model_class = SANITY_TYPE_TO_MODEL[doc_type]

    # Create model instance - field validators will handle content processing
    return model_class(**doc)


class OBIExpertInput(BaseModel):
    """Inputs for the OBI Expert tool."""

    document_type: Literal[
        "credits",
        "documentationProduct",
        "futureFeaturesItem",
        "glossaryItem",
        "news",
        "pages",
        "planV2",
        "publicProjects",
        "tutorial",
    ] = Field(description="Type of documents to retrieve")
    page: int = Field(
        default=1, ge=1, description="Page number to retrieve (1-based index)"
    )
    page_size: int = Field(
        default=5, ge=1, le=10, description="Number of documents to retrieve per page"
    )
    sort: Literal["newest", "oldest"] = Field(
        default="newest", description="Sort order of the documents"
    )
    query: str | None = Field(
        default=None,
        description="Optional single word to match in title or content. Use whenever you want to narrow down the results.",
        pattern=r"^[a-zA-Z0-9_-]+$",
    )


class OBIExpertMetadata(BaseMetadata):
    """Metadata for the OBI Expert tool."""

    sanity_url: str


class OBIExpertOutput(BaseModel):
    """Output schema for the OBI Expert tool."""

    results: (
        list[CreditsDocument]
        | list[DocumentationProduct]
        | list[FutureFeature]
        | list[GlossaryItemDocument]
        | list[NewsDocument]
        | list[Page]
        | list[PlanV2Document]
        | list[PublicProject]
        | list[Tutorial]
    )
    total_items: int


class OBIExpertTool(BaseTool):
    """OBI Expert tool for retrieving documents from the OBI Sanity API."""

    name: ClassVar[str] = "obi-expert"
    name_frontend: ClassVar[str] = "OBI Expert"
    utterances: ClassVar[list[str]] = [
        "Any updates about features?",
        "Define synaptic plasticity",
        "How can I simulate on the platform ?",
        "How do I build a model?",
        "How do I contact support?",
        "How do I simulate?",
        "How much does it cost?",
        "Show me example projects",
        "Show me planned improvements",
        "Show me recent announcements",
        "Show me tutorials for beginners",
        "What can I do with this platform?",
        "What does ME model mean?",
        "What features are coming soon?",
        "What is a brain region?",
        "What is this platform about?",
        "What research projects are available?",
        "What's new in the platform?",
        "When will brain region simulation be available?",
        "Where can I learn about the platform?",
        # Pricing-related utterances (use document_type: "planV2")
        "What are your pricing plans?",
        "How much does a subscription cost?",
        "What's the difference between Free and Pro?",
        "What features are included in each plan?",
        "Do you have monthly or yearly pricing?",
        "What's included in the Pro plan?",
        "Is there a free tier?",
        "Compare your subscription options",
        "What AI assistant features come with each plan?",
        "How much does simulation cost per plan?",
        "What support options do I get with Pro?",
        "Tell me about your pricing tiers",
        "What are the plan advantages?",
        # Credits purchase utterances (use document_type: "credits")
        "How much do additional credits cost?",
        "What are the credit pricing tiers?",
        "Can I buy more credits?",
        "What volume discounts are available for credits?",
        "How much is the price per credit?",
        "What's the bulk pricing for credits?",
        "I need to buy extra credits",
        "Show me the credit packages",
    ]
    description: ClassVar[
        str
    ] = """Search and retrieve documents from the OBI Sanity API.

    IMPORTANT:
    - Use the 'query' parameter when you can identify a clear keyword to search for (e.g., "neuron", "simulation", "tutorial"). The search is case-insensitive.
    - Results are paginated. If you don't find what you're looking for on the first page, try:
      * Dropping the query parameter to see all results, or
      * Increasing the page number to see more results
      * Adjusting the query keyword if it's too specific

    Use this tool to:

    1. Find News Articles (document_type: "news")
       - Access platform news and announcements
       - Browse articles by category
       - Get latest updates and content

    2. Search Glossary Terms (document_type: "glossaryItem")
       - Look up technical terms and definitions
       - Find explanations of platform concepts
       - Access detailed term descriptions

    3. Explore Future Features (document_type: "futureFeaturesItem")
       - Learn about upcoming platform capabilities
       - View planned improvements by topic
       - Track feature development progress

    4. Access Tutorials (document_type: "tutorial")
       - Find educational content and guides
       - Get video-based learning materials
       - Access tutorial transcripts when available

    5. Browse Public Projects (document_type: "publicProjects")
       - View showcase research projects
       - Access project documentation and videos
       - See project contributors and authors

    6. Product Documentation (document_type: "documentationProduct")
       - Access product-specific docs (Explore, Single Cell Simulation, Circuit Simulation, etc.)
       - Find guides by product (e.g. launch-notebook, virtual-labs, neuron-skeletonization)
       - Content is Portable Text with title, slug, product, filePath, contentHash, uploadDate

    7. Read Static Pages (document_type: "pages")
       - Access platform information (About, Mission, Team)
       - View legal documents (Privacy Policy, Terms)
       - Find product information (Pricing, Resources)
       - Get support information (Contact)

    8. Subscription Plans (document_type: "planV2")
       - Get detailed information about subscription plan tiers (Free, Pro, Education, Enterprise)
       - Each plan includes a certain number of credits per month as part of the subscription
       - Compare plan features, monthly vs yearly pricing, and what's included
       - Access plan advantages and highlights
       - See feature breakdowns by category:
         * General features (what's included/excluded per plan)
         * AI assistant features with costs
         * Build features with costs
         * Simulate features with costs
         * Notebooks features with costs
         * Support options per plan
       - Example user questions that should use this document type:
         * "What are your pricing plans?"
         * "How much does a Pro subscription cost?"
         * "What's the difference between Free and Pro?"
         * "What features are included in each plan?"
         * "Do you offer monthly or yearly billing?"
         * "What AI assistant features come with Pro?"
       - NOTE: For buying additional credits beyond the plan allowance, use "credits" instead.

    9. Additional Credit Purchases (document_type: "credits")
       - Browse available credit purchase tiers with volume-based pricing in CHF
       - Each tier shows: quantity range, total price, price per credit, and discount percentage
       - Use this when users want to buy ADDITIONAL credits on top of what their subscription plan provides
       - Example tiers: 1-499 credits at CHF 0.10/credit, 50000+ credits at CHF 0.07/credit (30% discount)
       - Example user questions that should use this document type:
         * "How much do additional credits cost?"
         * "What volume discounts are available for credits?"
         * "Can I buy more credits?"
         * "What's the price per credit?"
         * "Show me the credit packages"
       - NOTE: For subscription plans that include monthly credits, use "planV2" instead.
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
