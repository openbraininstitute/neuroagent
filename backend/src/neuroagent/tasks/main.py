"""Celery application for tasks."""

import logging
from pathlib import Path
from typing import Any

import boto3
import redis
from celery import Celery
from celery.signals import worker_process_init

from neuroagent.tasks.config import Settings
from neuroagent.tasks.utils import WasmExecutor

logger = logging.getLogger(__name__)

settings = Settings()

# Build Redis URL for Celery
redis_url = settings.redis.redis_url

celery = Celery(__name__)
celery.conf.broker_url = redis_url
celery.conf.result_backend = redis_url

# Autodiscover tasks (worker side - just needs to know about tasks)
celery.autodiscover_tasks(["neuroagent.tasks"])

# Note: Task routing is configured on the producer side (app/main.py)
# Workers listen to specific queues via the -Q flag

# Module-level variables to store shared resources per worker process
# These are initialized once per worker process via the signal handler
_python_executor: WasmExecutor | None = None
_s3_client: Any | None = None
_bucket_name: str = "neuroagent"


def get_python_executor() -> WasmExecutor | None:
    """Get the Python executor instance for the current worker process."""
    return _python_executor


def get_s3_client() -> Any | None:
    """Get the S3 client instance for the current worker process."""
    return _s3_client


def get_settings() -> Settings:
    """Get the settings instance."""
    return settings


def get_redis_client() -> redis.Redis:
    """Get a Redis client instance for task operations.

    Creates a Redis client from the Redis settings.
    Uses sync Redis client since tasks run in sync context.
    Assumes Redis is always available.

    Returns
    -------
    redis.Redis
        The Redis client instance

    Raises
    ------
    Exception
        If Redis client cannot be created
    """
    redis_password = (
        settings.redis.redis_password.get_secret_value()
        if settings.redis.redis_password is not None
        else None
    )

    # Create Redis client
    return redis.Redis(
        host=settings.redis.redis_host,
        port=settings.redis.redis_port,
        password=redis_password,
        ssl=settings.redis.redis_ssl,
        decode_responses=False,  # Keep bytes for stream operations
    )


@worker_process_init.connect
def init_worker_resources(**kwargs: Any) -> None:
    """Initialize shared resources when a worker process starts.

    This runs once per worker process and sets up:
    - WasmExecutor with package installation
    - S3 client for storage operations

    These resources are stored in module-level variables and reused
    across all tasks in the same worker process.
    """
    global _python_executor, _s3_client, _bucket_name

    logger.info("Initializing worker resources...")

    # Initialize Python executor
    logger.info("Initializing Python executor...")
    # Get imports list from settings or use defaults
    if settings.executor.additional_imports:
        imports = settings.executor.additional_imports
    else:
        # Built in pyodide packages (defaults)
        imports = [
            "numpy",
            "pandas",
            "pydantic",
            "scikit-learn",
            "scipy",
        ]

    # Fetch manually downloaded wheels + use micropip notation
    extra_wheel_list = list(Path("./cached_wheels").glob("*.whl"))
    if extra_wheel_list:
        logger.info(
            f"Found the following extra wheels: {', '.join([wheel.name for wheel in extra_wheel_list])}"
        )
        imports += [f"file:{wheel.absolute()}" for wheel in extra_wheel_list]

    # Initialize and set up the executor (equivalent to __enter__)
    executor = WasmExecutor(
        additional_imports=imports,
        allocated_memory=settings.executor.deno_allocated_memory,
        logger=logger,
    )
    # Run the setup (equivalent to __enter__)
    with executor:
        pass  # The __enter__ does the setup, we just need to call it

    # Store in module-level variable for reuse
    _python_executor = executor
    logger.info("Python executor initialized successfully")

    # Initialize S3 client
    logger.info("Initializing S3 client...")
    access_key = (
        settings.storage.access_key.get_secret_value()
        if settings.storage.access_key
        else None
    )
    secret_key = (
        settings.storage.secret_key.get_secret_value()
        if settings.storage.secret_key
        else None
    )

    _s3_client = boto3.client(
        "s3",
        endpoint_url=settings.storage.endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=None,
        config=boto3.session.Config(signature_version="s3v4"),
    )
    _bucket_name = settings.storage.bucket_name
    logger.info("S3 client initialized successfully")
