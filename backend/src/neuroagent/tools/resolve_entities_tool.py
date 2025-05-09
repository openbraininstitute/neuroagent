"""Tool to resolve the brain region from natural english to a KG ID."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.resolving import resolve_query
from neuroagent.tools.base_tool import (
    ETYPE_IDS,
    BaseMetadata,
    BaseTool,
    EtypesLiteral,
)

logger = logging.getLogger(__name__)


class ResolveBRInput(BaseModel):
    """Inputs of the Resolve Brain Region tool."""

    brain_region: str = Field(
        description="Brain region of interest specified by the user in natural english."
    )
    mtype: str | None = Field(
        default=None,
        description="M-type of interest specified by the user in natural english.",
    )
    etype: EtypesLiteral | None = Field(
        default=None,
        description=(
            "E-type of interest specified by the user in natural english. Possible values:"
            f" {', '.join(list(ETYPE_IDS.keys()))}. The first letter meaning c: continuous,"
            "b: bursting or d: delayed, The other letters in capital meaning AC: accomodating,"
            "NAC: non-accomodating, AD: adapting, NAD: non-adapting, STUT: stuttering,"
            "IR: irregular spiking. Optional suffixes in lowercase can exist:"
            "pyr: pyramidal, int: interneuron, _ltb: low threshold bursting,"
            "_noscltb: non-oscillatory low-threshold bursting. Examples: "
            "cADpyr: continuous adapting pyramidal. dAD_ltb: delayed adapting low-threshold bursting"
        ),
    )


class ResolveBRMetadata(BaseMetadata):
    """Metadata for ResolveEntitiesTool."""

    token: str
    kg_sparql_url: str
    kg_class_view_url: str


class BRResolveOutput(BaseModel):
    """Output schema for the Brain region resolver."""

    brain_region_name: str
    brain_region_id: str


class MTypeResolveOutput(BaseModel):
    """Output schema for the Mtype resolver."""

    mtype_name: str
    mtype_id: str


class ETypeResolveOutput(BaseModel):
    """Output schema for the Mtype resolver."""

    etype_name: str
    etype_id: str


class ResolveEntitiesToolOutput(BaseModel):
    """Output schema for the Resolve Entities tool."""

    brain_regions: list[BRResolveOutput]
    mtypes: list[MTypeResolveOutput] | None
    etype: ETypeResolveOutput | None


class ResolveEntitiesTool(BaseTool):
    """Class defining the Brain Region Resolving logic."""

    name: ClassVar[str] = "resolve-entities-tool"
    name_frontend: ClassVar[str] = "Resolve Entities"
    description: ClassVar[
        str
    ] = """From a brain region name written in natural english, search a knowledge graph to retrieve its corresponding ID.
    Optionaly resolve the mtype name from natural english to its corresponding ID too.
    You MUST use this tool when a brain region is specified in natural english because in that case the output of this tool is essential to other tools.
    returns a dictionary containing the brain region name, id and optionaly the mtype name and id.
    Brain region related outputs are stored in the class `BRResolveOutput` while the mtype related outputs are stored in the class `MTypeResolveOutput`."""
    description_frontend: ClassVar[
        str
    ] = """Convert natural language descriptions to precise identifiers. This tool helps you:
    • Find exact brain region IDs from names
    • Match cell types to their formal identifiers
    • Resolve scientific terminology

    Provide natural language descriptions to get corresponding technical identifiers."""
    metadata: ResolveBRMetadata
    input_schema: ResolveBRInput

    async def arun(
        self,
    ) -> ResolveEntitiesToolOutput:
        """Given a brain region in natural language, resolve its ID."""
        logger.info(
            f"Entering Brain Region resolver tool. Inputs: {self.input_schema.brain_region=}, "
            f"{self.input_schema.mtype=}, {self.input_schema.etype=}"
        )

        # First resolve the brain regions.
        brain_regions_results = await resolve_query(
            sparql_view_url=self.metadata.kg_sparql_url,
            token=self.metadata.token,
            query=self.input_schema.brain_region,
            resource_type="nsg:BrainRegion",
            search_size=10,
            httpx_client=self.metadata.httpx_client,
            es_view_url=self.metadata.kg_class_view_url,
        )
        # Extend the resolved BRs.
        brain_regions = [
            BRResolveOutput(brain_region_name=br["label"], brain_region_id=br["id"])
            for br in brain_regions_results
        ]

        # Optionally resolve the mtypes.
        if self.input_schema.mtype is not None:
            mtypes_results = await resolve_query(
                sparql_view_url=self.metadata.kg_sparql_url,
                token=self.metadata.token,
                query=self.input_schema.mtype,
                resource_type="bmo:BrainCellType",
                search_size=10,
                httpx_client=self.metadata.httpx_client,
                es_view_url=self.metadata.kg_class_view_url,
            )
            # Extend the resolved mtypes.
            mtypes = [
                MTypeResolveOutput(mtype_name=mtype["label"], mtype_id=mtype["id"])
                for mtype in mtypes_results
            ]
        else:
            mtypes = None

        # Optionally resolve the etype
        if self.input_schema.etype is not None:
            etype = ETypeResolveOutput(
                etype_name=self.input_schema.etype,
                etype_id=ETYPE_IDS[self.input_schema.etype],
            ).model_dump()
        else:
            etype = None

        return ResolveEntitiesToolOutput(
            brain_regions=brain_regions, mtypes=mtypes, etype=etype
        )

    @classmethod
    async def is_online(
        cls, *, httpx_client: AsyncClient, knowledge_graph_url: str
    ) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{knowledge_graph_url.rstrip('/')}/version",
        )
        return response.status_code == 200
