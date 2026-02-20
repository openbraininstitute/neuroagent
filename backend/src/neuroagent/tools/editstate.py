"""Tool to edit the shared state using JSONPatch operations."""

from typing import Any, ClassVar
from urllib.parse import urlparse
from uuid import UUID

import jsonpatch
from pydantic import BaseModel, Field

from neuroagent.shared_state import SharedStateLoosened, SharedStatePartial
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import extract_frontend_context


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
    request_id: str | None = None


class EditStateOutput(BaseModel):
    """Output of the EditState tool."""

    state: SharedStateLoosened = Field(
        description="The updated state after applying patches"
    )
    url_links: dict[str, str] | None = None


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
- `url_links`: Links to pages where the updated state can be viewed (if user is not already on those pages)

**IMPORTANT:** If `url_links` is present in the response, you MUST present these links to the user in your final summary so they can navigate to see the updated state.

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

        # Get current state as dict
        current_state = self.metadata.shared_state.model_dump()

        # Convert patches to jsonpatch format and apply directly
        patch_dicts = [patch.model_dump() for patch in self.input_schema.patches]
        updated_state = SharedStateLoosened(
            **jsonpatch.apply_patch(current_state, patch_dicts)
        )

        # Update the context variables with new state
        self.metadata.shared_state = updated_state
        urls = self.get_return_url(updated_state)

        # Return the state with validation status
        return EditStateOutput(state=self.metadata.shared_state, url_links=urls)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True

    def get_return_url(self, state: SharedStateLoosened) -> dict[str, str] | None:
        """Generate urls to which the user should go to see the state."""
        if not self.metadata.current_frontend_url:
            return None

        parsed = urlparse(self.metadata.current_frontend_url)
        parts = parsed.path.split("/")

        # Expect: ['', 'app', 'virtual-lab', 'vlab-id', 'project-id', ...]
        if len(parts) < 5 or parts[1:3] != ["app", "virtual-lab"]:
            return None

        base_path = "/".join(parts[:5])
        modified_paths = {
            patch.path.lstrip("/").split("/")[0] for patch in self.input_schema.patches
        }
        urls: dict[str, str] = {}

        # Append new if statements as state grows
        if "smc_simulation_config" in modified_paths:
            # Get circuit ID from within the state
            try:
                circuit_id = UUID(
                    state.smc_simulation_config.get("initialize", {})  # type: ignore
                    .get("circuit", {})
                    .get("id_str")
                )
            except (ValueError, TypeError):
                circuit_id = None
            # Compare to the current frontend url
            if circuit_id and not self.is_correct_simulation_page(
                self.metadata.current_frontend_url, circuit_id
            ):
                urls["smc_simulation_config"] = (
                    f"{parsed.scheme}://{parsed.netloc}{base_path}/workflows/simulate/configure/circuit/{circuit_id}?x-request-id={self.metadata.request_id}"
                )

            # More if statements in the future as the state grows

        return urls or None

    @staticmethod
    def is_correct_simulation_page(
        url: str | None = None, circuit_id: UUID | None = None
    ) -> bool:
        """We are on the simulation page if the url contains /workflows/simulate/configure/circuit and `panel=configuration`."""
        if not url:
            return False

        if "/workflows/simulate/configure/circuit" not in url:
            return False

        if circuit_id:
            context = extract_frontend_context(url)
            if not context.current_entity_id or circuit_id != context.current_entity_id:
                return False

        return True
