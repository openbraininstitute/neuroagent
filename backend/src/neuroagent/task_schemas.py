"""Pydantic schemas for Celery tasks."""

from typing import Any, Literal

from pydantic import BaseModel


class SuccessOutput(BaseModel):
    """Output of the python script."""

    status: Literal["success"] = "success"
    output: list[str]
    return_value: Any = None


class ErrorDetail(BaseModel):
    """Detail of the python error."""

    message: str | None = None
    name: str | None = None


class FailureOutput(BaseModel):
    """Output of the python script."""

    status: Literal["error"] = "error"
    error_type: Literal["install-error", "python-error"]
    error: ErrorDetail | str | None = None


class RunPythonTaskInput(BaseModel):
    """Input schema for run_python task."""

    python_script: str
    user_id: str
    thread_id: str


class RunPythonTaskOutput(BaseModel):
    """Output schema for run_python task."""

    result: SuccessOutput | FailureOutput
    storage_id: list[str]


class CircuitPopulationAnalysisTaskInput(BaseModel):
    """Input schema for circuit_population_analysis task."""

    circuit_id: str
    population_name: str
    question: str
    vlab_id: str | None
    project_id: str | None
    bearer_token: str
    entitycore_url: str


class CircuitPopulationAnalysisTaskOutput(BaseModel):
    """Output schema for circuit_population_analysis task."""

    result_data: str
    query_executed: str
    token_consumption: dict[str, str | int | None] | None = None
