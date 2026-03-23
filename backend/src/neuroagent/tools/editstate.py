"""Tool to edit the shared state using JSONPatch operations."""

from typing import Any, ClassVar

import jsonpatch
from pydantic import BaseModel, Field

from neuroagent.shared_state import (
    STATE_KEY_ALLOWED_PAGES,
    SharedStateLoosened,
    SharedStatePartial,
    check_state_key_page_access,
)
from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class JSONPatchOperation(BaseModel):
    """A single JSONPatch operation."""

    op: str = Field(
        description="Operation type: 'add', 'remove', 'replace', 'move', 'copy', or 'test'"
    )
    path: str = Field(
        description="JSONPointer path to the target location (e.g., '/smc_simulation_config/info/title')"
    )
    value: Any | None = Field(
        default=None,
        description="Value for add/replace/test operations. Not used for remove.",
    )
    from_: str | None = Field(
        default=None,
        alias="from",
        description="Source path for move/copy operations",
    )


class EditStateInput(BaseModel):
    """Input schema for the EditState tool."""

    patches: list[JSONPatchOperation] = Field(
        description="List of JSONPatch operations to apply to the state. Operations are applied sequentially.",
        min_length=1,
    )


class EditStateMetadata(BaseMetadata):
    """Metadata for the EditState tool."""

    shared_state: SharedStateLoosened
    current_frontend_url: str | None = None


class EditStateOutput(BaseModel):
    """Output of the EditState tool."""

    state: SharedStateLoosened = Field(
        description="The updated state after applying patches"
    )


class EditStateTool(BaseTool):
    """Class defining the EditState tool."""

    name: ClassVar[str] = "editstate"
    name_frontend: ClassVar[str] = "Edit State"
    utterances: ClassVar[list[str]] = [
        "Update the configuration",
        "Modify the state",
        "Change the simulation parameters",
    ]
    description: ClassVar[str] = f"""Modify the shared state using JSONPatch operations.

# Shared State Schema
{SharedStatePartial.model_json_schema()}

**CRITICAL:** All modifications must conform to the schema above as much as possible.

**IMPORTANT:** Always work relative to the current state. If you don't know the current state, call `getstate` first. Never assume the state structure.

# Return Values
- `state`: The updated state after applying patches

# Validation Strategy
This tool does NOT validate the state. The state can be partially filled and invalid after your changes.

**When to validate:**
- If the user's request implies the state should be complete and valid (e.g., "configure the simulation", "set up everything")
- If you modified a previously valid state and want to ensure it remains valid
- If you believe all required fields are now filled

**When NOT to validate:**
- If the user requests partial changes to an empty or incomplete state
- If the user is incrementally building up the configuration
- If the state was already invalid before your changes and the user only asked for a small modification

After making changes, use your judgment: if you think the state should now be valid based on the user's request, call `validatestate` to verify.

# Workflow
1. Make sure you know the current state. It either comes from recent `getstate` or `editstate` tool responses
2. Call `editstate` with patches
3. Decide if validation is needed based on the user's intent
4. If validation is needed, call `validatestate`
5. If validation fails, review errors and call `editstate` again with fixes

# Best Practices
- Work incrementally - make small, focused changes
- Split up large changes into multiple calls to this tool.
- Use `null` as value to explicitly set fields to null
- Don't over-validate - respect partial state modifications

# Page Restriction
State can only be edited on predefined pages. If this tool errors out because the user is not on the correct page:
1. If you believe a state-enabled page exists for the user's request, call the `navigate` tool to get a link. NEVER construct the URL yourself. Present its output URL verbatim (do NOT modify it) and ask the user to click it. Keep the message short.
2. If you believe no state-enabled page exists for the request, tell the user that this action is not available from their current page.
"""
    description_frontend: ClassVar[str] = """Edit the current UI through the agent."""
    metadata: EditStateMetadata
    input_schema: EditStateInput

    async def arun(self) -> EditStateOutput:
        """Apply JSONPatch operations to the shared state."""
        if not self.metadata.shared_state:
            raise ValueError(
                "No shared state was provided in the request body.\n"
                "The editstate tool requires a state to modify."
            )

        # Check page access for each state key targeted by the patches
        if self.metadata.current_frontend_url:
            targeted_keys = {
                patch.path.lstrip("/").split("/")[0]
                for patch in self.input_schema.patches
            }
            for key in targeted_keys:
                if key in STATE_KEY_ALLOWED_PAGES and not check_state_key_page_access(
                    key, self.metadata.current_frontend_url
                ):
                    raise ValueError(
                        f"Cannot edit '{key}': the current page does not allow modifying this state key. "
                        f"Valid page pattern: {STATE_KEY_ALLOWED_PAGES[key].pattern}"
                        "Use `navigate` tool to get to a valid page."
                    )

        # Get current state as dict
        current_state = self.metadata.shared_state.model_dump()

        # Convert patches to jsonpatch format and apply directly
        patch_dicts = [patch.model_dump() for patch in self.input_schema.patches]
        updated_state = SharedStateLoosened(
            **jsonpatch.apply_patch(current_state, patch_dicts)
        )

        # Update the context variables with new state
        self.metadata.shared_state = updated_state

        # Return the state
        return EditStateOutput(state=self.metadata.shared_state)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
