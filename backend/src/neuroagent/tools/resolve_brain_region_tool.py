"""Tool to resolve the brain region from natural english to its entitycore ID."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field
from sklearn.metrics.pairwise import cosine_similarity

from neuroagent.schemas import BrainRegions
from neuroagent.tools.base_tool import (
    BaseMetadata,
    BaseTool,
)

logger = logging.getLogger(__name__)


class ResolveBRInput(BaseModel):
    """Defines the input structure for the Resolve Brain Region tool."""

    brain_region_name: str = Field(
        description="Specifies the target brain region NAME provided by the user in natural language.",
    )
    hierarchy_id: str = Field(
        default="e3e70682-c209-4cac-a29f-6fbed82c07cd",
        description="Id of the brain region hierarchy from which we resolve.",
    )
    number_of_candidates: int = Field(
        default=10, description="Number of candidate brain regions to return."
    )


class ResolveBRMetadata(BaseMetadata):
    """Metadata for ResolveEntitiesTool."""

    brainregion_embeddings: list[BrainRegions]
    openai_client: AsyncOpenAI


class BRResolveOutput(BaseModel):
    """Output schema for the Brain region resolver."""

    id: str
    name: str
    acronym: str
    score: float
    model_config = ConfigDict(frozen=True)


class ResolveBrainRegionToolOutput(BaseModel):
    """Output schema for the Resolve Entities tool."""

    brain_regions: list[BRResolveOutput]


class ResolveBrainRegionTool(BaseTool):
    """Class defining the Brain Region Resolving logic."""

    name: ClassVar[str] = "resolve-brain-region-tool"
    name_frontend: ClassVar[str] = "Resolve Brain Region"
    description: ClassVar[
        str
    ] = """Resolve a brain region's name or acronym to its UUID using semantic search.
        Accepts natural language inputs containing the full or partial name, acronym, or both."""
    description_frontend: ClassVar[str] = (
        """Converts natural language brain region to its ID."""
    )
    metadata: ResolveBRMetadata
    input_schema: ResolveBRInput

    async def arun(
        self,
    ) -> ResolveBrainRegionToolOutput:
        """Given a brain region in natural language, resolve its ID."""
        logger.info(
            f"Entering Brain Region resolver tool. Inputs: {self.input_schema.model_dump()}"
        )
        # First we select the correct hierarchy with pre-computed embeddings
        try:
            hierarchy = next(
                (
                    region
                    for region in self.metadata.brainregion_embeddings
                    if region.hierarchy_id == self.input_schema.hierarchy_id
                )
            )
        except StopIteration:
            raise ValueError("Hierarchy ID not found in existing embeddings.")

        # Try name or acronym exact match before anything
        try:
            return next(
                ResolveBrainRegionToolOutput(
                    brain_regions=[
                        BRResolveOutput(
                            id=region.id,
                            name=region.name,
                            acronym=region.acronym,
                            score=1,
                        )
                    ]
                )
                for region in hierarchy.regions
                if region.name.lower() == self.input_schema.brain_region_name.lower()
                or region.acronym.lower() == self.input_schema.brain_region_name.lower()
            )
        except StopIteration:
            pass

        # If exact match didn't work we perform semantic search
        response = await self.metadata.openai_client.embeddings.create(
            input=self.input_schema.brain_region_name,
            model="text-embedding-3-small",
        )
        name_embedding = response.data[0].embedding

        # Gather pre-computed name embeddings
        br_name_embeddings = [
            brain_region.name_embedding for brain_region in hierarchy.regions
        ]
        # Gather pre-computed acronym embeddings
        br_acronym_embeddings = [
            brain_region.acronym_embedding for brain_region in hierarchy.regions
        ]

        # Compute cosine similarity for names
        input_name_region_name_similarity = cosine_similarity(
            [name_embedding], br_name_embeddings
        ).squeeze(axis=0)
        # Compute cosine similarity for acronyms
        input_acronym_region_acronym_similarity = cosine_similarity(
            [name_embedding], br_acronym_embeddings
        ).squeeze(axis=0)

        # Assign best score to each brain region and prepare for output.
        scored_regions = [
            BRResolveOutput(
                id=brain_region.id,
                name=brain_region.name,
                acronym=brain_region.acronym,
                score=max(name_score, acronym_score),
            )
            for brain_region, name_score, acronym_score in zip(
                hierarchy.regions,
                input_name_region_name_similarity,
                input_acronym_region_acronym_similarity,
            )
        ]

        # Sort brain regions by their best score
        top_brain_regions = sorted(scored_regions, key=lambda x: x.score, reverse=True)
        breakpoint()
        return ResolveBrainRegionToolOutput(
            brain_regions=top_brain_regions[: self.input_schema.number_of_candidates]
        )

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
