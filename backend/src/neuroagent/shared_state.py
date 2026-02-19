"""Shared state types."""

from typing import Any

from pydantic import BaseModel


class SharedState(BaseModel):
    """State shared between backend and frontend."""

    smc_simulation_config: dict[str, Any] | None = None
