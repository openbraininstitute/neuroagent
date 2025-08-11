"""Tool for generating plots with user-specified data and saving to storage."""

import logging
from typing import Any, ClassVar, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from neuroagent.schemas import (
    BarplotValue,
    JSONBarplot,
    JSONHistogram,
    JSONLinechart,
    JSONPiechart,
    JSONScatterplot,
    LinechartValue,
    PiechartValue,
    ScatterplotValue,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


class PlotInput(BaseModel):
    """Input schema for Plot Generator tool."""

    plot_type: Literal[
        "json-piechart",
        "json-barplot",
        "json-scatterplot",
        "json-histogram",
        "json-linechart",
    ] = Field(description="Type of plot to generate")
    title: str = Field(description="Title for the plot")
    description: str = Field(description="Description of the plot")
    x_label: str | None = Field(None, description="Optional label for x-axis")
    y_label: str | None = Field(None, description="Optional label for y-axis")
    piechart_values: list[PiechartValue] | None = Field(
        None, description="List of category-value pairs for pie charts"
    )
    barplot_values: list[BarplotValue] | None = Field(
        None, description="List of category-value pairs for bar plots"
    )
    scatter_values: list[ScatterplotValue] | None = Field(
        None, description="List of points for scatter plots"
    )
    histogram_values: list[float] | None = Field(
        None, description="List of values for histogram"
    )
    histogram_bins: int | None = Field(
        default=10, description="Number of bins for histogram"
    )
    histogram_color: str | None = Field(
        None, description="Optional hex color code for histogram bars"
    )
    linechart_values: list[LinechartValue] | None = Field(
        None,
        description="List of points for line charts. 30 points max.",  # Not putting an explicit constraint on length
    )
    line_style: str | None = Field(
        default="solid",
        description="Line style for line chart (e.g., 'solid', 'dashed', 'dotted')",
    )
    line_color: str | None = Field(None, description="Hex color code for line chart")


class PlotMetadata(BaseMetadata):
    """Metadata for Plot Generator tool."""

    s3_client: Any  # storage client doesn't have type hints
    user_id: UUID
    bucket_name: str
    thread_id: UUID


class PlotGeneratorToolOutput(BaseModel):
    """Output class for the plot generator."""

    storage_id: str


class PlotGeneratorTool(BaseTool):
    """Tool that generates plots from user data and saves them to storage."""

    name: ClassVar[str] = "plot-generator"
    name_frontend: ClassVar[str] = "Plot Generator"
    utterances: ClassVar[list[str]] = [
        "Can you plot the results?",
        "Create a visualization of this data",
        "Generate a chart for me",
    ]
    description: ClassVar[str] = """Generates a plot from user-provided data.
        - This tool requires x-y coordinate data to create plots.
        - Never invent plot values - always obtain them from tools or prior conversation data.
        - For mathematical functions: FIRST use the `execute-python-code` tool to calculate the x-y values (NO matplotlib - just numpy calculations), THEN use this tool to plot them.
        - Limit the number of plotted points, but ALWAYS CONSERVE THE FULL RANGE. For instance if a plot contains 1000 data points where the x-axis goes from -5 to 5, select only 30 evenly distributed points between -5 and 5.
        - The plots will be shown before your message automatically.
        - DO NOT mention storage ids. You can mention the title to refer to plots."""
    description_frontend: ClassVar[
        str
    ] = """Generate a plot from your data and save it to storage. Available plot types:
    • Pie charts - For displaying proportions of a whole
    • Bar plots - For comparing quantities across categories
    • Scatter plots - For showing relationships between two variables
    • Histograms - For displaying distribution of numerical data
    • Line charts - For showing trends over a continuous range"""
    metadata: PlotMetadata
    input_schema: PlotInput

    async def arun(self) -> PlotGeneratorToolOutput:
        """Generate plot and save to storage."""
        logger.info(f"Generating {self.input_schema.plot_type}")

        plot: (
            JSONPiechart | JSONBarplot | JSONScatterplot | JSONHistogram | JSONLinechart
        )

        if self.input_schema.plot_type == "json-piechart":
            if not self.input_schema.piechart_values:
                raise ValueError("Piechart values are required for json-piechart")

            plot = JSONPiechart(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.piechart_values,
                x_label=self.input_schema.x_label,
                y_label=self.input_schema.y_label,
            )

        elif self.input_schema.plot_type == "json-barplot":
            if not self.input_schema.barplot_values:
                raise ValueError("Barplot values are required for json-barplot")

            plot = JSONBarplot(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.barplot_values,
                x_label=self.input_schema.x_label,
                y_label=self.input_schema.y_label,
            )

        elif self.input_schema.plot_type == "json-histogram":
            if not self.input_schema.histogram_values:
                raise ValueError("Histogram values are required for json-histogram")

            plot = JSONHistogram(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.histogram_values,
                bins=self.input_schema.histogram_bins,
                color=self.input_schema.histogram_color,
                x_label=self.input_schema.x_label,
                y_label=self.input_schema.y_label,
            )

        elif self.input_schema.plot_type == "json-linechart":
            if not self.input_schema.linechart_values:
                raise ValueError("Line chart values are required for json-linechart")

            plot = JSONLinechart(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.linechart_values,
                x_label=self.input_schema.x_label,
                y_label=self.input_schema.y_label,
                line_style=self.input_schema.line_style,
                line_color=self.input_schema.line_color,
            )

        else:  # json-scatterplot
            if not self.input_schema.scatter_values:
                raise ValueError("Scatter values are required for json-scatterplot")

            plot = JSONScatterplot(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.scatter_values,
                x_label=self.input_schema.x_label,
                y_label=self.input_schema.y_label,
            )

        identifier = save_to_storage(
            s3_client=self.metadata.s3_client,
            bucket_name=self.metadata.bucket_name,
            user_id=self.metadata.user_id,
            content_type="application/json",
            category=plot.category,
            body=plot.model_dump_json(),
            thread_id=self.metadata.thread_id,
        )

        return PlotGeneratorToolOutput(storage_id=identifier)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if plot generator is accessible."""
        return True
