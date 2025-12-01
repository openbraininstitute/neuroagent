"""Tool for submitting a dummy task to Celery."""

import logging
from typing import Any, ClassVar

from celery import Celery
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import wait_for_celery_result

logger = logging.getLogger(__name__)


class SubmitDummyTaskInput(BaseModel):
    """Input schema for SubmitDummyTask tool."""

    message: str = Field(description="Message to process in the task")


class SubmitDummyTaskMetadata(BaseMetadata):
    """Metadata for SubmitDummyTask tool."""

    celery_client: Celery


class SubmitDummyTaskOutput(BaseModel):
    """Output schema of the SubmitDummyTask tool."""

    result: Any


class SubmitDummyTaskTool(BaseTool):
    """Tool that submits a dummy task to Celery for asynchronous processing."""

    name: ClassVar[str] = "submit-dummy-task"
    name_frontend: ClassVar[str] = "Submit Dummy Task"
    utterances: ClassVar[list[str]] = [
        "Submit a task",
        "Queue a task",
        "Delay a task",
        "Run a task asynchronously",
    ]
    description: ClassVar[
        str
    ] = """Submit a dummy task to Celery and wait for the result.
    The task will be processed by a background worker and the result will be returned."""
    description_frontend: ClassVar[
        str
    ] = """Submit a dummy task to Celery and wait for the result.
    
    This tool allows you to:
    • Submit tasks for background processing
    • Wait for task completion
    • Get the task result and status
    
    Returns the task ID, result, and status once the task completes."""
    metadata: SubmitDummyTaskMetadata
    input_schema: SubmitDummyTaskInput

    async def arun(self) -> SubmitDummyTaskOutput:
        """Submit a dummy task to Celery and wait for the result.

        Returns
        -------
        SubmitDummyTaskOutput
            The task result
        """
        celery_client = self.metadata.celery_client
        task_result = celery_client.send_task(
            "dummy_task", args=[self.input_schema.message]
        )
        logger.info(f"Submitted dummy task with ID: {task_result.id}")

        # Wait for result using reusable utility function
        result = await wait_for_celery_result(task_result)
        logger.info(f"Task {task_result.id} completed with result: {result}")
        return SubmitDummyTaskOutput(result=result)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Returns True if Celery is configured.
        """
        return True
