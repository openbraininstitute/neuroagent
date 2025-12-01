"""Tool for submitting a dummy task to Celery."""

import logging
from typing import ClassVar

from celery import Celery
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class SubmitDummyTaskInput(BaseModel):
    """Input schema for SubmitDummyTask tool."""

    message: str = Field(description="Message to process in the task")


class SubmitDummyTaskMetadata(BaseMetadata):
    """Metadata for SubmitDummyTask tool."""

    celery_client: Celery


class SubmitDummyTaskOutput(BaseModel):
    """Output schema of the SubmitDummyTask tool."""

    task_id: str
    message: str


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
    ] = """Submit a dummy task to Celery for asynchronous processing. 
    The task will be processed in the background and returns immediately with a task ID.
    Use this when you need to offload work to a background worker."""
    description_frontend: ClassVar[
        str
    ] = """Submit a dummy task to Celery for asynchronous processing.
    
    This tool allows you to:
    • Queue tasks for background processing
    • Get a task ID to track the task status
    • Offload long-running operations
    
    Returns a task ID that can be used to check the task status."""
    metadata: SubmitDummyTaskMetadata
    input_schema: SubmitDummyTaskInput

    async def arun(self) -> SubmitDummyTaskOutput:
        """Submit a dummy task to Celery.

        Returns
        -------
        SubmitDummyTaskOutput
            Task ID and the submitted message
        """
        celery_client = self.metadata.celery_client
        task_result = celery_client.send_task(
            "dummy_task", args=[self.input_schema.message]
        )
        logger.info(f"Submitted dummy task with ID: {task_result.id}")
        return SubmitDummyTaskOutput(
            task_id=task_result.id, message=self.input_schema.message
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Returns True if Celery is configured.
        """
        return True
