"""From url gives back what is on the current page."""

import re
from typing import ClassVar, Literal
from urllib.parse import urlparse, urlunparse
from uuid import UUID

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class LinkGenerationInput(BaseModel):
    """Input class for the Link Generation tool, empty since no inputs."""

    entity_type: Literal[
        "reconstruction-morphology",
        "electrical-cell-recording",
        "exprimental-neuron-density",
        "exprimental-bouton-density",
        "exprimental-synapse-per-connexion",
    ] = Field(description="The type of entity you want to generate a link for.")
    entity_id: UUID = Field(
        description="ID of the entity you want to generate a link for."
    )


class LinkGenerationMetdata(BaseMetadata):
    """Metadata for the Link Generation tool."""

    frontend_url: str


class LinkGenerationOutput(BaseModel):
    """Output of the Link Generation tool."""

    url_link: str


class LinkGenerationTool(BaseTool):
    """."""

    name: ClassVar[str] = "link-generation-tool"
    name_frontend: ClassVar[str] = "Link Generation"
    description: ClassVar[str] = """"""
    description_frontend: ClassVar[str] = """"""
    metadata: LinkGenerationMetdata
    input_schema: LinkGenerationInput

    async def arun(self) -> LinkGenerationOutput:
        """

        Returns
        -------

        """
        # Parse the URL to handle it properly
        try:
            parsed = urlparse(self.metadata.frontend_url)
        except Exception as e:
            raise ValueError(f"Invalid URL format: {e}")

        # UUID pattern (matches project IDs like 7e1223a0-6718-408d-96de-792fb549b021)
        uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

        # Look for /project/ followed by a UUID
        project_pattern = rf"/project/({uuid_pattern})"

        match = re.search(project_pattern, parsed.path, re.IGNORECASE)

        if not match:
            raise ValueError("No project ID found in URL")

        # Find the end position of the project ID
        project_id_end = match.end()

        # Truncate the path up to and including the project ID
        truncated_path = parsed.path[:project_id_end]

        # Reconstruct the URL with the truncated path
        base_url = urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                truncated_path,
                "",  # params
                "",  # query
                "",  # fragment
            )
        )

        if self.input_schema.entity_type == "reconstruction-morphology":
            full_url = (
                base_url
                + "/explore/interactive/experimental/morphology/"
                + self.input_schema.entity_id.hex
            )
        elif self.input_schema.entity_type == "electrical-cell-recording":
            full_url = (
                base_url
                + "/explore/interactive/experimental/electrophysiology/"
                + self.input_schema.entity_id.hex
            )
        elif self.input_schema.entity_type == "exprimental-neuron-density":
            full_url = (
                base_url
                + "/explore/interactive/experimental/neuron-density/"
                + self.input_schema.entity_id.hex
            )
        elif self.input_schema.entity_type == "exprimental-bouton-density":
            full_url = (
                base_url
                + "/explore/interactive/experimental/bouton-density/"
                + self.input_schema.entity_id.hex
            )
        elif self.input_schema.entity_type == "exprimental-synapse-per-connexion":
            full_url = (
                base_url
                + "/explore/interactive/experimental/synapse-per-connection/"
                + self.input_schema.entity_id.hex
            )

        return LinkGenerationOutput(url_link=full_url)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online. Always online."""
        return True
