"""Tool to resolve m-types to entitycore ID."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sklearn.metrics.pairwise import cosine_similarity

from neuroagent.schemas import EmbeddedMTypes
from neuroagent.tools.base_tool import (
    BaseMetadata,
    BaseTool,
)

logger = logging.getLogger(__name__)


class ResolveMtypeInput(BaseModel):
    """Defines the input structure for the m-types resolving tool."""

    mtype_pref_label: str = Field(
        description="Specifies the target M-type (Morphological type) as provided by the user in natural language.",
    )
    number_of_candidates: int = Field(
        default=10, description="Number of candidate mtypes to return."
    )


class ResolveMtypeMetadata(BaseMetadata):
    """Metadata for ResolveEntitiesTool."""

    mtype_embeddings: EmbeddedMTypes
    openai_client: AsyncOpenAI


class MType(BaseModel):
    """Output schema for the Mtype resolver."""

    mtype_pref_label: str
    mtype_id: str
    score: float


class ResolveMtypeOutput(BaseModel):
    """Output schema for the Resolve Entities tool."""

    mtypes: list[MType]


class ResolveMtypeTool(BaseTool):
    """Class defining the m-types Resolving logic."""

    name: ClassVar[str] = "resolve-mtype-tool"
    name_frontend: ClassVar[str] = "Resolve m-types"
    description: ClassVar[
        str
    ] = """Resolve the mtype pref label from natural english to its corresponding ID (formated ad UUID) using semantic search.
        Accepts natural language inputs containing the full or partial name. If no exact match is found, returns the best scored candidates."""
    description_frontend: ClassVar[str] = (
        """Convert natural language m-type to its ID."""
    )
    metadata: ResolveMtypeMetadata
    input_schema: ResolveMtypeInput

    async def arun(
        self,
    ) -> ResolveMtypeOutput:
        """Given a brain region in natural language, resolve its ID."""
        logger.info(
            f"Entering Brain Region resolver tool. Inputs: "
            f"{self.input_schema.mtype_pref_label=}"
        )

        # Try exact match first
        try:
            return next(
                ResolveMtypeOutput(
                    mtypes=[
                        MType(
                            mtype_pref_label=mtype.pref_label,
                            mtype_id=mtype.id,
                            score=1,
                        )
                    ]
                )
                for mtype in self.metadata.mtype_embeddings.mtypes
                if mtype.pref_label.lower()
                == self.input_schema.mtype_pref_label.lower()
            )
        except StopIteration:
            pass

        # If exact match didn't work we perform semantic search
        response = await self.metadata.openai_client.embeddings.create(
            input=self.input_schema.mtype_pref_label,
            model="text-embedding-3-small",
        )
        name_embedding = response.data[0].embedding

        # Gather pre-computed name embeddings
        mtype_name_embeddings = [
            mtype.pref_label_embedding
            for mtype in self.metadata.mtype_embeddings.mtypes
        ]

        # Compute cosine similarity
        input_name_region_name_similarity = cosine_similarity(
            [name_embedding], mtype_name_embeddings
        ).squeeze(axis=0)

        # Assign score to each brain region and prepare for output.
        scored_mtypes = [
            MType(mtype_id=mtype.id, mtype_pref_label=mtype.pref_label, score=score)
            for mtype, score in zip(
                self.metadata.mtype_embeddings.mtypes,
                input_name_region_name_similarity,
            )
        ]

        # Sort brain regions by their score
        top_mtypes = sorted(scored_mtypes, key=lambda x: x.score, reverse=True)

        return ResolveMtypeOutput(
            mtypes=top_mtypes[: self.input_schema.number_of_candidates]
        )

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        return True
