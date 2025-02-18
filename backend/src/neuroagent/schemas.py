"""Pydantic Schemas."""

from typing import ClassVar, Literal

from pydantic import BaseModel


class KGMetadata(BaseModel):
    """Knowledge Graph Metadata."""

    file_extension: str
    brain_region: str
    is_lnmc: bool = False


Category = Literal[
    "image",
    "json-barplot",
    "json-piechart",
    "json-scatterplot",
]


class BaseObject(BaseModel):
    """Base storage schema."""

    category: ClassVar[Category]
    title: str
    description: str


class JSONPiechart(BaseObject):
    """JSON piechart schema."""

    category: ClassVar[Category] = "json-piechart"
    values: dict[str, int]


class JSONBarplot(BaseObject):
    """JSON barplot schema."""

    category: ClassVar[Category] = "json-barplot"
    values: list[tuple[str, float]]


class JSONScatterplot(BaseObject):
    """JSON scatterplot schema."""

    category: ClassVar[Category] = "json-scatterplot"
    values: list[tuple[float, float]]
