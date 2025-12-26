"""Tool for running any kind of python code."""

import logging
from typing import ClassVar
from uuid import UUID

from celery import Celery
from pydantic import BaseModel, Field
from redis import asyncio as aioredis

from neuroagent.task_schemas import (
    FailureOutput,
    RunPythonTaskInput,
    RunPythonTaskOutput,
    SuccessOutput,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import long_poll_celery_result

logger = logging.getLogger(__name__)


class RunPythonInput(BaseModel):
    """Input schema for RunPython tool."""

    python_script: str = Field(description="Python code to run")


class RunPythonMetadata(BaseMetadata):
    """Metadata for RunPython tool."""

    celery_client: Celery
    redis_client: aioredis.Redis
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
        """Run arbitrary python code via Celery task."""
        # Create task input with all required metadata
        task_input = RunPythonTaskInput(
            python_script=self.input_schema.python_script,
            user_id=self.metadata.user_id,
            thread_id=self.metadata.thread_id,
        )

        # Submit task to Celery
        celery_client = self.metadata.celery_client
        redis_client = self.metadata.redis_client
        task_result = celery_client.send_task(
            "run_python_task", args=[task_input.model_dump(mode="json")]
        )
        logger.info(f"Submitted run_python_task with ID: {task_result.id}")

        # Wait for result using Redis Streams (with longer timeout for Python execution)
        result_dict = await long_poll_celery_result(
            task_result, redis_client, timeout=120
        )
        logger.info(f"Task {task_result.id} completed")

        # Extract result from task output
        task_output = RunPythonTaskOutput(**result_dict)

        # Return the result directly (S3 operations are handled in the task)
        return RunPythonOutput(
            result=task_output.result, storage_id=task_output.storage_id
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if RunPython tool is accessible."""
        return True
