"""Tests for state management tools (getstate, editstate)."""

import pytest
from pydantic import ValidationError

from neuroagent.shared_state import SharedStateLoosened
from neuroagent.tools.editstate import (
    EditStateInput,
    EditStateMetadata,
    EditStateTool,
    JSONPatchOperation,
)
from neuroagent.tools.getstate import GetStateInput, GetStateMetadata, GetStateTool


@pytest.fixture
def sample_simulation_config() -> dict:
    """Sample simulation configuration for testing."""
    return {
        "type": "CircuitSimulationScanConfig",
        "info": {
            "title": "Test Simulation",
            "description": "A test simulation configuration",
        },
        "initialize": {
            "duration": 1000.0,
            "dt": 0.025,
            "spike_threshold": -30.0,
            "circuit": {
                "type": "CircuitFromID",
                "id_str": "12345678-1234-1234-1234-123456789abc",
            },
        },
        "neuron_sets": {
            "all_neurons": {
                "type": "AllNeurons",
                "sample_percentage": 100.0,
                "sample_seed": 1,
            }
        },
        "stimuli": {},
        "recordings": {},
        "timestamps": {},
        "synaptic_manipulations": {},
    }


@pytest.fixture
def shared_state(sample_simulation_config: dict) -> SharedStateLoosened:
    """Create a SharedStateLoosened instance for testing."""
    return SharedStateLoosened(smc_simulation_config=sample_simulation_config)


class TestGetStateTool:
    """Tests for GetStateTool."""

    @pytest.mark.asyncio
    async def test_get_full_state(self, shared_state: SharedStateLoosened) -> None:
        """Test retrieving the full state."""
        tool = GetStateTool(
            metadata=GetStateMetadata(shared_state=shared_state),
            input_schema=GetStateInput(path="/"),
        )
        result = await tool.arun()
        assert "smc_simulation_config" in result.state
        assert (
            result.state["smc_simulation_config"]["info"]["title"] == "Test Simulation"
        )

    @pytest.mark.asyncio
    async def test_get_subpath(self, shared_state: SharedStateLoosened) -> None:
        """Test retrieving a specific sub-path."""
        tool = GetStateTool(
            metadata=GetStateMetadata(shared_state=shared_state),
            input_schema=GetStateInput(path="/smc_simulation_config"),
        )
        result = await tool.arun()
        assert "smc_simulation_config" in result.state
        assert (
            result.state["smc_simulation_config"]["info"]["title"] == "Test Simulation"
        )

    @pytest.mark.asyncio
    async def test_get_nonexistent_path(
        self, shared_state: SharedStateLoosened
    ) -> None:
        """Test retrieving a non-existent path raises validation error."""
        # The path is validated by Pydantic, so invalid paths raise ValidationError
        with pytest.raises(ValidationError):
            GetStateInput(path="/nonexistent")  # type: ignore


class TestEditStateTool:
    """Tests for EditStateTool."""

    @pytest.mark.asyncio
    async def test_replace_operation(self, shared_state: SharedStateLoosened) -> None:
        """Test replacing a value in the state."""
        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/initialize/duration",
                        value=5000.0,
                    )
                ],
            ),
        )
        result = await tool.arun()
        assert result.state.smc_simulation_config["initialize"]["duration"] == 5000.0

    @pytest.mark.asyncio
    async def test_add_operation(self, shared_state: SharedStateLoosened) -> None:
        """Test adding a new value to the state."""
        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="add",
                        path="/smc_simulation_config/stimuli/test_stimulus",
                        value={
                            "type": "ConstantCurrentClampSomaticStimulus",
                            "amplitude": 0.5,
                        },
                    )
                ],
            ),
        )
        result = await tool.arun()
        assert "test_stimulus" in result.state.smc_simulation_config["stimuli"]

    @pytest.mark.asyncio
    async def test_remove_operation(self, shared_state: SharedStateLoosened) -> None:
        """Test removing a value from the state."""
        # First add something to remove
        shared_state.smc_simulation_config["stimuli"] = {"to_remove": {"type": "test"}}  # type: ignore

        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="remove",
                        path="/smc_simulation_config/stimuli/to_remove",
                    )
                ],
            ),
        )
        result = await tool.arun()
        assert "to_remove" not in result.state.smc_simulation_config["stimuli"]

    @pytest.mark.asyncio
    async def test_multiple_patches(self, shared_state: SharedStateLoosened) -> None:
        """Test applying multiple patches in sequence."""
        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/info/title",
                        value="Updated Title",
                    ),
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/initialize/duration",
                        value=2000.0,
                    ),
                ],
            ),
        )
        result = await tool.arun()
        assert result.state.smc_simulation_config["info"]["title"] == "Updated Title"
        assert result.state.smc_simulation_config["initialize"]["duration"] == 2000.0

    @pytest.mark.asyncio
    async def test_invalid_patch(self, shared_state: SharedStateLoosened) -> None:
        """Test that invalid patches raise jsonpatch exceptions."""
        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/nonexistent/field",
                        value="test",
                    )
                ],
            ),
        )
        # Should raise jsonpatch exception for non-existent path
        with pytest.raises(Exception):  # jsonpatch will raise its own exception
            await tool.arun()

    @pytest.mark.asyncio
    async def test_no_shared_state_raises(self) -> None:
        """Test that editing without shared state raises an error."""
        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=SharedStateLoosened()),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/info/title",
                        value="Test",
                    )
                ],
            ),
        )
        with pytest.raises(Exception):
            await tool.arun()


class TestStateToolsWorkflow:
    """Integration tests for the complete workflow."""

    @pytest.mark.asyncio
    async def test_complete_workflow(self, shared_state: SharedStateLoosened) -> None:
        """Test the complete get -> edit workflow."""
        # Step 1: Get the current state
        get_tool = GetStateTool(
            metadata=GetStateMetadata(shared_state=shared_state),
            input_schema=GetStateInput(path="/smc_simulation_config"),
        )
        get_result = await get_tool.arun()
        assert (
            get_result.state["smc_simulation_config"]["initialize"]["duration"]
            == 1000.0
        )

        # Step 2: Edit the state
        edit_tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/initialize/duration",
                        value=5000.0,
                    ),
                    JSONPatchOperation(
                        op="add",
                        path="/smc_simulation_config/neuron_sets/excitatory",
                        value={
                            "type": "ExcitatoryNeurons",
                            "sample_percentage": 100.0,
                            "sample_seed": 1,
                        },
                    ),
                ],
            ),
        )
        edit_result = await edit_tool.arun()
        assert (
            edit_result.state.smc_simulation_config["initialize"]["duration"] == 5000.0
        )
        assert "excitatory" in edit_result.state.smc_simulation_config["neuron_sets"]

    @pytest.mark.asyncio
    async def test_iterative_edit_workflow(
        self, shared_state: SharedStateLoosened
    ) -> None:
        """Test making multiple edits iteratively."""
        # Step 1: First edit
        edit_tool_1 = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/info/title",
                        value="First Update",
                    )
                ],
            ),
        )
        result_1 = await edit_tool_1.arun()
        assert result_1.state.smc_simulation_config["info"]["title"] == "First Update"

        # Step 2: Second edit on the updated state
        edit_tool_2 = EditStateTool(
            metadata=EditStateMetadata(shared_state=result_1.state),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/info/description",
                        value="Second Update",
                    )
                ],
            ),
        )
        result_2 = await edit_tool_2.arun()

        # Both changes should be present
        assert result_2.state.smc_simulation_config["info"]["title"] == "First Update"
        assert (
            result_2.state.smc_simulation_config["info"]["description"]
            == "Second Update"
        )
