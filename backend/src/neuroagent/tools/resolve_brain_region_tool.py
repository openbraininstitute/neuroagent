"""Tool to resolve the brain region from natural english to its entitycore ID."""

import asyncio
import logging
from typing import ClassVar

from httpx import AsyncClient
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sklearn.metrics.pairwise import cosine_similarity
from typing_extensions import Self

from neuroagent.schemas import BrainRegions
from neuroagent.tools.base_tool import (
    BaseMetadata,
    BaseTool,
)

logger = logging.getLogger(__name__)


class ResolveBRInput(BaseModel):
    """Defines the input structure for the Resolve Brain Region tool."""

    hierarchy_id: str = Field(
        default="e3e70682-c209-4cac-a29f-6fbed82c07cd",
        description="Id of the brain region hierarchy from which we resolve.",
    )
    brain_region_name: str | None = Field(
        default=None,
        description="Specifies the target brain region NAME provided by the user in natural language.",
    )
    brain_region_acronym: str | None = Field(
        default=None,
        description="Specifies the target brain region ACRONYM provided by the user in natural language.",
    )
    return_size: int = Field(default=10, description="Number of candidates to return")

    @model_validator(mode="after")
    def check_input_exists(self) -> Self:
        """Ensure at least name or acronym is given."""
        if not self.brain_region_name and not self.brain_region_name:
            raise ValueError(
                "Either brain_region_name or brain_region_acronym must be specified."
            )
        return self


class ResolveBRMetadata(BaseMetadata):
    """Metadata for ResolveEntitiesTool."""

    brainregion_embeddings: list[BrainRegions]
    openai_client: AsyncOpenAI


class BRResolveOutput(BaseModel):
    """Output schema for the Brain region resolver."""

    brain_region_name: str
    brain_region_id: str
    model_config = ConfigDict(frozen=True)


class ResolveBrainRegionToolOutput(BaseModel):
    """Output schema for the Resolve Entities tool."""

    brain_regions: list[BRResolveOutput]


class ResolveBrainRegionTool(BaseTool):
    """Class defining the Brain Region Resolving logic."""

    name: ClassVar[str] = "resolve-brain-region-tool"
    name_frontend: ClassVar[str] = "Resolve Brain Region"
    description: ClassVar[str] = (
        """From a brain region name or acronym written in natural english, retrieve its corresponding ID, formatted as UUID."""
    )
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
        try:
            # Get the hierarchy corresponding to the requested one
            hierarchy = next(
                (
                    region
                    for region in self.metadata.brainregion_embeddings
                    if region.hierarchy_id == self.input_schema.hierarchy_id
                )
            )
        except StopIteration:
            raise ValueError("Hierarchy ID not found in existing embeddings.")

        # Prepare embedding tasks for name/acronyms
        embedding_tasks = {}
        if self.input_schema.brain_region_name:
            task = asyncio.create_task(
                self.metadata.openai_client.embeddings.create(
                    input=self.input_schema.brain_region_name,
                    model="text-embedding-3-small",
                )
            )
            embedding_tasks["name"] = task
        if self.input_schema.brain_region_acronym:
            task = asyncio.create_task(
                self.metadata.openai_client.embeddings.create(
                    input=self.input_schema.brain_region_acronym,
                    model="text-embedding-3-small",
                )
            )
            embedding_tasks["acronym"] = task

        # Embed the inputs
        results = await asyncio.gather(*embedding_tasks.values())
        embeddings = {
            key: results[i].data[0].embedding
            for i, key in enumerate(embedding_tasks.keys())
        }

        region_best_scores = {}

        # Process name embeddings if available
        if embeddings.get("name"):
            # Gather name embeddings
            br_name_embeddings = [
                brain_region.name_embedding for brain_region in hierarchy.regions
            ]

            # Compute cosine similarity for names
            input_name_region_name_similarity = cosine_similarity(
                [embeddings.get("name")], br_name_embeddings
            ).squeeze(axis=0)

            # Record the name similarity score for each brain region
            for brain_region, score in zip(
                hierarchy.regions, input_name_region_name_similarity
            ):
                region_best_scores[
                    BRResolveOutput(
                        brain_region_name=brain_region.name,
                        brain_region_id=brain_region.id,
                    )
                ] = score

        # Process acronym embeddings if available
        if embeddings.get("acronym"):
            # Gather acronym embeddings
            br_acronym_embeddings = [
                brain_region.acronym_embedding for brain_region in hierarchy.regions
            ]

            # Compute cosine similarity for acronyms
            input_acronym_region_acronym_similarity = cosine_similarity(
                [embeddings.get("acronym")], br_acronym_embeddings
            ).squeeze(axis=0)

            # Update each brain region's score if the acronym score is higher
            for brain_region, score in zip(
                hierarchy.regions, input_acronym_region_acronym_similarity
            ):
                current_score = region_best_scores.get(brain_region, 0)
                region_best_scores[
                    BRResolveOutput(
                        brain_region_name=brain_region.name,
                        brain_region_id=brain_region.id,
                    )
                ] = max(current_score, score)

        # Sort brain regions by their best score
        top_brain_regions, _ = zip(
            *sorted(region_best_scores.items(), key=lambda x: x[1], reverse=True)
        )

        return ResolveBrainRegionToolOutput(
            brain_regions=top_brain_regions[: self.input_schema.return_size]
        )

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
