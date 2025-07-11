"""Get All Experimental Synapses Per Connection tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from neuroagent.tools.autogenerated_types.entitycore import (
    ListResponseExperimentalSynapsesPerConnectionRead,
    ReadManyExperimentalSynapsesPerConnectionGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class ExperimentalSynapsesPerConnectionGetAllInput(
    ReadManyExperimentalSynapsesPerConnectionGetParametersQuery
):
    """Inputs for the experimental synapses per connection get all tool."""

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


class ExperimentalSynapsesPerConnectionGetAllTool(BaseTool):
    """Class defining the Get All Experimental Synapses Per Connection logic."""

    name: ClassVar[str] = "entitycore-experimentalsynapsesperconnection-getall"
    name_frontend: ClassVar[str] = "Get All Experimental Synapses Per Connection"
    description: ClassVar[
        str
    ] = """Searches the entitycore database to retrieve experimental synapses per connection.
    The output is a list of experimental synapses per connection, containing:
    - The brain region ID.
    - The brain region name.
    - The subject species name.
    - The synapses per connection ID.
    - The synapses per connection name.
    - The synapses per connection description.
    - The measurements.
    - The pre and post mtypes.
    - The pre and post regions.
    - Any additional metadata.

    We explicitly exclude the contributions but you can access them using the Get One Experimental Synapses Per Connection tool.
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve experimental synapses per connection. Use this tool to:
    • Find connections in specific brain regions
    • Filter by subject and species
    • Access detailed connection data

    Specify brain region and optional criteria to find relevant connections."""
    metadata: EntitycoreMetadata
    input_schema: ExperimentalSynapsesPerConnectionGetAllInput

    async def arun(self) -> ListResponseExperimentalSynapsesPerConnectionRead:
        """From a brain region ID, extract experimental synapses per connection.

        Returns
        -------
            list of ExperimentalSynapsesPerConnectionRead to describe the connections and their metadata, or an error dict.
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
            url=self.metadata.entitycore_url.rstrip("/")
            + "/experimental-synapses-per-connection",
            headers=headers,
            params=query_params,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The experimental synapses per connection endpoint returned a non 200 response code. Error: {response.text}"
            )

        response_data = response.json()
        # Set assets and contributions to empty lists for each connection
        for connection in response_data["data"]:
            connection["assets"] = []
            connection["contributions"] = []

        return ListResponseExperimentalSynapsesPerConnectionRead(**response_data)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
