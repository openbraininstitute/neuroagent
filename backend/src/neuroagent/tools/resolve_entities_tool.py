"""Tool to resolve the brain region from natural english to a KG ID."""

import logging
from typing import ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import (
    ETYPE_IDS,
    BaseMetadata,
    BaseTool,
    EtypesLiteral,
)

logger = logging.getLogger(__name__)


class ResolveBRInput(BaseModel):
    """Defines the input structure for the Resolve Brain Region tool."""

    brain_region: str = Field(
        description="Specifies the target brain region provided by the user in natural language. The value is matched using a case-insensitive, SQL 'ilike' pattern matching.",
    )
    mtype: str | None = Field(
        default=None,
        description="Specifies the target M-type (Morphological type) as provided by the user in natural language. The value must match exactly, without case insensitivity.",
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

    entitycore_url: str
    token: str


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
    ] = """From a brain region name written in natural english, retrieve its corresponding ID, formatted as UUID.
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

        br_response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url + "/brain-region",
            headers={"Authorization": f"Bearer {self.metadata.token}"},
            params={
                "page_size": 500,
                "name__ilike": self.input_schema.brain_region,
            },
        )

        # Sort the brain region strings by string length
        br_list = br_response.json()["data"]
        br_list.sort(key=lambda item: len(item["name"]))

        # Extend the resolved BRs.
        brain_regions = [
            BRResolveOutput(brain_region_name=br["name"], brain_region_id=br["id"])
            for br in br_list[:10]
        ]

        # Optionally resolve the mtypes.
        if self.input_schema.mtype is not None:
            mtype_response = await self.metadata.httpx_client.get(
                url=self.metadata.entitycore_url + "/mtype",
                headers={"Authorization": f"Bearer {self.metadata.token}"},
                params={
                    "page_size": 100,
                    "pref_label": self.input_schema.mtype,
                },
            )

            mtypes = [
                MTypeResolveOutput(mtype_name=mtype["pref_label"], mtype_id=mtype["id"])
                for mtype in mtype_response.json()["data"]
            ]
        else:
            mtypes = None

        # Optionally resolve the etype (kept the old functionalities)
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
    async def is_online(cls, *, httpx_client: AsyncClient, entitycore_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{entitycore_url.rstrip('/')}",
        )
        return response.status_code == 200
