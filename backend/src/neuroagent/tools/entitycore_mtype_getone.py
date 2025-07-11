"""Get One Mtype tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.autogenerated_types.entitycore import (
    Annotation,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class MtypeGetOneInput(BaseModel):
    """Inputs of the knowledge graph API."""

    mtype_id: UUID = Field(description="ID of the m-type of interest in UUID format.")


class MtypeGetOneTool(BaseTool):
    """Class defining the Get One Mtype logic."""

    name: ClassVar[str] = "entitycore-mtype-getone"
    name_frontend: ClassVar[str] = "Get One M-type"
    description: ClassVar[
        str
    ] = """Retrieves detailed information about a specific m-type from the knowledge graph.
    Requires an 'mtype_id' which is the ID of the m-type of interest as registered in the knowledge graph.
    The output contains detailed information about the m-type, including:
    - The m-type ID
    - The m-type preferred label
    - The m-type alternative label
    - The m-type definition
    - Creation and update dates
    """
    description_frontend: ClassVar[
        str
    ] = """Get detailed information about a specific m-type. Use this tool to:
    • View complete m-type details
    • Access m-type labels and definition
    • Get creation and update information

    Specify the m-type ID to retrieve its full details."""
    metadata: EntitycoreMetadata
    input_schema: MtypeGetOneInput

    async def arun(self) -> Annotation:
        """From an m-type ID, extract detailed m-type information.

        Returns
        -------
            Annotation containing detailed m-type information, or an error dict.
        """
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/")
            + f"/mtype/{self.input_schema.mtype_id}",
            headers=headers,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The mtype endpoint returned a non 200 response code. Error: {response.text}"
            )
        return Annotation(**response.json())

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
