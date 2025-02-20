"""Tests for the Plot Generator tool."""

import json
from unittest.mock import Mock

import httpx
import pytest

from neuroagent.tools import PlotGeneratorTool
from neuroagent.tools.generate_plot import PlotInput, PlotMetadata


class TestPlotGeneratorTool:
    @pytest.mark.asyncio
    async def test_generate_piechart(self, monkeypatch):
        """Test generating a pie chart."""
        # Create mock for save_to_storage
        mock_s3 = Mock()
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_save_to_storage = Mock(return_value="test-storage-id")
        monkeypatch.setattr(
            "neuroagent.tools.generate_plot.save_to_storage", mock_save_to_storage
        )

        # Create tool instance
        tool = PlotGeneratorTool(
            input_schema=PlotInput(
                plot_type="json-piechart",
                title="Test Pie Chart",
                description="A test pie chart",
                piechart_values=[
                    {"category": "A", "value": 30, "color": "#FF0000"},
                    {"category": "B", "value": 70, "color": "#00FF00"},
                ],
            ),
            metadata=PlotMetadata(
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

        # Verify save_to_storage was called with correct parameters
        save_args = mock_save_to_storage.call_args[1]
        assert save_args["s3_client"] == mock_s3
        assert save_args["bucket_name"] == "test_bucket"
        assert save_args["user_id"] == "test_user"
        assert save_args["content_type"] == "application/json"
        assert save_args["category"] == "json-piechart"
        assert save_args["thread_id"] == "test_thread"

    @pytest.mark.asyncio
    async def test_generate_barplot(self, monkeypatch):
        """Test generating a bar plot."""
        mock_s3 = Mock()
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_save_to_storage = Mock(return_value="test-storage-id")
        monkeypatch.setattr(
            "neuroagent.tools.generate_plot.save_to_storage", mock_save_to_storage
        )

        tool = PlotGeneratorTool(
            input_schema=PlotInput(
                plot_type="json-barplot",
                title="Test Bar Plot",
                description="A test bar plot",
                x_label="Categories",
                y_label="Values",
                barplot_values=[
                    {"category": "A", "value": 10.5, "error": 1.2},
                    {"category": "B", "value": 15.7, "error": 0.8},
                ],
            ),
            metadata=PlotMetadata(
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        result = await tool.arun()
        assert json.loads(result)["storage_id"] == "test-storage-id"

    @pytest.mark.asyncio
    async def test_generate_histogram(self, monkeypatch):
        """Test generating a histogram."""
        mock_s3 = Mock()
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_save_to_storage = Mock(return_value="test-storage-id")
        monkeypatch.setattr(
            "neuroagent.tools.generate_plot.save_to_storage", mock_save_to_storage
        )

        tool = PlotGeneratorTool(
            input_schema=PlotInput(
                plot_type="json-histogram",
                title="Test Histogram",
                description="A test histogram",
                x_label="Values",
                y_label="Frequency",
                histogram_values=[1.0, 2.0, 2.0, 3.0, 3.0, 3.0, 4.0],
                histogram_bins=4,
                histogram_color="#FF0000",
            ),
            metadata=PlotMetadata(
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        result = await tool.arun()
        assert json.loads(result)["storage_id"] == "test-storage-id"

    @pytest.mark.asyncio
    async def test_generate_linechart(self, monkeypatch):
        """Test generating a line chart."""
        mock_s3 = Mock()
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_save_to_storage = Mock(return_value="test-storage-id")
        monkeypatch.setattr(
            "neuroagent.tools.generate_plot.save_to_storage", mock_save_to_storage
        )

        tool = PlotGeneratorTool(
            input_schema=PlotInput(
                plot_type="json-linechart",
                title="Test Line Chart",
                description="A test line chart",
                x_label="X Values",
                y_label="Y Values",
                linechart_values=[
                    {"x": 1.0, "y": 2.0},
                    {"x": 2.0, "y": 4.0},
                    {"x": 3.0, "y": 6.0},
                ],
                line_style="dashed",
                line_color="#0000FF",
            ),
            metadata=PlotMetadata(
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        result = await tool.arun()
        assert json.loads(result)["storage_id"] == "test-storage-id"

    @pytest.mark.asyncio
    async def test_generate_scatterplot(self, monkeypatch):
        """Test generating a scatter plot."""
        mock_s3 = Mock()
        mock_httpx_client = Mock(spec=httpx.AsyncClient)
        mock_save_to_storage = Mock(return_value="test-storage-id")
        monkeypatch.setattr(
            "neuroagent.tools.generate_plot.save_to_storage", mock_save_to_storage
        )

        tool = PlotGeneratorTool(
            input_schema=PlotInput(
                plot_type="json-scatterplot",
                title="Test Scatter Plot",
                description="A test scatter plot",
                x_label="X Values",
                y_label="Y Values",
                scatter_values=[
                    {"x": 1.0, "y": 2.0, "label": "Point A", "color": "#FF0000"},
                    {"x": 2.0, "y": 3.0, "label": "Point B", "color": "#00FF00"},
                ],
            ),
            metadata=PlotMetadata(
                s3_client=mock_s3,
                user_id="test_user",
                bucket_name="test_bucket",
                thread_id="test_thread",
                httpx_client=mock_httpx_client,
            ),
        )

        result = await tool.arun()
        assert json.loads(result)["storage_id"] == "test-storage-id"

    @pytest.mark.asyncio
    async def test_missing_values_error(self):
        """Test that appropriate errors are raised when required values are missing."""
        mock_s3 = Mock()

        # Test missing piechart values
        with pytest.raises(ValueError, match="Piechart values are required"):
            tool = PlotGeneratorTool(
                input_schema=PlotInput(
                    plot_type="json-piechart",
                    title="Test Plot",
                    description="Test Description",
                ),
                metadata=PlotMetadata(
                    s3_client=mock_s3,
                    user_id="test_user",
                    bucket_name="test_bucket",
                    thread_id="test_thread",
                    httpx_client=Mock(spec=httpx.AsyncClient),
                ),
            )
            await tool.arun()

    @pytest.mark.asyncio
    async def test_is_online(self):
        """Test the is_online class method."""
        assert await PlotGeneratorTool.is_online() is True
