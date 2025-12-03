"""Tool for submitting a dummy task to Celery."""

import logging
from typing import Any, ClassVar

from celery import Celery
from pydantic import BaseModel, Field
from redis import asyncio as aioredis

from neuroagent.task_schemas import DummyTaskInput, DummyTaskOutput
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import long_poll_celery_result

logger = logging.getLogger(__name__)


class SubmitDummyTaskInput(BaseModel):
    """Input schema for SubmitDummyTask tool."""

    message: str = Field(description="Message to process in the task")


class SubmitDummyTaskMetadata(BaseMetadata):
    """Metadata for SubmitDummyTask tool."""

    celery_client: Celery
    redis_client: aioredis.Redis


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
        # Create Pydantic model instance for the input
        task_input = DummyTaskInput(message=self.input_schema.message)

        celery_client = self.metadata.celery_client
        redis_client = self.metadata.redis_client
        task_result = celery_client.send_task(
            "dummy_task", args=[task_input.model_dump()]
        )
        logger.info(f"Submitted dummy task with ID: {task_result.id}")

        # Wait for result using Redis Streams (truly event-driven, no polling)
        result_dict = await long_poll_celery_result(
            task_result, redis_client, timeout=30
        )
        logger.info(f"Task {task_result.id} completed with result: {result_dict}")

        # Instantiate the task output model from the result dict
        task_output = DummyTaskOutput(**result_dict)
        return SubmitDummyTaskOutput(result=task_output.model_dump())

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Returns True if Celery is configured.
        """
        return True
