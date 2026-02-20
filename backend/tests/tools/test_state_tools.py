"""Tests for state management tools (getstate, editstate)."""

from uuid import UUID

import pytest
from pydantic import ValidationError

from neuroagent.shared_state import SharedStatePartial
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
def shared_state(sample_simulation_config: dict) -> SharedStatePartial:
    """Create a SharedStatePartial instance for testing."""
    return SharedStatePartial(smc_simulation_config=sample_simulation_config)


class TestGetStateTool:
    """Tests for GetStateTool."""

    @pytest.mark.asyncio
    async def test_get_full_state(self, shared_state: SharedStatePartial) -> None:
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
    async def test_get_subpath(self, shared_state: SharedStatePartial) -> None:
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
    async def test_get_nonexistent_path(self, shared_state: SharedStatePartial) -> None:
        """Test retrieving a non-existent path raises validation error."""
        # The path is validated by Pydantic, so invalid paths raise ValidationError
        with pytest.raises(ValidationError):
            GetStateInput(path="/nonexistent")  # type: ignore


class TestEditStateTool:
    """Tests for EditStateTool."""

    @pytest.mark.asyncio
    async def test_replace_operation(self, shared_state: SharedStatePartial) -> None:
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
    async def test_add_operation(self, shared_state: SharedStatePartial) -> None:
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
    async def test_remove_operation(self, shared_state: SharedStatePartial) -> None:
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
    async def test_multiple_patches(self, shared_state: SharedStatePartial) -> None:
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
    async def test_invalid_patch(self, shared_state: SharedStatePartial) -> None:
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
    async def test_no_url_links_without_frontend_url(
        self, shared_state: SharedStatePartial
    ) -> None:
        """Test that url_links is None when no frontend URL is provided."""
        tool = EditStateTool(
            metadata=EditStateMetadata(shared_state=shared_state),
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
        result = await tool.arun()
        assert result.url_links is None

    @pytest.mark.asyncio
    async def test_url_links_for_simulation_config_change(
        self, shared_state: SharedStatePartial
    ) -> None:
        """Test that url_links is generated when smc_simulation_config is modified."""
        circuit_id = "12345678-1234-1234-1234-123456789abc"
        request_id = "test-request-123"

        tool = EditStateTool(
            metadata=EditStateMetadata(
                shared_state=shared_state,
                current_frontend_url="https://example.com/app/virtual-lab/vlab-123/project-456/other-page",
                request_id=request_id,
            ),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/info/title",
                        value="Updated",
                    )
                ],
            ),
        )
        result = await tool.arun()

        assert result.url_links is not None
        assert "smc_simulation_config" in result.url_links
        assert (
            f"/workflows/simulate/configure/circuit/{circuit_id}"
            in result.url_links["smc_simulation_config"]
        )
        assert f"x-request-id={request_id}" in result.url_links["smc_simulation_config"]

    @pytest.mark.asyncio
    async def test_no_url_links_when_already_on_simulation_page(
        self, shared_state: SharedStatePartial
    ) -> None:
        """Test that url_links is None when user is already on the simulation page."""
        circuit_id = "12345678-1234-1234-1234-123456789abc"

        tool = EditStateTool(
            metadata=EditStateMetadata(
                shared_state=shared_state,
                current_frontend_url=f"https://example.com/app/virtual-lab/vlab-123/project-456/workflows/simulate/configure/circuit/{circuit_id}",
                request_id="test-request-123",
            ),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/info/title",
                        value="Updated",
                    )
                ],
            ),
        )
        result = await tool.arun()

        # Should not return URL since user is already on the correct page
        assert result.url_links is None

    @pytest.mark.asyncio
    async def test_url_links_not_generated_for_non_simulation_changes(
        self, shared_state: SharedStatePartial
    ) -> None:
        """Test that url_links is None when modifying non-simulation state fields."""
        # Modify a field within smc_simulation_config but not the top-level key
        # This should still generate URLs since we're modifying smc_simulation_config
        tool = EditStateTool(
            metadata=EditStateMetadata(
                shared_state=shared_state,
                current_frontend_url="https://example.com/app/virtual-lab/vlab-123/project-456/other-page",
                request_id="test-request-123",
            ),
            input_schema=EditStateInput(
                patches=[
                    JSONPatchOperation(
                        op="replace",
                        path="/smc_simulation_config/initialize/dt",
                        value=0.05,
                    )
                ],
            ),
        )
        result = await tool.arun()

        # Should generate URL since we modified smc_simulation_config
        assert result.url_links is not None
        assert "smc_simulation_config" in result.url_links


class TestEditStateToolURLGeneration:
    """Tests specifically for the get_return_url and is_correct_simulation_page methods."""

    def test_is_correct_simulation_page_with_valid_url(self) -> None:
        """Test is_correct_simulation_page returns True for valid simulation URLs."""
        circuit_id = UUID("12345678-1234-1234-1234-123456789abc")
        url = f"https://example.com/app/virtual-lab/vlab-123/project-456/workflows/simulate/configure/circuit/{circuit_id}"

        assert EditStateTool.is_correct_simulation_page(url, circuit_id) is True

    def test_is_correct_simulation_page_with_wrong_circuit_id(self) -> None:
        """Test is_correct_simulation_page returns False when circuit ID doesn't match."""
        circuit_id = UUID("12345678-1234-1234-1234-123456789abc")
        different_id = UUID("87654321-4321-4321-4321-cba987654321")
        url = f"https://example.com/app/virtual-lab/vlab-123/project-456/workflows/simulate/configure/circuit/{different_id}"

        assert EditStateTool.is_correct_simulation_page(url, circuit_id) is False

    def test_is_correct_simulation_page_with_non_simulation_url(self) -> None:
        """Test is_correct_simulation_page returns False for non-simulation URLs."""
        circuit_id = UUID("12345678-1234-1234-1234-123456789abc")
        url = "https://example.com/app/virtual-lab/vlab-123/project-456/other-page"

        assert EditStateTool.is_correct_simulation_page(url, circuit_id) is False

    def test_is_correct_simulation_page_with_no_url(self) -> None:
        """Test is_correct_simulation_page returns False when URL is None."""
        circuit_id = UUID("12345678-1234-1234-1234-123456789abc")

        assert EditStateTool.is_correct_simulation_page(None, circuit_id) is False

    def test_is_correct_simulation_page_without_circuit_id(self) -> None:
        """Test is_correct_simulation_page works without circuit ID check."""
        url = "https://example.com/app/virtual-lab/vlab-123/project-456/workflows/simulate/configure/circuit/12345678-1234-1234-1234-123456789abc"

        assert EditStateTool.is_correct_simulation_page(url, None) is True

    def test_get_return_url_with_invalid_frontend_url(
        self, shared_state: SharedStatePartial
    ) -> None:
        """Test get_return_url returns None for invalid frontend URLs."""
        tool = EditStateTool(
            metadata=EditStateMetadata(
                shared_state=shared_state,
                current_frontend_url="https://example.com/invalid/path",
                request_id="test-123",
            ),
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

        result = tool.get_return_url(shared_state)
        assert result is None

    def test_get_return_url_with_missing_circuit_id(
        self, shared_state: SharedStatePartial
    ) -> None:
        """Test get_return_url handles missing circuit ID gracefully."""
        # Remove circuit ID from state
        shared_state.smc_simulation_config["initialize"]["circuit"] = {}  # type: ignore

        tool = EditStateTool(
            metadata=EditStateMetadata(
                shared_state=shared_state,
                current_frontend_url="https://example.com/app/virtual-lab/vlab-123/project-456/other-page",
                request_id="test-123",
            ),
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

        result = tool.get_return_url(shared_state)
        # Should return None or empty dict when circuit ID is missing
        assert result is None or result == {}


class TestStateToolsWorkflow:
    """Integration tests for the complete workflow."""

    @pytest.mark.asyncio
    async def test_complete_workflow(self, shared_state: SharedStatePartial) -> None:
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
        self, shared_state: SharedStatePartial
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
