"""Tool for generating random plot data and saving to S3."""

import io
import json
import logging
import random
from typing import Any, ClassVar, Literal

import matplotlib.pyplot as plt
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


class RandomPlotInput(BaseModel):
    """Input schema for Random Plot Generator tool."""

    plot_type: Literal[
        "json-piechart", "json-barplot", "json-scatterplot", "matplotlib-scatterplot"
    ] = Field(description="Type of plot to generate")
    n_points: int = Field(
        description="Number of data points for the plot", ge=1, le=100
    )


class RandomPlotMetadata(BaseMetadata):
    """Metadata for Random Plot Generator tool."""

    s3_client: Any  # boto3 client doesn't have type hints
    user_id: str
    bucket_name: str
    thread_id: str


class RandomPlotGeneratorTool(BaseTool):
    """Tool that generates random plot data and saves it to object storage."""

    name: ClassVar[str] = "random-plot-generator"
    name_frontend: ClassVar[str] = "Random Plot Generator"
    description: ClassVar[str] = (
        "Generates a random plot and saves it to internal storage. Returns the identifier of the saved plot."
    )
    description_frontend: ClassVar[str] = (
        """Generate a random plot and save it to object storage."""
    )

    input_schema: RandomPlotInput
    metadata: RandomPlotMetadata

    async def arun(self) -> str:
        """Generate random plot and save to object storage."""
        logger.info(
            f"Generating {self.input_schema.plot_type} with {self.input_schema.n_points} points"
        )

        # define type of plot (for mypy)
        plot: JSONBarplot | JSONPiechart | JSONScatterplot

        # Generate random plot data based on type
        if self.input_schema.plot_type == "matplotlib-scatterplot":
            # Create the scatter plot
            plt.figure(figsize=(10, 6))
            x = [random.uniform(-100, 100) for _ in range(self.input_schema.n_points)]  # nosec B311
            y = [random.uniform(-100, 100) for _ in range(self.input_schema.n_points)]  # nosec B311
            plt.scatter(x, y)
            plt.title(f"Random Scatterplot ({self.input_schema.n_points} points)")
            plt.xlabel("X axis")
            plt.ylabel("Y axis")

            # Save plot to bytes buffer
            buf = io.BytesIO()
            plt.savefig(buf, format="png")
            plt.close()
            buf.seek(0)

            # Save to storage
            identifier = save_to_storage(
                s3_client=self.metadata.s3_client,
                bucket_name=self.metadata.bucket_name,
                user_id=self.metadata.user_id,
                content_type="image/png",
                category="image",
                body=buf.getvalue(),
                thread_id=self.metadata.thread_id,
            )

            return_dict = {
                "storage_id": identifier,
            }
            return json.dumps(return_dict)

        elif self.input_schema.plot_type == "json-piechart":
            values = [
                PiechartValue(
                    category=f"class_{i}",
                    value=random.randint(0, 1000),  # nosec B311
                )
                for i in range(self.input_schema.n_points)
            ]
            plot = JSONPiechart(
                title=f"Random Piechart ({self.input_schema.n_points} classes)",
                description="Randomly generated piechart data",
                values=values,
                show_percentages=True,
            )

        elif self.input_schema.plot_type == "json-barplot":
            values = [
                BarplotValue(
                    category=f"category_{i}",
                    value=random.uniform(0, 100),  # nosec B311
                )
                for i in range(self.input_schema.n_points)
            ]
            plot = JSONBarplot(
                title=f"Random Barplot ({self.input_schema.n_points} categories)",
                description="Randomly generated barplot data",
                values=values,
                orientation="vertical",
            )

        else:  # json-scatterplot
            values = [
                ScatterplotValue(
                    x=random.uniform(-100, 100),  # nosec B311
                    y=random.uniform(-100, 100),  # nosec B311
                )
                for _ in range(self.input_schema.n_points)
            ]
            plot = JSONScatterplot(
                title=f"Random Scatterplot ({self.input_schema.n_points} points)",
                description="Randomly generated scatterplot data",
                values=values,
            )

        # Save to storage
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
        """Check if generate random plot is accessible."""
        return True
