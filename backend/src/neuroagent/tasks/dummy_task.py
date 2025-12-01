"""Dummy task for testing Celery."""

import logging

from neuroagent.tasks.main import celery

logger = logging.getLogger(__name__)


@celery.task(name="dummy_task")
def dummy_task(message: str) -> str:
    """Run dummy task that returns a message.

    Parameters
    ----------
    message : str
        The message to return

    Returns
    -------
    str
        The processed message
    """
    return message[::-1]  # Return the reversed message as a dummy processing
