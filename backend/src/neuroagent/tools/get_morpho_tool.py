"""Get Morpho tool."""

import logging
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class GetMorphoInput(BaseModel):
    """Inputs of the knowledge graph API."""

    brain_region_id: str = Field(
        description="ID of the brain region of interest in UUID format. To find the ID use the resolve-entity-tool first."
    )
    page: int = Field(default=1, description="Page number for pagination.")
    mtype_id: str | None = Field(
        default=None,
        description="ID of the M-type of interest. To find the ID use the resolve-entity-tool first.",
    )


class GetMorphoMetadata(BaseMetadata):
    """Metadata class for GetMorphoTool."""

    entitycore_url: str
    token: str
    morpho_search_size: int


class MtypeOutput(BaseModel):
    """Output class for M-types."""

    mtype_id: str
    pref_label: str | None
    alt_label: str | None


class MorphologieOutput(BaseModel):
    """Output schema for the knowledge graph API."""

    morphology_id: str
    morphology_name: str | None
    morphology_description: str | None
    mtype: list[MtypeOutput] | None

    brain_region_id: str
    brain_region_name: str | None

    subject_species_name: str | None


class GetMorphoToolOutput(BaseModel):
    """Output schema for the Morpho tool."""

    morphologies: list[MorphologieOutput]
    current_page: int
    page_size: int
    total_items_found: int


class GetMorphoTool(BaseTool):
    """Class defining the Get Morpho logic."""

    name: ClassVar[str] = "get-morpho-tool"
    name_frontend: ClassVar[str] = "Morphologies"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve neuron morphology names, IDs and descriptions.
    Requires a 'brain_region_id' which is the ID of the brain region of interest as registered in the knowledge graph.
    Optionally accepts an mtype_id.
    The output is a list of morphologies, containing:
    - The brain region ID.
    - The brain region name.
    - The subject species name.
    - The morphology ID.
    - The morphology name.
    - the morphology description.
    """
    description_frontend: ClassVar[
        str
    ] = """Search and retrieve neuron morphologies. Use this tool to:
    • Find neurons in specific brain regions
    • Search by morphology type
    • Access detailed morphological data

    Specify brain region and optional criteria to find relevant morphologies."""
    metadata: GetMorphoMetadata
    input_schema: GetMorphoInput

    async def arun(self) -> GetMorphoToolOutput:
        """From a brain region ID, extract morphologies.

        Returns
        -------
            list of KnowledgeGraphOutput to describe the morphology and its metadata, or an error dict.
        """
        logger.info(
            f"Entering Get Morpho tool. Inputs: {self.input_schema.brain_region_id=}, {self.input_schema.mtype_id=}"
        )

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url + "/reconstruction-morphology",
            headers={"Authorization": f"Bearer {self.metadata.token}"},
            params={
                "page_size": self.metadata.morpho_search_size,
                "within_brain_region_hierachy_id": "e3e70682-c209-4cac-a29f-6fbed82c07cd",  # TEMP for mouse brain
                "within_brain_region_brain_region_id": self.input_schema.brain_region_id,
                "within_brain_region_ascendants": False,
                **(
                    {"mtype__id": self.input_schema.mtype_id}
                    if self.input_schema.mtype_id
                    else {}
                ),
            },
        )

        return self._process_output(response.json())

    @staticmethod
    def _process_output(output: Any) -> GetMorphoToolOutput:
        """Process output to fit the KnowledgeGraphOutput pydantic class defined above.

        Parameters
        ----------
        output
            Raw output of the arun method, which comes from the KG

        Returns
        -------
            list of KGMorphoFeatureOutput to describe the morphology and its metadata.
        """
        formatted_output = [
            MorphologieOutput(
                morphology_id=res["id"],
                morphology_name=res.get("name"),
                morphology_description=res.get("description"),
                mtype=[
                    MtypeOutput(
                        mtype_id=mtype["id"],
                        pref_label=mtype.get("pref_label"),
                        alt_label=mtype.get("alt_label"),
                    )
                    for mtype in res.get("mtypes")
                ],
                brain_region_id=res["brain_region"]["id"],
                brain_region_name=res["brain_region"].get("Name"),
                subject_species_name=res["species"].get("name"),
            )
            for res in output["data"]
        ]
        pagination_data = output["pagination"]
        return GetMorphoToolOutput(
            morphologies=formatted_output,
            current_page=pagination_data["page"],
            page_size=pagination_data["page_size"],
            total_items_found=pagination_data["total_items"],
        )

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}",
        )
        return response.status_code == 200
