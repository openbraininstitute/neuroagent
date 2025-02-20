"""Tests for the Morphology Viewer tool."""

import json
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from neurom import NeuriteType

from neuroagent.tools import MorphologyViewerTool
from neuroagent.tools.morphology_viewer import (
    MorphologyViewerInput,
    MorphologyViewerMetadata,
)


class TestMorphologyViewerTool:
    @pytest.mark.asyncio
    async def test_arun_2d(self, monkeypatch):
        """Test generating a 2D visualization."""
        # Create fresh mocks for each dependency
        mock_morphology = Mock()
        mock_s3 = Mock()
        mock_load_morphology = Mock(return_value=mock_morphology)
        mock_get_kg_data = AsyncMock(
            return_value=(b"fake_morphology_data", Mock(file_extension="swc"))
        )
        mock_save_to_storage = Mock(return_value="test-storage-id")
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_plot_morph = Mock()

        # Set up monkeypatch for each dependency
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.load_morphology", mock_load_morphology
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.plot_morph", mock_plot_morph
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.get_kg_data", mock_get_kg_data
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.save_to_storage", mock_save_to_storage
        )

        # Create tool instance
        tool = MorphologyViewerTool(
            input_schema=MorphologyViewerInput(
                morphology_id="test_morpho_id",
                plot_type="2d",
                neurite_types=["axon"],
                color="red",
                alpha=0.5,
                linewidth=1.5,
                diameter_scale=1.2,
            ),
            metadata=MorphologyViewerMetadata(
                knowledge_graph_url="http://test.url",
                token="test_token",
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        # Run the tool
        result = await tool.arun()
        result_dict = json.loads(result)

        # Verify the results
        assert "storage_id" in result_dict
        assert result_dict["storage_id"] == "test-storage-id"

        # Verify the mocks were called correctly
        mock_get_kg_data.assert_called_once_with(
            object_id="test_morpho_id",
            httpx_client=mock_httpx_client,
            url="http://test.url",
            token="test_token",
            preferred_format="swc",
        )
        mock_load_morphology.assert_called_once_with(
            b"fake_morphology_data".decode(), reader="swc"
        )

        assert mock_plot_morph.called
        # Get the call arguments from the mock
        call_args = mock_plot_morph.call_args[1]  # Get kwargs from the last call

        # Verify specific parameters we care about
        assert call_args["neurite_type"] == NeuriteType.axon
        assert call_args["color"] == "red"
        assert call_args["alpha"] == 0.5
        assert call_args["linewidth"] == 1.5
        assert call_args["diameter_scale"] == 1.2

        # Verify mock_save_to_storage was called
        assert mock_save_to_storage.called

        # Get the call arguments and verify specific parameters
        save_args = mock_save_to_storage.call_args[1]  # Get kwargs from the last call
        assert save_args["s3_client"] == mock_s3
        assert save_args["bucket_name"] == "test_bucket"
        assert save_args["user_id"] == "test_user"
        assert save_args["content_type"] == "image/png"
        assert save_args["category"] == "image"
        assert save_args["thread_id"] == "test_thread"
        # Note: we don't check 'body' since it contains the variable image data

    @pytest.mark.asyncio
    async def test_arun_3d(self, monkeypatch):
        """Test generating a 3D visualization."""
        # Create fresh mocks for each dependency
        mock_morphology = Mock()
        mock_s3 = Mock()
        mock_load_morphology = Mock(return_value=mock_morphology)
        mock_get_kg_data = AsyncMock(
            return_value=(b"fake_morphology_data", Mock(file_extension="swc"))
        )
        mock_save_to_storage = Mock(return_value="test-storage-id")
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_plot_morph3d = Mock()

        # Set up monkeypatch for each dependency
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.load_morphology", mock_load_morphology
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.plot_morph3d", mock_plot_morph3d
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.get_kg_data", mock_get_kg_data
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.save_to_storage", mock_save_to_storage
        )

        # Create tool instance
        tool = MorphologyViewerTool(
            input_schema=MorphologyViewerInput(
                morphology_id="test_morpho_id",
                plot_type="3d",
                neurite_types=["axon"],
                color="blue",
                alpha=0.6,
                linewidth=2.0,
                diameter_scale=1.5,
            ),
            metadata=MorphologyViewerMetadata(
                knowledge_graph_url="http://test.url",
                token="test_token",
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        # Run the tool
        result = await tool.arun()
        result_dict = json.loads(result)

        # Verify the results
        assert "storage_id" in result_dict
        assert result_dict["storage_id"] == "test-storage-id"

        # Verify mock_plot_morph3d was called with correct parameters
        call_args = mock_plot_morph3d.call_args[1]
        assert call_args["neurite_type"] == NeuriteType.axon
        assert call_args["color"] == "blue"
        assert call_args["alpha"] == 0.6
        assert call_args["linewidth"] == 2.0
        assert call_args["diameter_scale"] == 1.5

    @pytest.mark.asyncio
    async def test_arun_dendrogram(self, monkeypatch):
        """Test generating a dendrogram visualization."""
        # Create fresh mocks for each dependency
        mock_morphology = Mock()
        mock_s3 = Mock()
        mock_load_morphology = Mock(return_value=mock_morphology)
        mock_get_kg_data = AsyncMock(
            return_value=(b"fake_morphology_data", Mock(file_extension="swc"))
        )
        mock_save_to_storage = Mock(return_value="test-storage-id")
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_plot_dendrogram = Mock()

        # Set up monkeypatch for each dependency
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.load_morphology", mock_load_morphology
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.plot_dendrogram", mock_plot_dendrogram
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.get_kg_data", mock_get_kg_data
        )
        monkeypatch.setattr(
            "neuroagent.tools.morphology_viewer.save_to_storage", mock_save_to_storage
        )

        # Create tool instance
        tool = MorphologyViewerTool(
            input_schema=MorphologyViewerInput(
                morphology_id="test_morpho_id",
                plot_type="dendrogram",
                show_diameters=False,
            ),
            metadata=MorphologyViewerMetadata(
                knowledge_graph_url="http://test.url",
                token="test_token",
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        # Run the tool
        result = await tool.arun()
        result_dict = json.loads(result)

        # Verify the results
        assert "storage_id" in result_dict
        assert result_dict["storage_id"] == "test-storage-id"

        # Verify mock_plot_dendrogram was called with correct parameters
        call_args = mock_plot_dendrogram.call_args[1]
        assert call_args["show_diameters"] is False
