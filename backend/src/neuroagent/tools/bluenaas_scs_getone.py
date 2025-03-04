"""BlueNaaS single cell stimulation, simulation and synapse placement tool."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.bluenaas_models import SimulationDetailsResponse
from neuroagent.tools.base_tool import AgentsNames, BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class SCSGetOneMetadata(BaseMetadata):
    """Metadata class for the get all simulations api."""

    token: str
    vlab_id: str
    project_id: str
    bluenaas_url: str


class InputSCSGetOne(BaseModel):
    """Inputs for the BlueNaaS single-neuron simulation."""

    simulation_id: str = Field(
        description="ID of the simulation to retrieve. Should be an https link."
    )


class SCSGetOneTool(BaseTool):
    """Class defining the SCSGetOne tool."""

    name: ClassVar[str] = "scsgetone-tool"
    name_frontend: ClassVar[str] = "Get Single-Neuron Simulation"
    description: ClassVar[
        str
    ] = """Get one specific simulations from a user based on its id. .
    The id can be retrieved using the 'scs-getall-tool', from the simulation report of `scs-post-tool` or directly specified by the user.
    This tool gets all the information about the simulation, a lot more than `scs-getall-tool`."""
    description_frontend: ClassVar[
        str
    ] = """Access detailed results of a specific simulation. Use this to:
    • View complete simulation results
    • Access simulation parameters
    • Check simulation status and outputs

    Provide the simulation ID to get its detailed information."""
    agent: ClassVar[AgentsNames] = AgentsNames.SIMULATION_AGENT
    metadata: SCSGetOneMetadata
    input_schema: InputSCSGetOne

    async def arun(self) -> str:
        """Run the SCSGetOne tool."""
        logger.info(
            f"Running SCSGetOne tool with inputs {self.input_schema.model_dump()}"
        )

        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.bluenaas_url}/simulation/single-neuron/{self.metadata.vlab_id}/{self.metadata.project_id}/{self.input_schema.simulation_id}",
            headers={"Authorization": f"Bearer {self.metadata.token}"},
        )
        # Truncate the results.
        result = response.json()
        for key in result["results"].keys():
            for el in result["results"][key]:
                el.pop("x", None)
                el.pop("y", None)

        return SimulationDetailsResponse(**result).model_dump_json()

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, bluenaas_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            bluenaas_url,
        )
        return response.status_code == 200
