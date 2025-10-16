"""Tool for running any kind of python code."""

import json
import logging
from typing import Any, ClassVar, TypeAlias
from uuid import UUID

from mcp_run_python.code_sandbox import CodeSandbox, RunError, RunSuccess
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

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
    - Pandas
    - Plotly
    - Pydantic
    - Scikit-learn
    - Scipy
    The tool can be used to display plots through plotly.
    CRITICAL RULE: Whenever the user requests a plot, you MUST use this tool with the PLOTLY library.
    If another available library offers plotting utilities, regenerate the plot in Plotly instead.
    Figures defined in plotly will automatically be shown in the chat. Do not save them to disk.
    Only the plotly library is able to plot in the chat.
    The images can be downloaded directly in chat. as plotly offers a download button.
    You are not able to export anything. Don't pretend like you can.
    The user can read the code from this tool's input. DO NOT re-write the code in chat you just executed."""
    description_frontend: ClassVar[
        str
    ] = """Tool to execute Python code and return stdout, stderr, and return value.

The code may be async, and the value on the last line will be returned as the return value.

The code will be executed with Python 3.12.

The tool is able to plot through the Plotly library.

AVAILABLE LIBRARIES:
- Standard Python libraries (math, os, sys, json, datetime, etc.)
- Numpy
- Pandas
- Plotly
- Pydantic
- Scikit-Learn
- Scipy"""
    metadata: RunPythonMetadata
    input_schema: RunPythonInput

    async def arun(self) -> RunPythonOutput:
        """Run arbitrary python code."""
        # inject figure parsing code
        code = self.inject_user_script(self.input_schema.python_script)

        # Run the entire code
        result = await self.metadata.python_sandbox.eval(code)

        identifiers = []
        # Check if we have images, upload them to the store if so
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
            # Save images to storage
            for plot_json in fig_list:
                identifiers.append(
                    save_to_storage(
                        s3_client=self.metadata.s3_client,
                        bucket_name=self.metadata.bucket_name,
                        user_id=self.metadata.user_id,
                        content_type="application/json",
                        body=plot_json,
                        category="json",
                        thread_id=self.metadata.thread_id,
                    )
                )
        if result["status"] == "success":
            out_class: RunSuccess | RunError = RunSuccess(**result)
        else:
            out_class = RunError(**result)
        return RunPythonOutput(result=out_class, storage_id=identifiers)

    @staticmethod
    def inject_user_script(script: str) -> str:
        """Inject user's script with custom logic."""
        # This code allows to tranfer the figures to the tool for frontend displaying.
        pre_injected_code = '''
import gc
import json

import plotly.graph_objects as go
import plotly.io as pio

pio.renderers.default = None


def serialize_figures() -> None:
    """Fetches and serializes plotly figures."""
    # Use garbage collector to find all Figure objects in memory
    figures = [obj for obj in gc.get_objects() if isinstance(obj, go.Figure)]

    # Serialize all figures
    if figures:
        serialized = {"_plots": [fig.to_json() for fig in figures]}
        print(json.dumps(serialized, separators=(",", ":")))


    # Deep-clean and destroy figures
    for fig in figures:
        try:
            fig.data = ()
            fig.layout = {}
            fig.frames = []
            fig._grid_ref = None
            fig._data_objs = []
            fig._layout_obj = None

            # Attempt to remove from globals (if reachable there)
            for name, val in globals().items():
                if val is fig:
                    globals()[name] = None
        except Exception as e:
            pass

'''
        post_injected_code = """
serialize_figures()
"""
        return pre_injected_code + script + post_injected_code

    @classmethod
    async def is_online(cls) -> bool:
        """Check if plot generator is accessible."""
        return True
