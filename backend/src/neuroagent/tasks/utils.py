"""Utility functions for Celery tasks."""

import logging
from contextlib import contextmanager

import redis

logger = logging.getLogger(__name__)


@contextmanager
def task_stream_notifier(redis_client: redis.Redis, task_id: str):
    """Context manager that automatically publishes task completion to Redis stream.

    This context manager wraps task execution and automatically publishes
    "done" status to Redis stream on successful completion, or "error" status
    on exception. The stream key is `task:{task_id}:progress`.

    Parameters
    ----------
    redis_client : redis.Redis
        The Redis client instance (sync, since tasks run in sync context)
    task_id : str
        The Celery task ID

    Yields
    ------
    None
        The context manager yields control to the task code

    Example
    -------
    >>> with task_stream_notifier(redis_client, task_id):
    ...     # Your task code here
    ...     result = do_work()
    ...     return result
    """
    stream_key = f"task:{task_id}:progress"

    try:
        yield
        # If we get here, task completed successfully
        try:
            redis_client.xadd(
                stream_key,
                {"status": "done"},
                maxlen=1,  # Keep only the latest message
            )
            logger.info(f"Published done status to stream {stream_key}")
        except Exception as e:
            logger.warning(f"Failed to publish done status to stream: {e}")

    except Exception as e:
        # Task failed, publish error status
        error_message = str(e)
        try:
            redis_client.xadd(
                stream_key,
                {"status": "error", "error": error_message},
                maxlen=1,
            )
            logger.info(
                f"Published error status to stream {stream_key}: {error_message}"
            )
        except Exception as stream_error:
            logger.warning(f"Failed to publish error status to stream: {stream_error}")

        # Re-raise the original exception
        raise
