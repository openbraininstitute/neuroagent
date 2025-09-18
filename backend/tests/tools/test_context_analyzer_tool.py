"""Test for the context analyzer tool."""

import json
import pathlib
from unittest.mock import mock_open, patch
from urllib.parse import urlencode

import httpx
import pytest

from neuroagent.tools.context_analyzer_tool import (
    ContextAnalyzerInput,
    ContextAnalyzerMetdata,
    ContextAnalyzerTool,
)

# Mock platform description data
MOCK_PLATFORM_DESCRIPTIONS = {
    "general": "General platform information. ",
    "sidebar": "Sidebar navigation information. ",
    "page_selection": "Page selection information. ",
    "home": "Home page specific information. ",
    "library": "Library page specific information. ",
    "project_team": "Project team page specific information. ",
    "activity": "Activity page specific information. ",
    "notebooks": "Notebooks page specific information. ",
    "chat": "Chat functionality information. ",
    "explore": "Explore page general information. ",
    "explore-morphology": "Morphology exploration information. ",
    "explore-morphology-details": "Detailed morphology view information. ",
    "explore-electrophysiology": "Electrophysiology exploration information. ",
    "explore-electrophysiology-details": "Detailed electrophysiology view information. ",
    "explore-neuron-density": "Neuron density exploration information. ",
    "explore-neuron-density-details": "Detailed neuron density view information. ",
    "explore-bouton-density": "Bouton density exploration information. ",
    "explore-bouton-density-details": "Detailed bouton density view information. ",
    "explore-synapse-per-connection": "Synapse per connection exploration information. ",
    "build": "Build page general information. ",
    "build-me-model": "ME model building information. ",
    "build-me-model-details": "ME model configuration details. ",
    "build-me-model-morphology-selection": "Morphology selection for ME model. ",
    "build-me-model-e-model-selection": "E-model selection for ME model. ",
    "build-synaptome": "Synaptome building information. ",
    "build-synaptome-details": "Synaptome configuration details. ",
    "experiment": "Simulation/experiment page information. ",
    "admin": "Admin page information. ",
}

# Mock brain region response
MOCK_BRAIN_REGION = {
    "creation_date": "2025-06-27T11:10:27.186088Z",
    "update_date": "2025-06-27T11:10:27.186088Z",
    "id": "75e3944e-8dcd-4210-a3a2-258f3de63d61",
    "annotation_value": 123,
    "name": "Test brain region",
    "acronym": "TE",
    "color_hex_triplet": "FF7080",
    "parent_structure_id": "5cf6e757-8b50-4f22-ba3b-a000a78826d6",
    "hierarchy_id": "e3e70682-c209-4cac-a29f-6fbed82c0700",
}

# Mock morphology entities response
MOCK_MORPHOLOGY_ENTITIES = {
    "data": [
        {"id": "morph-1", "name": "Morphology 1"},
        {"id": "morph-2", "name": "Morphology 2"},
        {"id": "morph-3", "name": "Morphology 3"},
    ],
}

# Mock electrophysiology entities response
MOCK_ELECTROPHYSIOLOGY_ENTITIES = {
    "data": [
        {"id": "ephys-1", "name": "Electrophysiology 1"},
        {"id": "ephys-2", "name": "Electrophysiology 2"},
    ]
}

# Mock detailed entity response
MOCK_DETAILED_ENTITY = {
    "id": "afa2434f-1ccc-4fff-a047-d399e59768c9",
    "name": "Test Morphology",
    "description": "A test morphology entity",
    "type": "morphology",
}

# Query params for the get all endpoints :
QUERY_PARAMS = {
    "page_size": "30",
    "page": "1",
    "order_by": "-creation_date",
    "within_brain_region_hierarchy_id": "e3e70682-c209-4cac-a29f-6fbed82c07cd",
    "within_brain_region_brain_region_id": "affb7c97-b458-45db-b671-5fe0005fe4e2",
    "within_brain_region_ascendants": "false",
    "with_facets": "true",
}


@pytest.fixture
def mock_metadata():
    """Create mock metadata for testing."""
    metadata = ContextAnalyzerMetdata(
        current_frontend_url="temp_url",
        vlab_id="4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d",
        project_id="9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6",
        entitycore_url="http://test-entitycore.com",
        entity_frontend_url="mock_url",
        httpx_client=httpx.AsyncClient(),
    )
    return metadata


@pytest.fixture
def context_analyzer_tool(mock_metadata):
    """Create ContextAnalyzerTool instance for testing."""
    return ContextAnalyzerTool(
        metadata=mock_metadata, input_schema=ContextAnalyzerInput()
    )


@pytest.fixture
def mock_platform_descriptions():
    m = mock_open(read_data=json.dumps(MOCK_PLATFORM_DESCRIPTIONS))
    with (
        patch.object(pathlib.Path, "open", m),
        patch("json.load", return_value=MOCK_PLATFORM_DESCRIPTIONS),
    ):
        yield


class TestContextAnalyzerTool:
    """Test cases for ContextAnalyzerTool."""

    @pytest.mark.asyncio
    async def test_home_page_in_project(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test home page within a project."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/home"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "home"
        assert "Home page specific information" in result.page_description
        assert "General platform information" in result.page_description

    @pytest.mark.asyncio
    async def test_library_page_in_project(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test library page within a project."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/library"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "library"
        assert "Library page specific information" in result.page_description

    @pytest.mark.asyncio
    async def test_team_page_in_project(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test team page within a project."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/team"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "team"
        assert "Project team page specific information" in result.page_description

    @pytest.mark.asyncio
    async def test_activity_page_in_project(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test activity page within a project."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/activity"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "activity"
        assert "Activity page specific information" in result.page_description

    @pytest.mark.asyncio
    async def test_notebooks_page_in_project(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test notebooks page within a project."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/notebooks"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "notebooks"
        assert "Notebooks page specific information" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_base_page_with_brain_region(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore base page with brain region query parameter."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2&br_av=695"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "explore/interactive"
        assert "Chat functionality information" in result.page_description
        assert "Test brain region" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_morphology_list(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore morphology list page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/morphology?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2&br_av=695"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/reconstruction-morphology?{urlencode(QUERY_PARAMS)}",
            json=MOCK_MORPHOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "explore/interactive/experimental/morphology"
        assert "Morphology exploration information" in result.page_description
        assert "Morphology 1" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_electrophysiology_list(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore electrophysiology list page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/electrophysiology?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/electrical-cell-recording?{urlencode(QUERY_PARAMS)}",
            json=MOCK_ELECTROPHYSIOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert (
            result.full_page_path
            == "explore/interactive/experimental/electrophysiology"
        )
        assert "Electrophysiology exploration information" in result.page_description
        assert "Electrophysiology 1" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_neuron_density_list(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore neuron density list page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/neuron-density?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/experimental-neuron-density?{urlencode(QUERY_PARAMS)}",
            json=MOCK_MORPHOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert (
            result.full_page_path == "explore/interactive/experimental/neuron-density"
        )
        assert "Neuron density exploration information" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_bouton_density_list(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore bouton density list page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/bouton-density?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/experimental-bouton-density?{urlencode(QUERY_PARAMS)}",
            json=MOCK_MORPHOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert (
            result.full_page_path == "explore/interactive/experimental/bouton-density"
        )
        assert "Bouton density exploration information" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_synapse_per_connection_list(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore synapse per connection list page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/synapse-per-connection?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/experimental-synapses-per-connection?{urlencode(QUERY_PARAMS)}",
            json=MOCK_MORPHOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert (
            result.full_page_path
            == "explore/interactive/experimental/synapse-per-connection"
        )
        assert (
            "Synapse per connection exploration information" in result.page_description
        )

    @pytest.mark.asyncio
    async def test_explore_morphology_details(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore morphology details page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/morphology/afa2434f-1ccc-4fff-a047-d399e59768c9"

        httpx_mock.add_response(
            url="http://test-entitycore.com/reconstruction-morphology/afa2434f-1ccc-4fff-a047-d399e59768c9",
            json=MOCK_DETAILED_ENTITY,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert (
            result.full_page_path
            == "explore/interactive/experimental/morphology/afa2434f-1ccc-4fff-a047-d399e59768c9"
        )
        assert "Detailed morphology view information" in result.page_description
        assert "Test Morphology" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_electrophysiology_details(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test explore electrophysiology details page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/explore/interactive/experimental/electrophysiology/ephys-123"

        httpx_mock.add_response(
            url="http://test-entitycore.com/electrical-cell-recording/ephys-123",
            json=MOCK_DETAILED_ENTITY,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert (
            result.full_page_path
            == "explore/interactive/experimental/electrophysiology/ephys-123"
        )
        assert "Detailed electrophysiology view information" in result.page_description

    @pytest.mark.asyncio
    async def test_build_base_page(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test build base page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build"
        assert "Build page general information" in result.page_description

    @pytest.mark.asyncio
    async def test_build_me_model_new(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test build ME model new page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/me-model/new"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/me-model/new"
        assert "ME model building information." in result.page_description

    @pytest.mark.asyncio
    async def test_build_me_model_configure(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test build ME model configure page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/me-model/model-123/configure"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/me-model/model-123/configure"
        assert "ME model configuration details" in result.page_description

    @pytest.mark.asyncio
    async def test_build_me_model_morphology_selection(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test build ME model morphology selection page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/me-model/model-123/configure/morphology?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/reconstruction-morphology?{urlencode(QUERY_PARAMS)}",
            json=MOCK_MORPHOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/me-model/model-123/configure/morphology"
        assert "Morphology selection for ME model" in result.page_description
        assert "Morphology 1" in result.page_description

    @pytest.mark.asyncio
    async def test_build_me_model_e_model_selection(
        self, context_analyzer_tool, mock_platform_descriptions, httpx_mock
    ):
        """Test build ME model e-model selection page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/me-model/model-123/configure/e-model?br_id=affb7c97-b458-45db-b671-5fe0005fe4e2"

        httpx_mock.add_response(
            url="http://test-entitycore.com/brain-region/affb7c97-b458-45db-b671-5fe0005fe4e2",
            json=MOCK_BRAIN_REGION,
            status_code=200,
        )
        httpx_mock.add_response(
            url=f"http://test-entitycore.com/electrical-cell-recording?{urlencode(QUERY_PARAMS)}",
            json=MOCK_ELECTROPHYSIOLOGY_ENTITIES,
            status_code=200,
        )

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/me-model/model-123/configure/e-model"
        assert "E-model selection for ME model" in result.page_description
        assert "Electrophysiology 1" in result.page_description

    @pytest.mark.asyncio
    async def test_build_synaptome_new(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test build synaptome new page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/synaptome/new"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/synaptome/new"
        assert "Synaptome building information" in result.page_description

    @pytest.mark.asyncio
    async def test_build_synaptome_configure(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test build synaptome configure page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/synaptome/syn-123/configure"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/synaptome/syn-123/configure"
        assert "Synaptome configuration details" in result.page_description

    @pytest.mark.asyncio
    async def test_build_synaptome_unimplemented(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test build synaptome unimplemented page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/build/synaptome/syn-123/other"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "build/synaptome/syn-123/other"
        assert "This page has not be implemented yet" in result.page_description

    @pytest.mark.asyncio
    async def test_simulate_page(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test simulate page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/simulate"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "simulate"
        assert "Simulation/experiment page information" in result.page_description

    @pytest.mark.asyncio
    async def test_admin_page(self, context_analyzer_tool, mock_platform_descriptions):
        """Test admin page."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/lab/4d3c5a1e-13a2-4fa7-87bb-4ea92b7c7a3d/project/9a8f4c5d-27e4-44a1-a7d2-9e5d69fdb1f6/admin"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is True
        assert result.full_page_path == "admin"
        assert "Admin page information" in result.page_description

    @pytest.mark.asyncio
    async def test_explore_outside_project(
        self, context_analyzer_tool, mock_platform_descriptions
    ):
        """Test explore page outside of project context."""
        context_analyzer_tool.metadata.current_frontend_url = "app/virtual-lab/explore"

        result = await context_analyzer_tool.arun()

        assert result.is_in_project is False
        assert result.full_page_path == "explore"
        assert "Chat functionality information" in result.page_description
        # Should not include page_selection for explore
        assert "Page selection information" not in result.page_description
