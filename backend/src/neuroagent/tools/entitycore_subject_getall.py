"""Get All Subjects tool."""

from typing import ClassVar

from httpx import AsyncClient
from pydantic import Field

from neuroagent.tools.autogenerated_types.entitycore import (
    ListResponseSubjectRead,
    ReadManySubjectGetParametersQuery,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata


class SubjectGetAllInput(ReadManySubjectGetParametersQuery):
    """Inputs for the subject get all tool."""

    page_size: int = Field(
        ge=1,
        le=10,
        default=5,
        description="Number of items per page",
    )


class SubjectGetAllTool(BaseTool):
    """Class defining the Get Subject logic."""

    name: ClassVar[str] = "entitycore-subject-getall"
    name_frontend: ClassVar[str] = "Get All Subjects"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve subjects.
    The output is a list of subjects, containing:
    - The subject ID
    - The subject name
    - The subject description
    - The subject sex
    - The subject weight
    - The subject age information
    - The subject species
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve subjects. Use this tool to:
    • Find subjects by name
    • Access detailed subject data
    • Filter subjects by various criteria

    Specify optional criteria to find relevant subjects."""
    metadata: EntitycoreMetadata
    input_schema: SubjectGetAllInput

    async def arun(self) -> ListResponseSubjectRead:
        """Extract subjects.

        Returns
        -------
            list of subjects and their metadata, or an error dict.
        """
        query_params = self.input_schema.model_dump(exclude_defaults=True, mode="json")
        query_params["page_size"] = self.input_schema.page_size

        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/") + "/subject",
            headers=headers,
            params=query_params,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The subject endpoint returned a non 200 response code. Error: {response.text}"
            )

        response_data = response.json()
        return ListResponseSubjectRead(**response_data)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}/health",
        )
        return response.status_code == 200
