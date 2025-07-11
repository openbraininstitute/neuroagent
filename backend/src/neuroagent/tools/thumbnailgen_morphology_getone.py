"""Get One Morphology Thumbnail tool."""

from typing import Any, ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.autogenerated_types.thumbnail_generation import (
    GetMorphologyPreviewApiThumbnailGenerationCoreReconstructionMorphologyPreviewGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage


class PlotMorphologyGetOneInput(
    GetMorphologyPreviewApiThumbnailGenerationCoreReconstructionMorphologyPreviewGetParametersQuery
):
    """Input of the PlotMorphologyGetOneTool."""

    asset_id: UUID = Field(
        description="ID of the asset. You need to call the 'entitycore-reconstructionmorphology-getone' or the `entitycore-asset-getall` tool on the relevant morphology beforehand to get this parameter. The ID must always come from the `swc` asset, which is indicated by the `'content_type': 'application/swc'`."
    )


class PlotMorphologyGetOneMetadata(BaseMetadata):
    """Metadata class for the thumbnail generation of morphologies."""

    httpx_client: AsyncClient
    thumbnail_generation_url: str
    s3_client: Any  # boto3 client
    user_id: UUID
    bucket_name: str
    thread_id: UUID
    vlab_id: UUID | None
    project_id: UUID | None


class PlotMorphologyGetOneOutput(BaseModel):
    """Output of the PlotMorphologyGetOneTool."""

    storage_id: str


class PlotMorphologyGetOneTool(BaseTool):
    """Class defining the Get One Morphology Thumbnail logic."""

    name: ClassVar[str] = "thumbnail-generation-morphology-getone"
    name_frontend: ClassVar[str] = "Get Morphology Thumbnail"
    description: ClassVar[str] = """**Purpose**:
        Generate a visual representation of a specified morphology.

        **When to Call**:
        When the user asks to plot a morphology or requests more information about a morphology.

        **Inputs**:
        entity_id: ID of the target entity.
        asset_id: ID of the specific morphology asset. Retrieve using `entitycore-reconstructionmorphology-getone` or `entitycore-asset-getall`.

        **Output**:
        storage_id: Identifier for where the generated plot is stored.

        **Notes**:
        Do not embed or display the plot link directly in your response.
    """
    description_frontend: ClassVar[
        str
    ] = """Plot the morphology of your choice to display a thumbnail in the chat.

    Use this tool to enhance the description of your target morphology by adding visuals."""
    metadata: PlotMorphologyGetOneMetadata
    input_schema: PlotMorphologyGetOneInput

    async def arun(self) -> PlotMorphologyGetOneOutput:
        """From an Entity ID and an Asset ID, plot the visual of the morphology.

        Returns
        -------
            storage_id which locates the plot in the storage.
        """
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.thumbnail_generation_url.rstrip("/")
            + "/core/reconstruction-morphology/preview",
            headers=headers,
            params=self.input_schema.model_dump(exclude_defaults=True, mode="json"),
        )
        if response.status_code != 200:
            raise ValueError(
                f"The Morphology Thumbnail endpoint returned a non 200 response code. Error: {response.text}"
            )

        # Save to storage
        identifier = save_to_storage(
            s3_client=self.metadata.s3_client,
            bucket_name=self.metadata.bucket_name,
            user_id=self.metadata.user_id,
            content_type="image/png",
            category="image",
            body=response.content,
            thread_id=self.metadata.thread_id,
        )

        return PlotMorphologyGetOneOutput(storage_id=identifier)

    @classmethod
    async def is_online(
        cls, *, httpx_client: AsyncClient, thumbnail_generation_url: str
    ) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{thumbnail_generation_url.rstrip('/')}/health",
        )
        return response.status_code == 200
