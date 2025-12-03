"""Dummy task for testing Celery."""

import logging
import time

from neuroagent.task_schemas import DummyTaskInput, DummyTaskOutput
from neuroagent.tasks.main import celery, get_redis_client
from neuroagent.tasks.utils import task_stream_notifier

logger = logging.getLogger(__name__)


@celery.task(name="dummy_task", pydantic=True)
def run(arg: DummyTaskInput) -> DummyTaskOutput:
    """Run dummy task that returns a message.

    Parameters
    ----------
    arg : DummyTaskInput
        The input containing the message to process

    Returns
    -------
    DummyTaskOutput
        The processed message result
    """
    task_id = run.request.id
    redis_client = get_redis_client()

    # Context manager automatically handles stream notifications
    with task_stream_notifier(redis_client, task_id):
        time.sleep(10)
        # The returned model will be converted to a dict automatically
        return DummyTaskOutput(
            result=arg.message[::-1]
        )  # Return the reversed message as a dummy processing
