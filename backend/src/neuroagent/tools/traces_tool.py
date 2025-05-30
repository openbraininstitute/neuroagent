"""Traces tool."""

import logging
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import get_descendants_id_s3

logger = logging.getLogger(__name__)


class GetTracesInput(BaseModel):
    """Inputs of the knowledge graph API."""

    brain_region_id: str = Field(
        description="ID of the brain region of interest. Can be obtained from 'resolve-entities-tool'."
    )
    etype_id: str | None = Field(
        default=None,
        description=(
            "ID of the electrical type of the cell. Can be obtained through the 'resolve-entities-tool'."
        ),
    )


class GetTracesMetadata(BaseMetadata):
    """Metadata for GetTracesTool."""

    httpx_client: AsyncClient
    knowledge_graph_url: str
    trace_search_size: int
    bucket_name: str
    brainregion_hierarchy_storage_key: str
    s3_client: Any


class Trace(BaseModel):
    """Output schema for the traces."""

    trace_id: str

    brain_region_id: str
    brain_region_label: str | None

    etype: str | None

    subject_species_id: str | None
    subject_species_label: str | None
    subject_age: str | None


class GetTracesToolOutput(BaseModel):
    """Output schema for the trace tool."""

    traces: list[Trace]


class GetTracesTool(BaseTool):
    """Class defining the logic to obtain traces ids."""

    name: ClassVar[str] = "get-traces-tool"
    name_frontend: ClassVar[str] = "Traces"
    description: ClassVar[
        str
    ] = """Searches a neuroscience based knowledge graph to retrieve traces names, IDs and descriptions.
    Requires a 'brain_region_id' which is the ID of the brain region of interest as registered in the knowledge graph.
    Optionally accepts an e-type id.
    The output is a list of traces, containing:
    - The trace id.
    - The brain region ID.
    - The brain region name.
    - The etype of the excited cell
    - The subject species ID.
    - The subject species name.
    - The subject age.
"""
    description_frontend: ClassVar[
        str
    ] = """Search and access experimental neuron traces. This tool allows you to:
    • Find experimental recordings from specific brain regions
    • Search by cell types and properties
    • Access detailed trace information

    Specify criteria to find relevant experimental recordings."""
    metadata: GetTracesMetadata
    input_schema: GetTracesInput

    async def arun(self) -> GetTracesToolOutput:
        """From a brain region ID, extract traces."""
        logger.info(
            f"Entering get trace tool. Inputs: {self.input_schema.brain_region_id=}, {self.input_schema.etype_id=}"
        )
        # Get descendants of the brain region specified as input
        hierarchy_ids = get_descendants_id_s3(
            brain_region_id=self.input_schema.brain_region_id,
            s3_client=self.metadata.s3_client,
            bucket_name=self.metadata.bucket_name,
            key=self.metadata.brainregion_hierarchy_storage_key,
        )
        logger.info(f"Found {len(list(hierarchy_ids))} children of the brain ontology.")

        # Create the ES query to query the KG with resolved descendants
        entire_query = self.create_query(
            brain_region_ids=hierarchy_ids, etype_id=self.input_schema.etype_id
        )

        # Send the query to the KG
        response = await self.metadata.httpx_client.post(
            url=self.metadata.knowledge_graph_url,
            json=entire_query,
        )
        return self._process_output(response.json())

    def create_query(
        self,
        brain_region_ids: set[str],
        etype_id: str | None = None,
    ) -> dict[str, Any]:
        """Create ES query.

        Parameters
        ----------
        brain_region_ids
            IDs of the brain region of interest (of the form http://api.brain-map.org/api/v2/data/Structure/...)
        etype
            Name of the etype of interest (in plain english)

        Returns
        -------
            dict containing the ES query to send to the KG.
        """
        # At least one of the children brain region should match.
        conditions = [
            {
                "bool": {
                    "should": [
                        {"term": {"brainRegion.@id.keyword": hierarchy_id}}
                        for hierarchy_id in brain_region_ids
                    ]
                }
            }
        ]

        # Optionally constraint the output on the etype of the cell
        if etype_id is not None:
            logger.info(f"etype selected: {etype_id}")
            conditions.append({"term": {"eType.@id.keyword": etype_id}})  # type: ignore

        # Unwrap everything into the main query
        entire_query = {
            "size": self.metadata.trace_search_size,
            "track_total_hits": True,
            "query": {
                "bool": {
                    "must": [
                        *conditions,
                        {
                            "term": {
                                "@type.keyword": "https://bbp.epfl.ch/ontologies/core/bmo/ExperimentalTrace"
                            }
                        },
                        {"term": {"curated": True}},
                        {"term": {"deprecated": False}},
                    ]
                }
            },
        }
        return entire_query

    def _process_output(self, output: Any) -> GetTracesToolOutput:
        """Process output to fit the TracesOutput pydantic class defined above.

        Parameters
        ----------
        output
            Raw output of the _arun method, which comes from the KG

        Returns
        -------
            list of TracesOutput to describe the trace and its metadata.
        """
        results = [
            Trace(
                trace_id=res["_source"]["@id"],
                brain_region_id=res["_source"]["brainRegion"]["@id"],
                brain_region_label=res["_source"]["brainRegion"]["label"],
                etype=(
                    res["_source"]["eType"].get("label")
                    if "eType" in res["_source"]
                    else None
                ),
                subject_species_id=(
                    res["_source"]["subjectSpecies"]["@id"]
                    if "subjectSpecies" in res["_source"]
                    else None
                ),
                subject_species_label=(
                    res["_source"]["subjectSpecies"]["label"]
                    if "subjectSpecies" in res["_source"]
                    else None
                ),
                subject_age=(
                    f"{res['_source']['subjectAge']['value']} {res['_source']['subjectAge']['unit']}"
                    if "subjectAge" in res["_source"]
                    else None
                ),
            )
            for res in output["hits"]["hits"]
        ]
        return GetTracesToolOutput(traces=results)

    @classmethod
    async def is_online(
        cls, *, httpx_client: AsyncClient, knowledge_graph_url: str
    ) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{knowledge_graph_url.rstrip('/')}/version",
        )
        return response.status_code == 200
