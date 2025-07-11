"""Get All SingleNeuronSynaptomeSimulation tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from neuroagent.tools.autogenerated_types.entitycore import (
    ListResponseSingleNeuronSynaptomeSimulationRead,
    ReadManySingleNeuronSynaptomeSimulationGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class SingleNeuronSynaptomeSimulationGetAllInput(
    ReadManySingleNeuronSynaptomeSimulationGetParametersQuery
):
    """Inputs for the single-neuron-synaptome-simulation get all tool."""

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


class SingleNeuronSynaptomeSimulationGetAllTool(BaseTool):
    """Class defining the Get All Single Neuron Synaptome Simulations logic."""

    name: ClassVar[str] = "entitycore-singleneuronsynaptomesimulation-getall"
    name_frontend: ClassVar[str] = "Get All Single Neuron Synaptome Simulations"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve single-neuron-synaptome-simulations.
    The output is a list of single-neuron-synaptome-simulations, containing:
    - The single neuron synaptome simulation ID and basic identifiers
    - Core single neuron synaptome simulation information and properties
    - Simulation parameters and configuration
    - Creation and modification timestamps
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve single-neuron-synaptome-simulations. Use this tool to:
    • Find single-neuron-synaptome-simulations by various criteria
    • Access detailed single-neuron-synaptome-simulation data

    Specify optional criteria to find relevant single-neuron-synaptome-simulations."""
    metadata: EntitycoreMetadata
    input_schema: SingleNeuronSynaptomeSimulationGetAllInput

    async def arun(self) -> ListResponseSingleNeuronSynaptomeSimulationRead:
        """Extract single-neuron-synaptome-simulations.

        Returns
        -------
            list of single-neuron-synaptome-simulations and their metadata, or an error dict.
        """
        query_params = self.input_schema.model_dump(exclude_defaults=True, mode="json")
        query_params["page_size"] = self.input_schema.page_size

        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/")
            + "/single-neuron-synaptome-simulation",
            headers=headers,
            params=query_params,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The single-neuron-synaptome-simulation endpoint returned a non 200 response code. Error: {response.text}"
            )

        response_data = response.json()
        for simulation in response_data["data"]:
            simulation["assets"] = []
        return ListResponseSingleNeuronSynaptomeSimulationRead(**response_data)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
