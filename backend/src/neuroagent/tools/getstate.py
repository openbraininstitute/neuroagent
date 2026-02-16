"""Tool to retrieve the current shared state from the frontend."""

from typing import Any, ClassVar

from pydantic import BaseModel

from neuroagent.new_types import SharedState
from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class GetStateInput(BaseModel):
    """Input schema (no parameters needed)."""

    pass


class GetStateMetadata(BaseMetadata):
    """Metadata for the GetState tool."""

    shared_state: SharedState


class GetStateOutput(BaseModel):
    """Output of the GetState tool."""

    state: dict[str, Any]


class GetStateTool(BaseTool):
    """Class defining the GetState tool."""

    name: ClassVar[str] = "getstate"
    name_frontend: ClassVar[str] = "Get State"
    utterances: ClassVar[list[str]] = [
        "Show me the current state",
        "What is the current configuration?",
        "Display the current setup",
    ]
    description: ClassVar[str] = """# Role and Objective
Returns the current shared state JSON from the application. The state contains context provided by the frontend page the user is on (e.g. the current simulation configuration).

# When to Use
- The user asks about something that lives in the application state (e.g. the current simulation config) and no preceding tool call in this conversation already returned it.

# When NOT to Use
- Right after calling a tool that already returns the state in its output (e.g. `obione-designcircuitsimulationscanconfig`).

# Output Format
- Summarize the relevant parts of the state concisely in natural language. Do not dump raw JSON in chat.
"""
    description_frontend: ClassVar[str] = (
        """Retrieve the current application state."""
    )
    metadata: GetStateMetadata
    input_schema: GetStateInput

    async def arun(self) -> GetStateOutput:
        """Return the current shared state."""
        if not self.metadata.shared_state:
            raise ValueError(
                "No shared state was provided in the request body."
            )

        return GetStateOutput(
            state=self.metadata.shared_state.model_dump(exclude_none=True)
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
