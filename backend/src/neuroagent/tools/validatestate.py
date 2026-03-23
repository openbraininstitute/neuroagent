"""Tool to validate the shared state."""

from typing import ClassVar, Literal
from uuid import UUID

from httpx import AsyncClient
from pydantic import BaseModel

from neuroagent.shared_state import (
    STATE_KEY_ALLOWED_PAGES,
    SharedStateLoosened,
    check_state_key_page_access,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class ValidateStateInput(BaseModel):
    """Input schema for the ValidateState tool."""

    pass  # No input needed


class ValidateStateMetadata(BaseMetadata):
    """Metadata for the ValidateState tool."""

    shared_state: SharedStateLoosened
    current_frontend_url: str | None = None
    httpx_client: AsyncClient
    obi_one_url: str
    vlab_id: UUID | None
    project_id: UUID | None


class ValidateStateOutput(BaseModel):
    """Output of the ValidateState tool."""

    is_valid: Literal[True] = True


class ValidateStateTool(BaseTool):
    """Class defining the ValidateState tool."""

    name: ClassVar[str] = "validatestate"
    name_frontend: ClassVar[str] = "Validate State"
    utterances: ClassVar[list[str]] = [
        "Check if the configuration is valid",
        "Validate the state",
        "Is this configuration correct?",
    ]
    description: ClassVar[
        str
    ] = """Validates whether the current shared state is complete and valid.

# When to Call This Tool
Call `validatestate` when:
- The user's request implies the configuration should be complete (e.g., "configure the simulation", "set everything up")
- You've modified a previously valid state and want to ensure it remains valid
- You believe all required fields are now filled and the state should be valid
- The user explicitly asks to validate or check the configuration

# When NOT to Call This Tool
Do NOT call `validatestate` when:
- The user requests partial changes to an incomplete state (e.g., "set the title to X" on an empty form)
- The state was already invalid and the user only asked for a small modification
- The user is incrementally building up the configuration step by step

# Behavior
- Returns success if the state is valid
- Raises an error with detailed validation messages if invalid
- If invalid, use the error details to correct the state with `editstate`, then call `validatestate` again

# Important Notes
- A state can be partially filled and invalid - this is normal during incremental configuration
- Only validate when you expect the state to be complete based on the user's intent
- If a previously valid state becomes invalid after changes, fix the errors returned by this tool and call it again

# Page Restriction
State can only be validated on predefined pages. If this tool errors out because the user is not on the correct page:
1. If you believe a state-enabled page exists for the user's request, call the `navigate` tool to get a link. NEVER construct the URL yourself. Present its output URL verbatim (do NOT modify it) and ask the user to click it. Keep the message short.
2. If you believe no state-enabled page exists for the request, tell the user that this action is not available from their current page."""
    description_frontend: ClassVar[str] = """Validate the application state."""
    metadata: ValidateStateMetadata
    input_schema: ValidateStateInput

    async def arun(self) -> ValidateStateOutput:
        """Validate the shared state."""
        if not self.metadata.shared_state:
            raise ValueError("No shared state provided.")

        # Check that the user is on a page associated with at least one state key
        if self.metadata.current_frontend_url and not any(
            check_state_key_page_access(key, self.metadata.current_frontend_url)
            for key in STATE_KEY_ALLOWED_PAGES
        ):
            valid_pages = {k: v.pattern for k, v in STATE_KEY_ALLOWED_PAGES.items()}
            raise ValueError(
                "Cannot validate state: the current page is not associated with any state key. "
                f"Valid page patterns: {valid_pages}"
            )

        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        validate_response = await self.metadata.httpx_client.post(
            url=f"{self.metadata.obi_one_url}/config-validation/validate",
            headers=headers,
            json={"state": self.metadata.shared_state.model_dump()},
        )

        if validate_response.status_code != 200:
            raise ValueError(validate_response.text)
        return ValidateStateOutput(is_valid=True)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
