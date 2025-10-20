"""Tool for running any kind of python code."""

import json
import logging
from typing import Any, ClassVar
from uuid import UUID

from pydantic import BaseModel, Field

from neuroagent.executor import FailureOutput, SuccessOutput, WasmExecutor
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


class RunPythonInput(BaseModel):
    """Input schema for RunPython tool."""

    python_script: str = Field(description="Python code to run")


class RunPythonMetadata(BaseMetadata):
    """Metadata for RunPython tool."""

    python_sandbox: WasmExecutor
    s3_client: Any  # boto3 client
    user_id: UUID
    bucket_name: str
    thread_id: UUID


class RunPythonOutput(BaseModel):
    """Output class for the RunPython tool."""

    result: SuccessOutput | FailureOutput
    storage_id: list[str]


class RunPythonTool(BaseTool):
    """Tool that safely runs any python script."""

    name: ClassVar[str] = "run-python"
    name_frontend: ClassVar[str] = "Run Python"
    utterances: ClassVar[list[str]] = [
        "Compute the mean of the output.",
        "Compute the numerical value of the integral of the function between -10 and 10.",
        "Plot a Gaussian distribution with mean 0 and std 1.",
        "Plot its distribution.",
        "Plot functions.",
    ]
    description: ClassVar[
        str
    ] = """Tool to execute Python code and return stdout, stderr, and return value.
    The code may be async, and the value on the last line will be returned as the return value.
    The code will be executed with Python 3.12.
    If the last statement in the Python code is an expression (and the code doesn't end with a semicolon), the value of the expression is returned.
    You will have access to the stdout of the script.
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
    The images can be downloaded directly in chat as plotly offers a download button next to the displayed image.
    You are not able to export anything. Don't pretend like you can.
    The user can read the code from this tool's input. DO NOT re-write the code you just executed in chat."""
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
        # Run the entire code
        result = self.metadata.python_sandbox.run_code(self.input_schema.python_script)

        identifiers = []
        # Check if we have images, upload them to the store if so
        # Get the plot stdout for parsing
        fig_list = []
        if result.status == "success":
            for i, elem in enumerate(result.output):
                try:
                    output = json.loads(elem)
                    if "_plots" in output:
                        fig_list = output["_plots"]
                        result.output.pop(i)
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

        return RunPythonOutput(result=result, storage_id=identifiers)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if RunPython tool is accessible."""
        return True
