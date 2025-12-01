"""Pydantic schemas for Celery tasks."""

from pydantic import BaseModel


class DummyTaskInput(BaseModel):
    """Input schema for dummy task."""

    message: str


class DummyTaskOutput(BaseModel):
    """Output schema for dummy task."""

    result: str
