"""Get All Contribution tool."""

from typing import ClassVar

from httpx import AsyncClient
from pydantic import Field

from neuroagent.tools.autogenerated_types.entitycore import (
    ListResponseContributionRead,
    ReadManyContributionGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class ContributionGetAllInput(ReadManyContributionGetParametersQuery):
    """Inputs for the contribution get all tool."""

    page_size: int = Field(
        ge=1,
        le=10,
        default=5,
        description="Number of items per page",
    )


class ContributionGetAllTool(BaseTool):
    """Class defining the Get All Contribution logic."""

    name: ClassVar[str] = "entitycore-contribution-getall"
    name_frontend: ClassVar[str] = "Get All Contributions"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve contributions.
    The output is a list of contributions, containing:
    - The contribution ID
    - The agent (person or organization) making the contribution
    - The role of the agent
    - The entity being contributed to
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve contributions. Use this tool to:
    • Find contributions by agent or role
    • Access detailed contribution data

    Specify optional criteria to find relevant contributions."""
    metadata: EntitycoreMetadata
    input_schema: ContributionGetAllInput

    async def arun(self) -> ListResponseContributionRead:
        """Extract contributions.

        Returns
        -------
            list of contributions and their metadata, or an error dict.
        """
        query_params = self.input_schema.model_dump(exclude_defaults=True, mode="json")
        query_params["page_size"] = self.input_schema.page_size

        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/") + "/contribution",
            headers=headers,
            params=query_params,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The contribution endpoint returned a non 200 response code. Error: {response.text}"
            )

        response_data = response.json()
        return ListResponseContributionRead(**response_data)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
