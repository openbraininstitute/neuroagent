"""Dummy task for testing Celery."""

import logging
import time

from neuroagent.task_schemas import DummyTaskInput, DummyTaskOutput
from neuroagent.tasks.main import celery

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
    time.sleep(10)
    # The returned model will be converted to a dict automatically
    return DummyTaskOutput(
        result=arg.message[::-1]
    )  # Return the reversed message as a dummy processing
