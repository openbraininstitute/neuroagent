"""Tool to retrieve the current shared state from the frontend."""

from typing import Any, ClassVar, Literal

from pydantic import BaseModel, Field

from neuroagent.shared_state import (
    STATE_KEY_ALLOWED_PAGES,
    SharedStateLoosened,
    check_state_key_page_access,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class GetStateInput(BaseModel):
    """Input schema for the GetState tool."""

    path: Literal["/", "/smc_simulation_config"] = Field(
        default="/",
        description="Sub-path to retrieve. Use '/' for the full state or '/smc_simulation_config' for just the simulation configuration.",
    )


class GetStateMetadata(BaseMetadata):
    """Metadata for the GetState tool."""

    shared_state: SharedStateLoosened
    current_frontend_url: str | None = None


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
- Right after calling a tool that already returns the state in its output.

# Page Restriction
State can only be read on predefined pages. If this tool errors out because the user is not on the correct page:
1. If you believe a state-enabled page exists for the user's request, call the `navigate` tool to get a link. NEVER construct the URL yourself. Present its output URL verbatim (do NOT modify it) and ask the user to click it. Keep the message short.
2. If you believe no state-enabled page exists for the request, tell the user that this action is not available from their current page.

# Output Format
- Summarize the relevant parts of the state concisely in natural language. Do not dump raw JSON in chat.
"""
    description_frontend: ClassVar[str] = """Retrieve the current application state."""
    metadata: GetStateMetadata
    input_schema: GetStateInput

    async def arun(self) -> GetStateOutput:
        """Return the current shared state or a sub-path of it."""
        if not self.metadata.shared_state:
            raise ValueError("No shared state was provided in the request body.")

        # Check that the user is on a page associated with at least one state key
        if self.metadata.current_frontend_url and not any(
            check_state_key_page_access(key, self.metadata.current_frontend_url)
            for key in STATE_KEY_ALLOWED_PAGES
        ):
            valid_pages = {k: v.pattern for k, v in STATE_KEY_ALLOWED_PAGES.items()}
            raise ValueError(
                "Cannot get state: the current page is not associated with any state key. "
                f"Valid page patterns: {valid_pages}"
                "Use `navigate` tool to get to a valid page."
            )

        full_state = self.metadata.shared_state.model_dump()

        if self.input_schema.path == "/":
            return GetStateOutput(state=full_state)

        key = self.input_schema.path.lstrip("/")
        if key not in full_state:
            raise ValueError(
                f"Key '{key}' not found in shared state. "
                f"Available keys: {list(full_state.keys())}"
            )

        return GetStateOutput(state={key: full_state[key]})

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
