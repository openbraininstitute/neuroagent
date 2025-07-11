"""Get All Reconstruction Morphologies tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from neuroagent.tools.autogenerated_types.entitycore import (
    ListResponseReconstructionMorphologyRead,
    ReadManyReconstructionMorphologyGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class ReconstructionMorphologyGetAllInput(
    ReadManyReconstructionMorphologyGetParametersQuery
):
    """Inputs for the reconstruction morphology get all tool."""

    brain_region__id: SkipJsonSchema[None] = Field(default=None, exclude=True)
    brain_region__id__in: SkipJsonSchema[None] = Field(default=None, exclude=True)
    within_brain_region_hierarchy_id: UUID | None = Field(
        default=UUID("e3e70682-c209-4cac-a29f-6fbed82c07cd"),
        description="The hierarchy ID for brain regions. The default value is the most commonly used hierarchy ID.",
    )
    within_brain_region_brain_region_id: UUID | None = Field(
        default=None,
        description="ID of the brain region of interest in UUID format.",
    )
    page_size: int = Field(
        ge=1,
        le=10,
        default=5,
        description="Number of items per page",
    )


class ReconstructionMorphologyGetAllTool(BaseTool):
    """Class defining the Get All Reconstruction Morphology logic."""

    name: ClassVar[str] = "entitycore-reconstructionmorphology-getall"
    name_frontend: ClassVar[str] = "Get All Reconstruction Morphologies"
    description: ClassVar[
        str
    ] = """Searches the entitycore database to retrieve reconstruction morphologies.
    The output is a list of reconstruction morphologies, containing:
    - The brain region ID.
    - The brain region name.
    - The subject species name.
    - The reconstruction morphology ID.
    - The reconstruction morphology name.
    - The reconstruction morphology description.
    - The measurements.
    - The mtypes.
    - Any additional metadata.

    We explicitly exclude the legacy_id but you can access it using the `entitycore-reconstructionmorphology-getone` tool.
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve reconstruction morphologies. Use this tool to:
    • Find morphologies in specific brain regions
    • Filter by subject and species
    • Access detailed morphology data

    Specify brain region and optional criteria to find relevant morphologies."""
    metadata: EntitycoreMetadata
    input_schema: ReconstructionMorphologyGetAllInput

    async def arun(self) -> ListResponseReconstructionMorphologyRead:
        """From a brain region ID, extract morphologies.

        Returns
        -------
            ListResponseReconstructionMorphologyRead describing the morphology and its metadata.
        """
        query_params = self.input_schema.model_dump(exclude_defaults=True, mode="json")
        query_params["page_size"] = self.input_schema.page_size
        query_params["within_brain_region_hierarchy_id"] = (
            self.input_schema.within_brain_region_hierarchy_id
        )

        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/") + "/reconstruction-morphology",
            headers=headers,
            params=query_params,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The morphology endpoint returned a non 200 response code. Error: {response.text}"
            )

        response_data = response.json()
        # Set assets and legacy_id to empty lists for each morphology
        for morphology in response_data["data"]:
            morphology["assets"] = []
            morphology["legacy_id"] = []

        return ListResponseReconstructionMorphologyRead(**response_data)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
