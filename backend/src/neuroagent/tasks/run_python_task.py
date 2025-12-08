"""Task for running Python code in Celery worker."""

import json
import logging
import uuid

from celery import Task

from neuroagent.task_schemas import (
    FailureOutput,
    RunPythonTaskInput,
    RunPythonTaskOutput,
)
from neuroagent.tasks.main import (
    celery,
    get_python_executor,
    get_redis_client,
    get_s3_client,
    get_settings,
)
from neuroagent.tasks.utils import task_stream_notifier
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


@celery.task(name="run_python_task", bind=True, pydantic=True)
def run(self: Task, arg: RunPythonTaskInput) -> RunPythonTaskOutput:
    """Run Python code in the sandboxed executor and handle S3 storage for plots.

    Parameters
    ----------
    self : Task
        The task instance (bound task)
    arg : RunPythonTaskInput
        The input containing the Python script to execute and storage metadata

    Returns
    -------
    RunPythonTaskOutput
        The execution result containing output, return value, errors, and storage IDs
    """
    task_id = self.request.id
    redis_client = get_redis_client()

    # Context manager automatically handles stream notifications
    with task_stream_notifier(redis_client, task_id):
        # Get the executor from module-level variable (initialized at worker startup)
        executor = get_python_executor()

        if executor is None:
            logger.error("Python executor not initialized in worker")
            return RunPythonTaskOutput(
                result=FailureOutput(
                    error_type="install-error",
                    error="Python executor not initialized in worker process",
                ),
                storage_id=[],
            )

        # Execute the code using the sync method
        try:
            result = executor.run_code_sync(arg.python_script)
        except Exception as e:
            logger.exception("Error executing Python code")
            return RunPythonTaskOutput(
                result=FailureOutput(
                    error_type="python-error",
                    error=f"Unexpected error: {str(e)}",
                ),
                storage_id=[],
            )

        # Handle S3 storage for plots if execution was successful
        identifiers: list[str] = []
        if result.status == "success":
            # Get S3 client and bucket name
            s3_client = get_s3_client()
            bucket_name = get_settings().storage.bucket_name

            if s3_client is None:
                logger.warning("S3 client not initialized, skipping plot storage")
            else:
                # Check if we have plots in the output, upload them to S3
                fig_list = []
                for i, elem in enumerate(result.output):
                    # Stdout lines are not necessarily valid jsons
                    try:
                        # Load every element of the stdout until we find our fig dict
                        output = json.loads(elem)

                        # Not only dicts can be valid json, gotta be careful
                        if isinstance(output, dict) and "_plots" in output:
                            fig_list = output["_plots"]
                            result.output.pop(i)  # Do not pollute stdout
                            break

                    except json.JSONDecodeError:
                        continue

                # If we have figures, save them to the storage
                if fig_list:
                    # Convert user_id and thread_id to UUID
                    user_id_uuid = uuid.UUID(arg.user_id)
                    thread_id_uuid = uuid.UUID(arg.thread_id)

                    # Save individual jsons to storage
                    for plot_json in fig_list:
                        identifiers.append(
                            save_to_storage(
                                s3_client=s3_client,
                                bucket_name=bucket_name,
                                user_id=user_id_uuid,
                                content_type="application/json",
                                body=plot_json,
                                category="json",
                                thread_id=thread_id_uuid,
                            )
                        )

        return RunPythonTaskOutput(result=result, storage_id=identifiers)
