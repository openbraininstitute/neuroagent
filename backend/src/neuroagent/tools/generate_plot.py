"""Tool for generating plots with user-specified data and saving to storage."""

import json
import logging
from typing import Any, ClassVar, Literal

from pydantic import BaseModel, Field

from neuroagent.schemas import (
    BarplotValue,
    JSONBarplot,
    JSONPiechart,
    JSONScatterplot,
    PiechartValue,
    ScatterplotValue,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


class PlotInput(BaseModel):
    """Input schema for Plot Generator tool."""

    plot_type: Literal["json-piechart", "json-barplot", "json-scatterplot"] = Field(
        description="Type of plot to generate"
    )
    title: str = Field(description="Title for the plot")
    description: str = Field(description="Description of the plot")
    piechart_values: list[PiechartValue] | None = Field(
        None, description="List of category-value pairs for pie charts"
    )
    barplot_values: list[BarplotValue] | None = Field(
        None, description="List of category-value pairs for bar plots"
    )
    scatter_values: list[ScatterplotValue] | None = Field(
        None, description="List of points for scatter plots"
    )


class PlotMetadata(BaseMetadata):
    """Metadata for Plot Generator tool."""

    s3_client: Any  # storage client doesn't have type hints
    user_id: str
    bucket_name: str
    thread_id: str


class PlotGeneratorTool(BaseTool):
    """Tool that generates plots from user data and saves them to storage."""

    name: ClassVar[str] = "plot-generator"
    name_frontend: ClassVar[str] = "Plot Generator"
    description: ClassVar[str] = (
        "Generates a plot from user-provided data and saves it to storage. Returns the identifier of the saved plot."
    )
    description_frontend: ClassVar[str] = (
        """Generate a plot from your data and save it to storage."""
    )

    input_schema: PlotInput
    metadata: PlotMetadata

    async def arun(self) -> str:
        """Generate plot and save to storage."""
        logger.info(f"Generating {self.input_schema.plot_type}")

        plot: JSONPiechart | JSONBarplot | JSONScatterplot

        if self.input_schema.plot_type == "json-piechart":
            if not self.input_schema.piechart_values:
                raise ValueError("Piechart values are required for json-piechart")

            plot = JSONPiechart(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.piechart_values,
            )

        elif self.input_schema.plot_type == "json-barplot":
            if not self.input_schema.barplot_values:
                raise ValueError("Barplot values are required for json-barplot")

            plot = JSONBarplot(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.barplot_values,
            )

        else:  # json-scatterplot
            if not self.input_schema.scatter_values:
                raise ValueError("Scatter values are required for json-scatterplot")

            plot = JSONScatterplot(
                title=self.input_schema.title,
                description=self.input_schema.description,
                values=self.input_schema.scatter_values,
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

        return_dict = {
            "storage_id": identifier,
        }
        return json.dumps(return_dict)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if plot generator is accessible."""
        return True
