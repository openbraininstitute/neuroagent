"""BlueNaaS single cell stimulation, simulation and synapse placement tool."""

import logging
from typing import Any, ClassVar, Literal

from pydantic import BaseModel, Field
from httpx import AsyncClient

from neuroagent.bluenaas_models import PaginatedResponseSimulationDetailsResponse
from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class SCSGetAllMetadata(BaseMetadata):
    """Metadata class for the get all simulations api."""

    token: str
    vlab_id: str
    project_id: str
    bluenaas_url: str


class InputSCSGetAll(BaseModel):
    """Inputs for the BlueNaaS single-neuron simulation."""

    offset: int = Field(default=0, description="Pagination offset")
    page_size: int = Field(
        default=20, description="Number of results returned by the API."
    )
    simulation_type: Literal["single-neuron-simulation", "synaptome-simulation"] = (
        Field(
            default="single-neuron-simulation",
            description="Type of simulation to retrieve.",
        )
    )


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

    async def arun(self) -> dict[str, Any]:
        """Run the SCSGetAll tool."""
        logger.info(
            f"Running SCSGetAll tool with inputs {self.input_schema.model_dump()}"
        )

        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.bluenaas_url}/simulation/single-neuron/{self.metadata.vlab_id}/{self.metadata.project_id}",
            params={
                "simulation_type": self.input_schema.simulation_type,
                "offset": self.input_schema.offset,
                "page_size": self.input_schema.page_size,
            },
            headers={"Authorization": f"Bearer {self.metadata.token}"},
        )

        return PaginatedResponseSimulationDetailsResponse(
            **response.json()
        ).model_dump()

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, bluenaas_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            bluenaas_url,
        )
        return response.status_code == 200
