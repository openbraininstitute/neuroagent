"""Get All SimulationExecution tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import Field

from neuroagent.tools.autogenerated_types.entitycore import (
    ListResponseSimulationExecutionRead,
    ReadManySimulationExecutionGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class SimulationExecutionGetAllInput(ReadManySimulationExecutionGetParametersQuery):
    """Inputs for the simulation-execution get all tool."""

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


class SimulationExecutionGetAllTool(BaseTool):
    """Class defining the Get All Simulation Executions logic."""

    name: ClassVar[str] = "entitycore-simulationexecution-getall"
    name_frontend: ClassVar[str] = "Get All Simulation Executions"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve simulation-executions.
    The output is a list of simulation-executions, containing:
    - The simulation execution ID and basic identifiers
    - Core simulation execution information and properties
    - Simulation parameters and configuration
    - Creation and modification timestamps
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve simulation-executions. Use this tool to:
    • Find simulation-executions by various criteria
    • Access detailed simulation-execution data

    Specify optional criteria to find relevant simulation-executions."""
    metadata: EntitycoreMetadata
    input_schema: SimulationExecutionGetAllInput

    async def arun(self) -> ListResponseSimulationExecutionRead:
        """Extract simulation-executions.

        Returns
        -------
            list of simulation-executions and their metadata, or an error dict.
        """
        query_params = self.input_schema.model_dump(exclude_defaults=True, mode="json")
        query_params["page_size"] = self.input_schema.page_size

        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/") + "/simulation-execution",
            headers=headers,
            params=query_params,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The simulation-execution endpoint returned a non 200 response code. Error: {response.text}"
            )

        response_data = response.json()
        return ListResponseSimulationExecutionRead(**response_data)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
