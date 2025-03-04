"""Morphology viewer tool."""

import io
import json
import logging
from typing import Any, ClassVar, Literal

import matplotlib.pyplot as plt
from neurom import NeuriteType, load_morphology
from neurom.view import plot_dendrogram, plot_morph, plot_morph3d
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import AgentsNames, BaseMetadata, BaseTool
from neuroagent.utils import get_kg_data, save_to_storage

logger = logging.getLogger(__name__)


class MorphologyViewerInput(BaseModel):
    """Input schema for Morphology Viewer tool."""

    morphology_id: str = Field(
        description=(
            "ID of the morphology of interest. A morphology ID is an HTTP(S) link"
        )
    )
    plot_type: Literal["2d", "3d", "dendrogram"] = Field(
        description="Type of visualization to generate"
    )
    neurite_types: list[str] | None = Field(
        default=None,
        description="""Types of neurites to display. Options are:
        - 'all': show all neurites
        - 'axon': show only axons
        - 'basal_dendrite': show only basal dendrites
        - 'apical_dendrite': show only apical dendrites
        - 'undefined': show undefined neurites
        You can specify multiple types as a list.""",
    )
    color: str | None = Field(
        default=None,
        description="Custom color for the visualization (e.g. 'red', 'blue', '#FF0000'). If not specified, default colors will be used",
    )
    alpha: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Transparency of the visualization (0.0 to 1.0)",
    )
    linewidth: float = Field(
        default=1.2, gt=0.0, description="Width of the lines in the visualization"
    )
    diameter_scale: float = Field(
        default=1.0, gt=0.0, description="Scale factor for neurite diameters"
    )
    show_diameters: bool = Field(
        default=True,
        description="For dendrograms only: whether to show node diameters or plain lines",
    )

    def get_neurite_types(self) -> NeuriteType | tuple[NeuriteType, ...]:
        """Convert string neurite types to NeuriteType enum values."""
        if not self.neurite_types:
            return NeuriteType.all

        type_map = {
            "all": NeuriteType.all,
            "axon": NeuriteType.axon,
            "basal_dendrite": NeuriteType.basal_dendrite,
            "apical_dendrite": NeuriteType.apical_dendrite,
            "undefined": NeuriteType.undefined,
        }

        types = [type_map[t] for t in self.neurite_types if t in type_map]
        if not types:
            return NeuriteType.all
        if len(types) == 1:
            return types[0]
        return tuple(types)


class MorphologyViewerMetadata(BaseMetadata):
    """Metadata for MorphologyViewerTool."""

    knowledge_graph_url: str
    token: str
    s3_client: Any  # boto3 client
    user_id: str
    bucket_name: str
    thread_id: str


class MorphologyViewerTool(BaseTool):
    """Tool for visualizing neuron morphologies."""

    name: ClassVar[str] = "morpho-viewer-tool"
    name_frontend: ClassVar[str] = "Morphology Viewer"
    description: ClassVar[
        str
    ] = """Given a morphology ID, generate a visualization of the neuron. You can choose between:
    - 2d view: shows a 2D projection of the neuron
    - 3d view: shows a 3D representation of the neuron
    - dendrogram: shows the branching structure of the neuron
    The morphology ID must come from the 'get-morpho-tool'."""
    description_frontend: ClassVar[
        str
    ] = """Visualize neuron morphologies in different ways:
    • 2D projection
    • 3D representation
    • Dendrogram (branching structure)

    Provide a morphology ID to generate the visualization."""
    agent: ClassVar[AgentsNames] = AgentsNames.EXPLORE_AGENT
    input_schema: MorphologyViewerInput
    metadata: MorphologyViewerMetadata

    async def arun(self) -> str:
        """Generate visualization of the morphology."""
        logger.info(
            f"Generating {self.input_schema.plot_type} view for morphology {self.input_schema.morphology_id}"
        )

        # Download the morphology file
        morphology_content, metadata = await get_kg_data(
            object_id=self.input_schema.morphology_id,
            httpx_client=self.metadata.httpx_client,
            url=self.metadata.knowledge_graph_url,
            token=self.metadata.token,
            preferred_format="swc",
        )

        # Load the morphology
        morpho = load_morphology(
            morphology_content.decode(), reader=metadata.file_extension
        )

        # Create figure with appropriate projection
        if self.input_schema.plot_type == "3d":
            fig = plt.figure(figsize=(10, 10))
            ax = fig.add_subplot(111, projection="3d")
        else:
            fig, ax = plt.subplots(figsize=(10, 10))

        # Get neurite types to display
        neurite_types = self.input_schema.get_neurite_types()

        # Generate the requested plot type with customization parameters
        if self.input_schema.plot_type == "2d":
            plot_morph(
                morpho,
                ax=ax,
                neurite_type=neurite_types,
                color=self.input_schema.color,
                alpha=self.input_schema.alpha,
                linewidth=self.input_schema.linewidth,
                diameter_scale=self.input_schema.diameter_scale,
            )
            plt.title("2D Morphology View")
        elif self.input_schema.plot_type == "3d":
            plot_morph3d(
                morpho,
                ax=ax,
                neurite_type=neurite_types,
                color=self.input_schema.color,
                alpha=self.input_schema.alpha,
                linewidth=self.input_schema.linewidth,
                diameter_scale=self.input_schema.diameter_scale,
            )
            plt.title("3D Morphology View")
        else:  # dendrogram
            plot_dendrogram(
                morpho, ax=ax, show_diameters=self.input_schema.show_diameters
            )
            plt.title("Morphology Dendrogram")

        # Save plot to bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches="tight")
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

        return json.dumps({"storage_id": identifier})

    @classmethod
    async def is_online(cls, *, httpx_client: Any, knowledge_graph_url: str) -> bool:
        """Check if the tool is online."""
        response = await httpx_client.get(
            f"{knowledge_graph_url.rstrip('/')}/version",
        )
        return response.status_code == 200
