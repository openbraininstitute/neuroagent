"""From url gives back what is on the current page."""

import re
from typing import ClassVar, Literal
from urllib.parse import urlparse, urlunparse
from uuid import UUID

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class EntityGeneration(BaseModel):
    """."""

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


class LinkGenerationInput(BaseModel):
    """."""

    entities: list[EntityGeneration] = Field(
        "List of entities you want to generate links to."
    )


class LinkGenerationMetdata(BaseMetadata):
    """Metadata for the Link Generation tool."""

    frontend_url: str


class LinkGenerationOutput(BaseModel):
    """Output of the Link Generation tool."""

    url_links: list[str]


class LinkGenerationTool(BaseTool):
    """."""

    name: ClassVar[str] = "entitycore-link-generation-tool"
    name_frontend: ClassVar[str] = "Link Generation"
    description: ClassVar[str] = (
        """**CRITICAL** this tool needs to be used after every retreival from entitycore. Allows the generation of links to the objects retreived from entitycore."""
    )
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

        links = []

        for entity in self.input_schema.entities:
            entity_type = entity.entity_type
            entity_id = entity.entity_id.hex
            if entity_type == "reconstruction-morphology":
                links.append(
                    base_url
                    + "/explore/interactive/experimental/morphology/"
                    + entity_id
                )
            elif entity_type == "electrical-cell-recording":
                links.append(
                    base_url
                    + "/explore/interactive/experimental/electrophysiology/"
                    + entity_id
                )
            elif entity_type == "exprimental-neuron-density":
                links.append(
                    base_url
                    + "/explore/interactive/experimental/neuron-density/"
                    + entity_id
                )
            elif entity_type == "exprimental-bouton-density":
                links.append(
                    base_url
                    + "/explore/interactive/experimental/bouton-density/"
                    + entity_id
                )
            elif entity_type == "exprimental-synapse-per-connexion":
                links.append(
                    base_url
                    + "/explore/interactive/experimental/synapse-per-connection/"
                    + entity_id
                )

        return LinkGenerationOutput(url_links=links)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online. Always online."""
        return True
