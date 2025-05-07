"""Get Morpho tool."""

import logging
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class GetMorphoInput(BaseModel):
    """Inputs of the knowledge graph API."""

    # brain_region_id: int = Field(description="ID of the brain region of interest.")
    brain_region_id: str = Field(description="ID of the brain region of interest.")
    mtype_id: str | None = Field(
        default=None,
        description="ID of the M-type of interest.",
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

    brain_region_id: int
    brain_region_name: str | None

    subject_species_name: str | None


class GetMorphoToolOutput(BaseModel):
    """Output schema for the Morpho tool."""

    morphologies: list[MorphologieOutput]


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
    The morphology ID is in the form of an HTTP(S) link such as 'https://bbp.epfl.ch/neurosciencegraph/data/neuronmorphologies...'."""
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
        # To be removed when we do the switch
        self.input_schema.brain_region_id = self.input_schema.brain_region_id.split(
            "/"
        )[-1]

        logger.info(
            f"Entering Get Morpho tool. Inputs: {self.input_schema.brain_region_id=}, {self.input_schema.mtype_id=}"
        )
        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url + "/reconstruction-morphology",
            headers={"Authorization": f"Bearer {self.metadata.token}"},
            params={
                "brain_region_id": self.input_schema.brain_region_id,
                "page_size": self.metadata.morpho_search_size,
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
                # morphology_id=res["id"],   # We will switch to that one after.
                morphology_id=res["legacy_id"][0],
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
        return GetMorphoToolOutput(morphologies=formatted_output)

    @classmethod
    async def is_online(
        cls, *, httpx_client: AsyncClient, knowledge_graph_url: str
    ) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{knowledge_graph_url.rstrip('/')}/version",
        )
        return response.status_code == 200
