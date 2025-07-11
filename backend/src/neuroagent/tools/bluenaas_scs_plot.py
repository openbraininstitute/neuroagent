"""BlueNaaS single cell stimulation, simulation and synapse placement tool."""

import logging
from typing import Any, ClassVar
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.schemas import JSONMultiLinechart, LinechartValue, MutliLinechartSeries
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


class SCSPlotToolMetadata(BaseMetadata):
    """Metadata class for the get all simulations api."""

    httpx_client: AsyncClient
    vlab_id: UUID
    project_id: UUID
    bluenaas_url: str
    s3_client: Any  # storage client doesn't have type hints
    user_id: UUID
    bucket_name: str
    thread_id: UUID


class InputSCSPlotTool(BaseModel):
    """Inputs for the Bluenaas plot tool."""

    simulation_id: str = Field(
        description="ID of the simulation to retrieve. Should be an https link."
    )
    line_style: str | None = Field(
        default="solid",
        description="Line style for line chart (e.g., 'solid', 'dashed', 'dotted')",
    )


class SCSPlotToolOutput(BaseModel):
    """Output for the Bluenaas plot tool."""

    storage_id: list[str]
    simulation_labels: list[str]


class SCSPlotTool(BaseTool):
    """Class defining the SCSPlot tool."""

    name: ClassVar[str] = "scsplot-tool"
    name_frontend: ClassVar[str] = "Plot Single-Neuron Simulation"
    description: ClassVar[
        str
    ] = """Make a plot of the single cell simulation, based on its id.
    The id can be retrieved using the 'scs-getall-tool', from the simulation report of `scs-post-tool` or directly specified by the user.
    The plots will be shown before your message automatically.  Use the simulaton label to refer to the plots. DO NOT MENTION the storage id nor the simulation ID. DO NOT EMBED the plots in the text."""
    description_frontend: ClassVar[
        str
    ] = """Make a plot from the result of your single cell simulation.

    Provide the simulation ID to plot it."""
    metadata: SCSPlotToolMetadata
    input_schema: InputSCSPlotTool

    async def arun(self) -> SCSPlotToolOutput:
        """Run the SCSPlotTool tool."""
        logger.info(
            f"Running SCSPlotTool tool with inputs {self.input_schema.model_dump()}"
        )

        # Get the simulation result from nexus.
        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.bluenaas_url}/simulation/single-neuron/{self.metadata.vlab_id}/{self.metadata.project_id}/{self.input_schema.simulation_id}",
        )

        # Plot the result.
        result = response.json()
        plots = []
        titles = []
        for recording in result["results"].keys():
            to_plot = []
            for stimulus_amp in result["results"][recording]:
                x_y_combined = [
                    LinechartValue(x=x, y=y)
                    for x, y in zip(stimulus_amp["x"], stimulus_amp["y"])
                ]
                to_plot.append(
                    MutliLinechartSeries(
                        series_label=stimulus_amp["name"],
                        data=x_y_combined,
                    )
                )
            titles.append(f"Recording location: {recording}")
            plots.append(
                JSONMultiLinechart(
                    title=f"Recording location: {recording}",
                    description="",
                    values=to_plot,
                    x_label="Time [ms]",
                    y_label="Voltage [mV]",
                    line_style=self.input_schema.line_style,
                    line_color=None,  # Multiple plots so we make it default for now
                )
            )

        identifiers = [
            save_to_storage(
                s3_client=self.metadata.s3_client,
                bucket_name=self.metadata.bucket_name,
                user_id=self.metadata.user_id,
                content_type="application/json",
                category=plot.category,
                body=plot.model_dump_json(),
                thread_id=self.metadata.thread_id,
            )
            for plot in plots
        ]

        return SCSPlotToolOutput(storage_id=identifiers, simulation_labels=titles)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, bluenaas_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            bluenaas_url,
        )
        return response.status_code == 200
