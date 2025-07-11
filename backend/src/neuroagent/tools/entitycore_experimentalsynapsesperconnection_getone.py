"""Get One Experimental Synapses Per Connection tool."""

import logging
from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.autogenerated_types.entitycore import (
    ExperimentalSynapsesPerConnectionRead,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata

logger = logging.getLogger(__name__)


class ExperimentalSynapsesPerConnectionGetOneInput(BaseModel):
    """Inputs of the experimental synapses per connection get one tool."""

    synapses_per_connection_id: UUID = Field(
        description="ID of the experimental synapses per connection of interest in UUID format."
    )


class ExperimentalSynapsesPerConnectionGetOneTool(BaseTool):
    """Class defining the Get One Experimental Synapses Per Connection logic."""

    name: ClassVar[str] = "entitycore-experimentalsynapsesperconnection-getone"
    name_frontend: ClassVar[str] = "Get One Experimental Synapses Per Connection"
    description: ClassVar[
        str
    ] = """Retrieves detailed information about a specific experimental synapses per connection from the knowledge graph.
    Requires a 'synapses_per_connection_id' which is the ID of the synapses per connection of interest as registered in the knowledge graph.
    The output contains detailed information about the synapses per connection, including:
    - The synapses per connection ID
    - The synapses per connection name
    - The synapses per connection description
    - The subject information
    - The measurements
    - The contributions
    - The brain region information
    - The pre and post mtypes
    - The pre and post regions
    - Any additional metadata
    """
    description_frontend: ClassVar[
        str
    ] = """Get detailed information about a specific experimental synapses per connection. Use this tool to:
    • View complete synapses per connection details
    • Access associated metadata
    • Get brain region and subject information
    • Access synapses per connection measurements

    Specify the synapses per connection ID to retrieve its full details."""
    metadata: EntitycoreMetadata
    input_schema: ExperimentalSynapsesPerConnectionGetOneInput

    async def arun(self) -> ExperimentalSynapsesPerConnectionRead:
        """From a synapses per connection ID, extract detailed synapses per connection information.

        Returns
        -------
            ExperimentalSynapsesPerConnectionRead containing detailed synapses per connection information, or an error dict.
        """
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/")
            + f"/experimental-synapses-per-connection/{self.input_schema.synapses_per_connection_id}",
            headers=headers,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The experimental synapses per connection endpoint returned a non 200 response code. Error: {response.text}"
            )
        return ExperimentalSynapsesPerConnectionRead(**response.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
