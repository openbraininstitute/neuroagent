"""Get Morpho tool."""

import logging
from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from neuroagent.tools.autogenerated_types.entitycore.models import (
    ListResponseReconstructionMorphologyRead,
    MtypeId,
    WithinBrainRegionBrainRegionId,
    WithinBrainRegionHierarchyId,
)
from neuroagent.tools.autogenerated_types.entitycore.schemas import (
    ReadManyReconstructionMorphologyGetParams,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class GetMorphoInput(BaseModel):
    """Inputs of the knowledge graph API."""

    brain_region_id: str = Field(
        description="ID of the brain region of interest in UUID format. To find the ID use the resolve-brain-region-tool first."
    )
    page_size: int = Field(default=10, description="Number of results per page.")
    page: int = Field(default=1, description="Page number for pagination.")
    mtype_id: str | None = Field(
        default=None,
        description="ID of the M-type of interest. To find the ID use the resolve-mtype-tool first.",
    )


class GetMorphoMetadata(BaseMetadata):
    """Metadata class for GetMorphoTool."""

    httpx_client: AsyncClient
    entitycore_url: str
    vlab_id: str | None
    project_id: str | None


class GetMorphoQueryParams(ReadManyReconstructionMorphologyGetParams):
    """Query parameters for GetMorphoTool with skipped JSON schema for certain fields."""

    virtual_lab_id: SkipJsonSchema[None] = None
    project_id: SkipJsonSchema[None] = None


class GetMorphoTool(BaseTool):
    """Class defining the Get Morpho logic."""

    name: ClassVar[str] = "get-morpho-tool"
    name_frontend: ClassVar[str] = "Morphologies"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve neuron morphology names, IDs and descriptions.
    Requires a 'brain_region_id' which is the ID of the brain region of interest as registered in the knowledge graph.
    Optionally accepts an mtype_id.
    The output is a list of morphologies, containing:
    - The brain region ID.
    - The brain region name.
    - The subject species name.
    - The morphology ID.
    - The morphology name.
    - the morphology description.
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve neuron morphologies. Use this tool to:
    • Find neurons in specific brain regions
    • Search by morphology type
    • Access detailed morphological data

    Specify brain region and optional criteria to find relevant morphologies."""
    metadata: GetMorphoMetadata
    input_schema: GetMorphoInput

    async def arun(self) -> ListResponseReconstructionMorphologyRead:
        """From a brain region ID, extract morphologies.

        Returns
        -------
            list of KnowledgeGraphOutput to describe the morphology and its metadata, or an error dict.
        """
        logger.info(
            f"Entering Get Morpho tool. Inputs: {self.input_schema.model_dump()}"
        )

        query_params = GetMorphoQueryParams(
            page_size=self.input_schema.page_size,
            page=self.input_schema.page,
            within_brain_region_hierarchy_id=WithinBrainRegionHierarchyId(
                root=UUID("e3e70682-c209-4cac-a29f-6fbed82c07cd")
            ),
            within_brain_region_brain_region_id=WithinBrainRegionBrainRegionId(
                root=UUID(self.input_schema.brain_region_id)
            ),
            within_brain_region_ascendants=False,
            mtype__id=MtypeId(root=UUID(self.input_schema.mtype_id))
            if self.input_schema.mtype_id
            else None,
        )

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/") + "/reconstruction-morphology",
            headers={
                **(
                    {"virtual-lab-id": self.metadata.vlab_id}
                    if self.metadata.vlab_id is not None
                    else {}
                ),
                **(
                    {"project-id": self.metadata.project_id}
                    if self.metadata.project_id is not None
                    else {}
                ),
            },
            params=query_params.model_dump(exclude_defaults=True),
        )
        if response.status_code != 200:
            raise ValueError(
                f"The morphology endpoint returned a non 200 response code. Error: {response.text}"
            )
        return ListResponseReconstructionMorphologyRead(**response.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
