"""Tool for running any kind of python code."""

import base64
import json
import logging

# Override needed due to our python version
# Must run before importing RunError and RunSuccess
import typing
from typing import Any, ClassVar, TypeAlias
from uuid import UUID

from pydantic import BaseModel, Field
from typing_extensions import TypedDict as _TypedDict

from neuroagent.schemas import (
    BarplotValue,
    JSONBarplot,
    JSONHistogram,
    JSONLinechart,
    JSONMultiLinechart,
    JSONPiechart,
    JSONScatterplot,
    LinechartValue,
    MutliLinechartSeries,
    PiechartValue,
    ScatterplotValue,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

typing.TypedDict = _TypedDict  # noqa: E402

from mcp_run_python.code_sandbox import CodeSandbox, RunError, RunSuccess  # noqa: E402

logger = logging.getLogger(__name__)

JsonData: TypeAlias = Any


class RunPythonInput(BaseModel):
    """Input schema for Plot Generator tool."""

    python_script: str = Field(description="Python code to run")


class RunPythonMetadata(BaseMetadata):
    """Metadata for Plot Generator tool."""

    python_sandbox: CodeSandbox
    s3_client: Any  # boto3 client
    user_id: UUID
    bucket_name: str
    thread_id: UUID
    vlab_id: UUID | None
    project_id: UUID | None


class RunPythonOutput(BaseModel):
    """Output class for the plot generator."""

    result: RunSuccess | RunError
    storage_id: list[str]


class RunPythonTool(BaseTool):
    """Tool that safely runs any python script."""

    name: ClassVar[str] = "run-python"
    name_frontend: ClassVar[str] = "Run Python"
    utterances: ClassVar[list[str]] = [
        "Compute the mean of the output",
        "Compute the numerical value of the integral of the function between -10 and 10.",
        "Plot a Gaussian distribution with mean 0 and std 1.",
    ]
    description: ClassVar[
        str
    ] = """Tool to execute Python code and return stdout, stderr, and return value.
    The code may be async, and the value on the last line will be returned as the return value.
    The code will be executed with Python 3.12.
    AVAILABLE LIBRARIES:
    - Standard Python libraries (math, os, sys, json, datetime, etc.)
    - Numpy
    - Pydantic
    - Matplotlib
    The tool can be used to display plots through matplotlib.
    Figures defined in matplotlib will automatically be shown in the chat. Do not save them to disk.
    Only the matplotlib library is able to plot in the chat.
    Unless explicitly asked, the plots should be individual plots, not subplots.
    The images are not downloadable. Do not offer to download them."""
    description_frontend: ClassVar[str] = (
        """Tool to execute Python code and return stdout, stderr, and return value.\n\nThe code may be async, and the value on the last line will be returned as the return value.\n\nThe code will be executed with Python 3.12.\n\nAVAILABLE LIBRARIES:\n- Standard Python libraries (math, os, sys, json, datetime, etc.)\n- Numpy\n- Pydantic."""
    )
    metadata: RunPythonMetadata
    input_schema: RunPythonInput

    async def arun(self) -> RunPythonOutput:
        """Run arbitrary python code."""
        # If matplotlib is imported, we inject figure parsing code
        if (
            "import matplotlib" in self.input_schema.python_script
            or "from matplotlib" in self.input_schema.python_script
        ):
            code = self.inject_user_script(self.input_schema.python_script)
        else:
            code = self.input_schema.python_script

        # Run the entire code
        result = await self.metadata.python_sandbox.eval(code)

        identifiers = []
        if (
            "import matplotlib" in self.input_schema.python_script
            or "from matplotlib" in self.input_schema.python_script
        ):
            # If we have potential images, upload them to the store
            # Get the plot stdout for parsing
            fig_list = []
            for i, elem in enumerate(result["output"]):
                try:
                    output = json.loads(elem)
                    if "_plots" in output:
                        fig_list = output["_plots"]
                        result["output"].pop(i)
                        break
                except json.JSONDecodeError:
                    continue
            if fig_list:
                pydantic_plots = self.parse_figures(fig_list=fig_list)
                # Save images to storage
                for plot in pydantic_plots:
                    identifiers.append(
                        save_to_storage(
                            s3_client=self.metadata.s3_client,
                            bucket_name=self.metadata.bucket_name,
                            user_id=self.metadata.user_id,
                            content_type="image/png"
                            if isinstance(plot, bytes)
                            else "application/json",
                            category="image"
                            if isinstance(plot, bytes)
                            else plot.category,
                            body=plot
                            if isinstance(plot, bytes)
                            else plot.model_dump_json(),
                            thread_id=self.metadata.thread_id,
                        )
                    )
        if result["status"] == "success":
            out_class = RunSuccess(**result)
        else:
            out_class = RunError(**result)
        return RunPythonOutput(result=out_class, storage_id=identifiers)

    @staticmethod
    def parse_figures(
        fig_list: list[dict[str, Any]],
    ) -> list[
        JSONPiechart
        | JSONBarplot
        | JSONScatterplot
        | JSONHistogram
        | JSONLinechart
        | JSONMultiLinechart
        | bytes
    ]:
        """Given the raw figure output of the python script, parse them into frontend compatible ones."""
        plots = []
        for fig in fig_list:
            plot_type = fig.get("plot_type")

            # Extract common fields
            common_fields = {
                "title": fig.get("title"),
                "description": fig.get("description"),
                "x_label": fig.get("x_label"),
                "y_label": fig.get("y_label"),
            }

            if plot_type == "pie":
                # Parse pie chart
                values = [PiechartValue(**val) for val in fig.get("values", [])]
                pie_chart = JSONPiechart(
                    **common_fields, values=values, show_percentages=False
                )
                plots.append(pie_chart)

            elif plot_type == "bar":
                # Parse bar plot
                values = [BarplotValue(**val) for val in fig.get("values", [])]
                bar_plot = JSONBarplot(
                    **common_fields,
                    values=values,
                    orientation=fig.get("orientation", "vertical"),
                )
                plots.append(bar_plot)

            elif plot_type == "histogram":
                # Parse histogram
                histogram = JSONHistogram(
                    **common_fields,
                    values=fig.get("values", []),
                    bins=fig.get("bins"),
                    color=fig.get("color"),
                )
                plots.append(histogram)

            elif plot_type == "scatter":
                # Parse scatter plot
                values = [ScatterplotValue(**val) for val in fig.get("values", [])]
                scatter_plot = JSONScatterplot(
                    **common_fields,
                    values=values,
                    show_regression=fig.get("show_regression", False),
                )
                plots.append(scatter_plot)

            elif plot_type == "line":
                # Parse single line chart
                values = [LinechartValue(**val) for val in fig.get("values", [])]
                line_chart = JSONLinechart(**common_fields, values=values)
                plots.append(line_chart)

            elif plot_type == "multi-line":
                # Parse multi-line chart
                series_list = []
                for series_data in fig.get("values", []):
                    line_values = [
                        LinechartValue(**point) for point in series_data.get("data", [])
                    ]
                    series = MutliLinechartSeries(
                        data=line_values, series_label=series_data.get("series_label")
                    )
                    series_list.append(series)

                multi_line_chart = JSONMultiLinechart(
                    **common_fields,
                    values=series_list,
                    show_points=fig.get("show_points", True),
                    line_style=fig.get("line_style", "solid"),
                    line_color=fig.get("line_color"),
                )
                plots.append(multi_line_chart)
            elif plot_type == "image":
                b64_image = fig.get("png_base64")
                if b64_image:
                    plots.append(base64.b64decode(b64_image))

        return plots

    @staticmethod
    def inject_user_script(script) -> str:
        """Inject user's script with custom logic."""
        # This code allows to tranfer the figures to the tool for frontend displaying.
        pre_injected_code = '''
import io
import base64
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as _plt
import numpy as np

def _color_to_hex(color):
    """Convert matplotlib color to hex string."""
    try:
        from matplotlib.colors import to_hex
        if isinstance(color, (list, tuple, np.ndarray)):
            if len(color) >= 3:
                return to_hex(color[:3])
        return to_hex(color)
    except:
        return None


def _print_plot_data_to_stdout():
    """Extract matplotlib plots and print raw data to stdout."""
    all_plots = []
    for fig_num in _plt.get_fignums():
        fig = _plt.figure(fig_num)
        axes = fig.get_axes()
        recognized = False

        for ax in axes:
            # Common metadata
            metadata = {
                'title': ax.get_title() or None,
                'description': ax.get_label() or None,
                'x_label': ax.get_xlabel() or None,
                'y_label': ax.get_ylabel() or None,
            }

            # Check for pie charts first
            wedges = [p for p in ax.patches if isinstance(p, matplotlib.patches.Wedge)]
            if wedges and len(wedges) == len(ax.patches):
                pie_data = {
                    'plot_type': 'pie',
                    **metadata,
                    'values': []
                }

                # Extract wedge data
                for w in wedges:
                    angle = w.theta2 - w.theta1
                    fraction = angle / 360
                    value = int(round(fraction * 100))

                    pie_data['values'].append({
                        'category': '',  # Will be filled from labels
                        'value': value,
                        'color': _color_to_hex(w.get_facecolor())
                    })

                # Extract labels
                labels = [t.get_text() for t in ax.texts if t.get_text()]
                for i, label in enumerate(labels[:len(pie_data['values'])]):
                    pie_data['values'][i]['category'] = label

                all_plots.append(pie_data)
                recognized = True
                continue

            # Check for bar/histogram plots
            for container in ax.containers:
                if isinstance(container, matplotlib.container.BarContainer):
                    patches = container.patches
                    if not patches:
                        continue

                    patch_x = [patch.get_x() for patch in patches]
                    patch_widths = [patch.get_width() for patch in patches]

                    # Detect if it's a histogram
                    is_histogram = (
                        len(patch_widths) > 1 and
                        np.allclose(patch_widths, patch_widths[0]) and
                        np.allclose(np.diff(patch_x), patch_widths[0])
                    )

                    if is_histogram:
                        # Histogram: reconstruct approximate raw data
                        values = []
                        for patch in patches:
                            bin_center = patch.get_x() + patch.get_width() / 2
                            count = int(patch.get_height())
                            values.extend([bin_center] * count)

                        histogram_data = {
                            'plot_type': 'histogram',
                            **metadata,
                            'values': values,
                            'bins': len(patches),
                            'color': _color_to_hex(patches[0].get_facecolor()) if patches else None
                        }
                        all_plots.append(histogram_data)
                        recognized = True
                    else:
                        # Bar plot
                        bar_data = {
                            'plot_type': 'bar',
                            **metadata,
                            'orientation': 'vertical',  # Could be enhanced
                            'values': []
                        }

                        for i, patch in enumerate(patches):
                            # Try to get category from x-tick labels
                            category = str(i)
                            try:
                                xticks = ax.get_xticklabels()
                                if i < len(xticks):
                                    category = xticks[i].get_text() or str(i)
                            except:
                                pass

                            bar_data['values'].append({
                                'category': category,
                                'value': float(patch.get_height()),
                                'error': None,
                                'color': _color_to_hex(patch.get_facecolor())
                            })

                        all_plots.append(bar_data)
                        recognized = True

            # Check for scatter plots
            for coll in ax.collections:
                if isinstance(coll, matplotlib.collections.PathCollection):
                    offsets = coll.get_offsets()
                    if offsets.size > 0 and coll.get_paths() and len(coll.get_paths()) == 1:
                        facecolors = coll.get_facecolor()

                        scatter_data = {
                            'plot_type': 'scatter',
                            **metadata,
                            'show_regression': False,
                            'values': []
                        }

                        for i, (x, y) in enumerate(offsets):
                            color = None
                            if len(facecolors) > 0:
                                color_idx = i if len(facecolors) > 1 else 0
                                color = _color_to_hex(facecolors[color_idx])

                            scatter_data['values'].append({
                                'x': float(x),
                                'y': float(y),
                                'label': None,
                                'color': color,
                                'size': None
                            })

                        all_plots.append(scatter_data)
                        recognized = True

            # Check for line plots
            lines = [ln for ln in ax.get_lines() if not ln.get_label().startswith("_")]
            if lines and not ax.containers and not ax.collections:
                if len(lines) == 1:
                    # Single line chart
                    line = lines[0]
                    xdata = line.get_xdata()
                    ydata = line.get_ydata()

                    line_data = {
                        'plot_type': 'line',
                        **metadata,
                        'values': [],
                        'show_points': True, # Could be improved
                        'line_style': line.get_linestyle(),
                        'line_color': _color_to_hex(line.get_color()),
                    }

                    for x, y in zip(xdata, ydata):
                        line_data['values'].append({
                            'x': float(x),
                            'y': float(y),
                            'label': line.get_label() if line.get_label() and not line.get_label().startswith('_') else None
                        })

                    all_plots.append(line_data)
                    recognized = True
                else:
                    # Multi-line chart
                    multi_line_data = {
                        'plot_type': 'multi-line',
                        **metadata,
                        'show_points': True,
                        'values': []
                    }

                    for line in lines:
                        xdata = line.get_xdata()
                        ydata = line.get_ydata()

                        series_data = {
                            'line_style': line.get_linestyle(),
                            'line_color': _color_to_hex(line.get_color()),
                            'series_label': line.get_label() if line.get_label() and not line.get_label().startswith('_') else None,
                            'data': []
                        }

                        for x, y in zip(xdata, ydata):
                            series_data['data'].append({
                                'x': float(x),
                                'y': float(y),
                                'label': None
                            })

                        multi_line_data['values'].append(series_data)

                    all_plots.append(multi_line_data)
                    recognized = True

        if not recognized:
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
            buf.seek(0)
            b64 = base64.b64encode(buf.read()).decode('ascii')
            buf.close()

            fallback_data = {
                'plot_type': 'image',
                'png_base64': b64
            }
            all_plots.append(fallback_data)
        _plt.close(fig)

    # Print to stdout
    print(json.dumps({'_plots': all_plots}, separators=(',', ':')))
'''
        post_injected_code = """
# Call the function to print figures to stdout.
_print_plot_data_to_stdout()
"""
        return pre_injected_code + script + post_injected_code

    @classmethod
    async def is_online(cls) -> bool:
        """Check if plot generator is accessible."""
        return True


# Let's get rid of our custom types and use only the pngs from matplotlib, like CHatGPT
