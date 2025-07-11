"""Get One Etype tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.autogenerated_types.entitycore import (
    Annotation,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class EtypeGetOneInput(BaseModel):
    """Inputs of the knowledge graph API."""

    etype_id: UUID = Field(description="ID of the e-type of interest in UUID format.")


class EtypeGetOneTool(BaseTool):
    """Class defining the Get One Etype logic."""

    name: ClassVar[str] = "entitycore-etype-getone"
    name_frontend: ClassVar[str] = "Get One E-type"
    description: ClassVar[
        str
    ] = """Retrieves detailed information about a specific e-type from the knowledge graph.
    Requires an 'etype_id' which is the ID of the e-type of interest as registered in the knowledge graph.
    The output contains detailed information about the e-type, including:
    - The e-type ID
    - The e-type preferred label
    - The e-type alternative label
    - The e-type definition
    - Creation and update dates
    """
    description_frontend: ClassVar[
        str
    ] = """Get detailed information about a specific e-type. Use this tool to:
    • View complete e-type details
    • Access e-type labels and definition
    • Get creation and update information

    Specify the e-type ID to retrieve its full details."""
    metadata: EntitycoreMetadata
    input_schema: EtypeGetOneInput

    async def arun(self) -> Annotation:
        """From an e-type ID, extract detailed e-type information.

        Returns
        -------
            Annotation containing detailed e-type information, or an error dict.
        """
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/")
            + f"/etype/{self.input_schema.etype_id}",
            headers=headers,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The etype endpoint returned a non 200 response code. Error: {response.text}"
            )
        return Annotation(**response.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
