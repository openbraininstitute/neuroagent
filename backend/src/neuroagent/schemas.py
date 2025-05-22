"""Pydantic Schemas."""

from typing import ClassVar, Literal

from pydantic import BaseModel, Field


class KGMetadata(BaseModel):
    """Knowledge Graph Metadata."""

    file_extension: str
    brain_region: str
    is_lnmc: bool = False


Category = Literal[
    "image",
    "json-barplot",
    "json-histogram",
    "json-linechart",
    "json-piechart",
    "json-scatterplot",
    "json-multi-linechart",
]


class BaseObject(BaseModel):
    """Base storage schema for all plot types."""

    category: ClassVar[Category]
    title: str = Field(description="Title of the plot")
    description: str = Field(description="Description of what the plot represents")
    x_label: str | None = Field(None, description="Label for x-axis")
    y_label: str | None = Field(None, description="Label for y-axis")


class PiechartValue(BaseModel):
    """Individual value for piechart."""

    category: str = Field(description="Category name")
    value: int = Field(description="Count or value for the category")
    color: str | None = Field(
        None, description="Optional hex color code for this segment"
    )


class JSONPiechart(BaseObject):
    """JSON piechart schema with improved structure."""

    category: ClassVar[Category] = "json-piechart"
    values: list[PiechartValue] = Field(description="List of category-value pairs")
    show_percentages: bool = Field(
        default=True, description="Whether to show percentage labels"
    )


class BarplotValue(BaseModel):
    """Individual value for barplot."""

    category: str = Field(description="Category name")
    value: float = Field(description="Numeric value")
    error: float | None = Field(None, description="Optional error bar value")
    color: str | None = Field(None, description="Optional hex color code for this bar")


class JSONBarplot(BaseObject):
    """JSON barplot schema with improved structure."""

    category: ClassVar[Category] = "json-barplot"
    values: list[BarplotValue] = Field(description="List of category-value pairs")
    orientation: Literal["vertical", "horizontal"] = Field(
        default="vertical", description="Orientation of the bars"
    )


class ScatterplotValue(BaseModel):
    """Individual point for scatterplot."""

    x: float = Field(description="X coordinate")
    y: float = Field(description="Y coordinate")
    label: str | None = Field(None, description="Optional point label")
    color: str | None = Field(
        None, description="Optional hex color code for this point"
    )
    size: float | None = Field(None, description="Optional point size")


class JSONScatterplot(BaseObject):
    """JSON scatterplot schema with improved structure."""

    category: ClassVar[Category] = "json-scatterplot"
    values: list[ScatterplotValue] = Field(description="List of points")
    show_regression: bool = Field(
        default=False, description="Whether to show regression line"
    )


class JSONHistogram(BaseObject):
    """JSON histogram schema similar to numpy's histogram function."""

    category: ClassVar[Category] = "json-histogram"
    values: list[float] = Field(description="List of values to bin")
    bins: int = Field(default=10, description="Number of equal-width bins", gt=0)
    color: str | None = Field(
        None, description="Optional hex color code for the histogram bars"
    )


class LinechartValue(BaseModel):
    """Individual point for linechart."""

    x: float = Field(description="X coordinate")
    y: float = Field(description="Y coordinate")
    label: str | None = Field(None, description="Optional point label")


class JSONLinechart(BaseObject):
    """JSON linechart schema for plotting line graphs."""

    category: ClassVar[Category] = "json-linechart"
    values: list[LinechartValue] = Field(
        description="List of points to connect with lines"
    )
    show_points: bool = Field(
        default=True, description="Whether to show individual points on the line"
    )
    line_style: str | None = Field(
        default="solid", description="Line style (e.g., 'solid', 'dashed', 'dotted')"
    )
    line_color: str | None = Field(None, description="Hex color code for the line")


class MutliLinechartSeries(BaseModel):
    """Individual point for linechart."""

    data: list[LinechartValue] = Field(description="X and Y data to plot")
    series_label: str | None = Field(None, description="series label")


class JSONMultiLinechart(BaseObject):
    """JSON linechart schema for plotting line graphs."""

    category: ClassVar[Category] = "json-multi-linechart"
    values: list[MutliLinechartSeries] = Field(description="data")
    show_points: bool = Field(
        default=True, description="Whether to show individual points on the line"
    )
    line_style: str | None = Field(
        default="solid", description="Line style (e.g., 'solid', 'dashed', 'dotted')"
    )
    line_color: str | None = Field(None, description="Hex color code for the line")


class EmbeddedBrainRegion(BaseModel):
    """Brain region schema."""

    id: str
    name: str
    hierarchy_level: int
    name_embedding: list[float] | None = None


class EmbeddedBrainRegions(BaseModel):
    """Schema for dumping."""

    regions: list[EmbeddedBrainRegion]
    hierarchy_id: str
