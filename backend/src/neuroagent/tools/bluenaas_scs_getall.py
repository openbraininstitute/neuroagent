"""BlueNaaS single cell stimulation, simulation and synapse placement tool."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from pydantic.json_schema import SkipJsonSchema

from neuroagent.tools.autogenerated_types.bluenaas.models import (
    PaginatedResponseSimulationDetailsResponse,
)
from neuroagent.tools.autogenerated_types.bluenaas.schemas import (
    GetAllSimulationsForProjectApiBluenaasSimulationSingleNeuronVirtualLabIdProjectIdGetParams,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class InputSCSGetAll(
    GetAllSimulationsForProjectApiBluenaasSimulationSingleNeuronVirtualLabIdProjectIdGetParams
):
    """Inputs for the BlueNaaS single-neuron simulation."""

    virtual_lab_id: SkipJsonSchema[str] = "placeholder"
    project_id: SkipJsonSchema[str] = "placeholder"


class SCSGetAllMetadata(BaseMetadata):
    """Metadata class for the get all simulations api."""

    httpx_client: AsyncClient
    vlab_id: str
    project_id: str
    bluenaas_url: str


class SCSGetAllToolOutput(PaginatedResponseSimulationDetailsResponse):
    """Rebranding."""


class SCSGetAllTool(BaseTool):
    """Class defining the SCSGetAll tool."""

    name: ClassVar[str] = "scsgetall-tool"
    name_frontend: ClassVar[str] = "Get All Single-Neuron Simulations"
    description: ClassVar[
        str
    ] = """Retrieve `page_size` simulations' metadata from a user's project.
    If the user requests a simulation with specific criteria, use this tool
    to retrieve multiple of its simulations and chose yourself the one(s) that fit the user's request."""
    description_frontend: ClassVar[
        str
    ] = """View all your single-neuron simulations. This tool allows you to:
    • List all your simulation runs
    • Filter simulations by type
    • Browse through simulation results using pagination

    Returns a list of simulations with their status and metadata."""
    metadata: SCSGetAllMetadata
    input_schema: InputSCSGetAll

    async def arun(self) -> SCSGetAllToolOutput:
        """Run the SCSGetAll tool."""
        logger.info(
            f"Running SCSGetAll tool with inputs {self.input_schema.model_dump()}"
        )

        params = GetAllSimulationsForProjectApiBluenaasSimulationSingleNeuronVirtualLabIdProjectIdGetParams(
            virtual_lab_id=self.metadata.vlab_id,
            project_id=self.metadata.project_id,
            simulation_type=self.input_schema.simulation_type,
            offset=self.input_schema.offset,
            page_size=self.input_schema.page_size,
            created_at_start=self.input_schema.created_at_start,
            created_at_end=self.input_schema.created_at_end,
        )

        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.bluenaas_url}/simulation/single-neuron/{params.virtual_lab_id}/{params.project_id}",
            params=params.model_dump(
                exclude_defaults=True, exclude={"virtual_lab_id", "project_id"}
            ),
        )

        return SCSGetAllToolOutput(**response.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, bluenaas_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            bluenaas_url,
        )
        return response.status_code == 200
