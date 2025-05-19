"""Tool to resolve etypes in natural language to its ID."""

import logging
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import (
    ETYPE_IDS,
    BaseMetadata,
    BaseTool,
    EtypesLiteral,
)

logger = logging.getLogger(__name__)


class ResolveEtypeInput(BaseModel):
    """Defines the input structure for the Resolve Brain Region tool."""

    etype: EtypesLiteral = Field(
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


class ResolveEtypeMetadata(BaseMetadata):
    """Metadata for ResolveEntitiesTool."""

    pass


class ResolveEtypeOutput(BaseModel):
    """Output schema for the Mtype resolver."""

    etype_name: str
    etype_id: str


class ResolveETypeTool(BaseTool):
    """Class defining the Brain Region Resolving logic."""

    name: ClassVar[str] = "resolve-etypes-tool"
    name_frontend: ClassVar[str] = "Resolve E-types"
    description: ClassVar[str] = (
        """From an E-type given, find its corresponding ID in the database."""
    )
    description_frontend: ClassVar[
        str
    ] = """Convert natural language E-type to its corresponding ID.

    Provide natural language descriptions to get corresponding technical identifiers."""
    metadata: ResolveEtypeMetadata
    input_schema: ResolveEtypeInput

    async def arun(
        self,
    ) -> ResolveEtypeOutput:
        """Given an etype in natural language, resolve its ID."""
        logger.info(f"Entering Etype resolver tool. Inputs: {self.input_schema.etype=}")

        return ResolveEtypeOutput(
            etype_name=self.input_schema.etype,
            etype_id=ETYPE_IDS[self.input_schema.etype],
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
