"""Tool to resolve the brain region from natural english to its entitycore ID."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import (
    BaseMetadata,
    BaseTool,
)

logger = logging.getLogger(__name__)


class ResolveBRInput(BaseModel):
    """Defines the input structure for the Resolve Brain Region tool."""

    brain_region: str = Field(
        description="Specifies the target brain region provided by the user in natural language. The value is matched using a case-insensitive, SQL 'ilike' pattern matching.",
    )


class ResolveBRMetadata(BaseMetadata):
    """Metadata for ResolveEntitiesTool."""

    entitycore_url: str
    token: str


class BrainRegion(BaseModel):
    """Output schema for the Brain region resolver."""

    brain_region_name: str
    brain_region_id: str


class ResolveBROutput(BaseModel):
    """Output schema for the Resolve Entities tool."""

    brain_regions: list[BrainRegion]


class ResolveBrainRegionTool(BaseTool):
    """Class defining the Brain Region Resolving logic."""

    name: ClassVar[str] = "resolve-brain-region-tool"
    name_frontend: ClassVar[str] = "Resolve Brain Region"
    description: ClassVar[str] = (
        """From a brain region name written in natural english, retrieve its corresponding ID, formatted as UUID."""
    )
    description_frontend: ClassVar[str] = (
        """Convert natural language brain region to its ID."""
    )
    metadata: ResolveBRMetadata
    input_schema: ResolveBRInput

    async def arun(
        self,
    ) -> ResolveBROutput:
        """Given a brain region in natural language, resolve its ID."""
        logger.info(
            f"Entering Brain Region resolver tool. Inputs: {self.input_schema.brain_region=}"
        )

        br_response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url + "/brain-region",
            headers={"Authorization": f"Bearer {self.metadata.token}"},
            params={
                "hierarchy_id": "e3e70682-c209-4cac-a29f-6fbed82c07cd",
                "page_size": 500,
                "name__ilike": self.input_schema.brain_region,
            },
        )

        if br_response.status_code != 200:
            raise ValueError(
                f"The brain region endpoint returned a non 200 response code. Error: {br_response.text}"
            )

        # Sort the brain region strings by string length
        br_list = br_response.json()["data"]
        br_list.sort(key=lambda item: len(item["name"]))

        # Extend the resolved BRs.
        brain_regions = [
            BrainRegion(brain_region_name=br["name"], brain_region_id=br["id"])
            for br in br_list[:10]
        ]

        return ResolveBROutput(brain_regions=brain_regions)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
