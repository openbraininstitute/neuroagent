"""Get One SingleNeuronSynaptome tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.autogenerated_types.entitycore import (
    SingleNeuronSynaptomeRead,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class SingleNeuronSynaptomeGetOneInput(BaseModel):
    """Inputs for the single-neuron-synaptome get one tool."""

    single_neuron_synaptome_id: UUID = Field(
        description="ID of the single-neuron-synaptome of interest in UUID format."
    )


class SingleNeuronSynaptomeGetOneTool(BaseTool):
    """Class defining the Get One SingleNeuronSynaptome logic."""

    name: ClassVar[str] = "entitycore-singleneuronsynaptome-getone"
    name_frontend: ClassVar[str] = "Get One Single Neuron Synaptome"
    description: ClassVar[
        str
    ] = """Retrieves detailed information about a specific single-neuron-synaptome from the knowledge graph.
    Requires a 'single_neuron_synaptome_id' which is the ID of the single-neuron-synaptome of interest as registered in the knowledge graph.
    The output contains detailed information about the single-neuron-synaptome, including:
    - The single neuron synaptome ID and basic identifiers
    - Core single neuron synaptome information and properties
    - Status and state information
    - Associated metadata and relationships
    - Creation and modification timestamps
    - Creation and update dates
    """
    description_frontend: ClassVar[
        str
    ] = """Get detailed information about a specific single-neuron-synaptome. Use this tool to:
    • View complete single-neuron-synaptome details
    • Access detailed single-neuron-synaptome information
    • Get creation and update information

    Specify the single-neuron-synaptome ID to retrieve its full details."""
    metadata: EntitycoreMetadata
    input_schema: SingleNeuronSynaptomeGetOneInput

    async def arun(self) -> SingleNeuronSynaptomeRead:
        """From a single-neuron-synaptome ID, extract detailed single-neuron-synaptome information.

        Returns
        -------
            SingleNeuronSynaptomeRead containing detailed single-neuron-synaptome information, or an error dict.
        """
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/")
            + f"/single-neuron-synaptome/{self.input_schema.single_neuron_synaptome_id}",
            headers=headers,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The single-neuron-synaptome endpoint returned a non 200 response code. Error: {response.text}"
            )
        return SingleNeuronSynaptomeRead(**response.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
