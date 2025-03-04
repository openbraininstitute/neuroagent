"""BlueNaaS single cell stimulation, simulation and synapse placement tool."""

import logging
from typing import ClassVar, Literal

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.bluenaas_models import (
    PaginatedResponseUnionMEModelResponseSynaptomeModelResponse,
)
from neuroagent.tools.base_tool import AgentsNames, BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class MEModelGetAllMetadata(BaseMetadata):
    """Metadata class for the get all me models api."""

    token: str
    vlab_id: str
    project_id: str
    bluenaas_url: str


class InputMEModelGetAll(BaseModel):
    """Inputs for the BlueNaaS single-neuron simulation."""

    offset: int = Field(default=0, description="Pagination offset")
    page_size: int = Field(
        default=20, description="Number of results returned by the API."
    )
    memodel_type: Literal["single-neuron-simulation", "synaptome-simulation"] = Field(
        default="single-neuron-simulation",
        description="Type of simulation to retrieve.",
    )


class MEModelGetAllTool(BaseTool):
    """Class defining the MEModelGetAll tool."""

    name: ClassVar[str] = "memodelgetall-tool"
    name_frontend: ClassVar[str] = "Get All ME Models"
    description: ClassVar[str] = """Get multiple me models from the user.
    Returns `page_size` ME-models that belong to the user's project.
    If the user requests an ME-model with specific criteria, use this tool
    to retrieve multiple of its ME-models and chose yourself the one(s) that fit the user's request."""
    description_frontend: ClassVar[
        str
    ] = """Browse through available neuron models in your project. This tool helps you:
    • List all your neuron models
    • Find models by type (single-neuron or synaptome)
    • Navigate through multiple models using pagination

    The tool returns a list of models with their metadata and properties."""
    agent: ClassVar[AgentsNames] = AgentsNames.SIMULATION_AGENT
    metadata: MEModelGetAllMetadata
    input_schema: InputMEModelGetAll

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, bluenaas_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            bluenaas_url,
        )
        return response.status_code == 200

    async def arun(self) -> str:
        """Run the MEModelGetAll tool."""
        logger.info(
            f"Running MEModelGetAll tool with inputs {self.input_schema.model_dump()}"
        )

        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.bluenaas_url}/neuron-model/{self.metadata.vlab_id}/{self.metadata.project_id}/me-models",
            params={
                "simulation_type": self.input_schema.memodel_type,
                "offset": self.input_schema.offset,
                "page_size": self.input_schema.page_size,
            },
            headers={"Authorization": f"Bearer {self.metadata.token}"},
        )
        return PaginatedResponseUnionMEModelResponseSynaptomeModelResponse(
            **response.json()
        ).model_dump_json()
