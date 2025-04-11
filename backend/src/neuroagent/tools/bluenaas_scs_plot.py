"""BlueNaaS single cell stimulation, simulation and synapse placement tool."""

import logging
from typing import Any, ClassVar

from httpx import AsyncClient
from pydantic import BaseModel, Field

from neuroagent.schemas import JSONMultiLinechart, LinechartValue, MutliLinechartSeries
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


class SCSPlotToolMetadata(BaseMetadata):
    """Metadata class for the get all simulations api."""

    token: str
    vlab_id: str
    project_id: str
    bluenaas_url: str
    s3_client: Any  # storage client doesn't have type hints
    user_id: str
    bucket_name: str
    thread_id: str


class InputSCSPlotTool(BaseModel):
    """Inputs for the Bluenaas plot tool."""

    simulation_id: str = Field(
        description="ID of the simulation to retrieve. Should be an https link."
    )


class SCSPlotToolOutput(BaseModel):
    """Output for the Bluenaas plot tool."""

    storage_id: str


class SCSPlotTool(BaseTool):
    """Class defining the SCSGetOne tool."""

    name: ClassVar[str] = "scsgetone-plot"
    name_frontend: ClassVar[str] = "Plot Single-Neuron Simulation"
    description: ClassVar[str] = """Make a plot of the simulation, based on its id.
    The id can be retrieved using the 'scs-getall-tool', from the simulation report of `scs-post-tool` or directly specified by the user.
    The plots will be shown after your message automatically. DO NOT MENTION the storage id no the simulation ID. DO NOT EMBED the plot in your message."""
    description_frontend: ClassVar[
        str
    ] = """Make a plot from the result of your simulation.

    Provide the simulation ID to get its detailed information."""
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
            headers={"Authorization": f"Bearer {self.metadata.token}"},
        )

        # Plot the result.
        result = response.json()
        to_plot = []
        for key in result["results"].keys():
            for recording in result["results"][key]:
                x_y_combined = [
                    LinechartValue(x=x, y=y)
                    for x, y in zip(recording["x"], recording["y"])
                ]
                to_plot.append(
                    MutliLinechartSeries(
                        series_label=recording["name"], data=x_y_combined
                    )
                )
        breakpoint()
        plot = JSONMultiLinechart(
            title=result["name"],
            description="",
            values=to_plot,
            x_label="Time [ms]",
            y_label="Voltage [mV]",
            line_style=None,  # self.input_schema.line_style,
            line_color=None,  # self.input_schema.line_color,
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

        return SCSPlotToolOutput(storage_id=identifier)

    @classmethod
    async def is_online(cls, *, httpx_client: AsyncClient, bluenaas_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            bluenaas_url,
        )
        return response.status_code == 200
