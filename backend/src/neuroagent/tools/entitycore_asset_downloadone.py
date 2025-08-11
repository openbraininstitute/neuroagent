"""Download One Asset tool."""

from typing import ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.schemas import EntityRoute
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class AssetDownloadOneInputSchema(BaseModel):
    """Input schema for AssetDownloadOneTool."""

    entity_route: EntityRoute = Field(description="The route of the entity")
    entity_id: UUID = Field(description="The ID of the entity")
    asset_id: UUID = Field(description="The ID of the asset")


class AssetDownloadOneOutput(BaseModel):
    """Output schema for AssetDownloadOneTool."""

    presigned_url: str = Field(
        ..., description="The presigned URL for downloading the asset"
    )


class AssetDownloadOneTool(BaseTool):
    """Class defining the Download One Asset logic."""

    name: ClassVar[str] = "entitycore-asset-downloadone"
    name_frontend: ClassVar[str] = "Download One Asset"
    utterances: ClassVar[list[str]] = [
        "Download this asset",
        "Get download link for the file",
        "I need to download this data",
    ]
    description: ClassVar[
        str
    ] = """Retrieves a presigned URL for downloading a single asset from the entitycore service.
    The output contains:
    - A presigned URL that can be used to download the asset
    """
    description_frontend: ClassVar[str] = """Download a single asset. Use this tool to:
    • Get a download link for a specific asset
    • Access the asset content directly

    Specify the entity route and entity ID to get the download URL."""
    metadata: EntitycoreMetadata
    input_schema: AssetDownloadOneInputSchema

    async def arun(self) -> AssetDownloadOneOutput:
        """Get download URL for one asset.

        Returns
        -------
            Presigned URL for downloading the asset.
        """
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.entitycore_url.rstrip('/')}/{self.input_schema.entity_route}/{self.input_schema.entity_id}/assets/{self.input_schema.asset_id}/download",
            headers=headers,
            follow_redirects=False,
        )
        if response.status_code != 307:
            raise ValueError(
                f"The asset download endpoint returned a non 307 response code. Error: {response.text}"
            )

        return AssetDownloadOneOutput(presigned_url=response.headers["location"])

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
