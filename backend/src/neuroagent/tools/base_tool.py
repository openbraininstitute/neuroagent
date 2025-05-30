"""Base tool."""

import logging
from abc import ABC, abstractmethod
from typing import Any, ClassVar, Literal

from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)


EtypesLiteral = Literal[
    "bSTUT",
    "dSTUT",
    "bNAC",
    "cSTUT",
    "dNAC",
    "bAC",
    "cIR",
    "cAC",
    "cACint",
    "bIR",
    "cNAC",
    "cAD",
    "cADpyr",
    "cAD_ltb",
    "cNAD_ltb",
    "cAD_noscltb",
    "cNAD_noscltb",
    "dAD_ltb",
    "dNAD_ltb",
]
ETYPE_IDS = {
    "bSTUT": "http://uri.interlex.org/base/ilx_0738200",
    "dSTUT": "http://uri.interlex.org/base/ilx_0738202",
    "bNAC": "http://uri.interlex.org/base/ilx_0738203",
    "cSTUT": "http://uri.interlex.org/base/ilx_0738198",
    "dNAC": "http://uri.interlex.org/base/ilx_0738205",
    "bAC": "http://uri.interlex.org/base/ilx_0738199",
    "cIR": "http://uri.interlex.org/base/ilx_0738204",
    "cAC": "http://uri.interlex.org/base/ilx_0738197",
    "cACint": "http://bbp.epfl.ch/neurosciencegraph/ontologies/etypes/cACint",
    "bIR": "http://uri.interlex.org/base/ilx_0738206",
    "cNAC": "http://uri.interlex.org/base/ilx_0738201",
    "cAD": "http://uri.interlex.org/base/ilx_0738207",  # Both are the same id, what's the purpose ?
    "cADpyr": "http://uri.interlex.org/base/ilx_0738207",  # Both are the same id, what's the purpose ?
    "cAD_ltb": "http://uri.interlex.org/base/ilx_0738255",
    "cNAD_ltb": "http://uri.interlex.org/base/ilx_0738254",
    "cAD_noscltb": "http://uri.interlex.org/base/ilx_0738250",
    "cNAD_noscltb": "http://uri.interlex.org/base/ilx_0738249",
    "dAD_ltb": "http://uri.interlex.org/base/ilx_0738258",
    "dNAD_ltb": "http://uri.interlex.org/base/ilx_0738256",
}


class BaseMetadata(BaseModel):
    """Base class for metadata."""

    model_config = ConfigDict(extra="ignore", arbitrary_types_allowed=True)


class BaseTool(BaseModel, ABC):
    """Base class for the tools."""

    name: ClassVar[str]
    name_frontend: ClassVar[str] = ""
    description: ClassVar[str]
    description_frontend: ClassVar[str] = ""
    metadata: BaseMetadata
    input_schema: BaseModel
    hil: ClassVar[bool] = False
    json_schema: ClassVar[dict[str, Any] | None] = None

    @classmethod
    def pydantic_to_openai_schema(cls) -> dict[str, Any]:
        """Convert pydantic schema to OpenAI json."""
        if cls.json_schema is not None:
            parameters = cls.json_schema
        else:
            parameters = cls.__annotations__["input_schema"].model_json_schema()

        new_retval: dict[str, Any] = {
            "type": "function",
            "function": {
                "name": cls.name,
                "description": cls.description,
                "strict": False,
                "parameters": parameters,
            },
        }
        new_retval["function"]["parameters"]["additionalProperties"] = False

        return new_retval

    @abstractmethod
    async def arun(self) -> BaseModel:
        """Run the tool."""

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        By default, we assume the tool is online.
        This method can be overridden by the tool to check if it is online. All the parameters
        need to be inside the `get_healthcheck_variables` dependency.
        """
        return False
