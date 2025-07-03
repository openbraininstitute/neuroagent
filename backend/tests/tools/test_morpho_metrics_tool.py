"""Tests Morphology features tool."""

import uuid

import httpx
import pytest

from neuroagent.tools import MorphoMetricsTool
from neuroagent.tools.morpho_metrics_tool import (
    MorphologyMetricsOutput,
    MorphoMetricsInputs,
    MorphoMetricsMetadata,
)


class TestMorphoMetricsTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock):
        httpx_mock.add_response(
            url="http://obione.org/declared/neuron-morphology-metrics/1234",
            json={
                "aspect_ratio": 0.65,
                "circularity": 0.78,
                "length_fraction_above_soma": 0.54,
                "max_radial_distance": 235.4,
                "number_of_neurites": 5,
                "soma_radius": 6.8,
                "soma_surface_area": 580.3,
                "total_length": 2750.6,
                "total_height": 160.5,
                "total_depth": 190.7,
                "total_area": 9100.2,
                "total_volume": 6800.5,
                "section_lengths": [73.2, 105.4, 87.3, 44.9, 67.1],
                "segment_radii": [0.8, 1.1, 0.5, 1.3, 0.6],
                "number_of_sections": 20,
                "local_bifurcation_angles": [1.1, 1.7, 2.2, 0.9, 1.5],
                "remote_bifurcation_angles": [1.2, 1.9, 2.5, 1.1, 1.6],
                "section_path_distances": [105.0, 230.4, 145.3, 198.2, 112.7],
                "section_radial_distances": [55.4, 175.3, 120.5, 142.6, 100.7],
                "section_branch_orders": [1, 2, 3, 2, 1],
                "section_strahler_orders": [1, 2, 2, 1, 3],
            },
        )
        tool = MorphoMetricsTool(
            metadata=MorphoMetricsMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=None,
                project_id=None,
            ),
            input_schema=MorphoMetricsInputs(morphology_id="1234"),
        )

        response = await tool.arun()
        assert isinstance(response, MorphologyMetricsOutput)

    @pytest.mark.asyncio
    async def test_arun_vlab_proj(self, httpx_mock):
        httpx_mock.add_response(
            url="http://obione.org/declared/neuron-morphology-metrics/1234",
            json={
                "aspect_ratio": 0.65,
                "circularity": 0.78,
                "length_fraction_above_soma": 0.54,
                "max_radial_distance": 235.4,
                "number_of_neurites": 5,
                "soma_radius": 6.8,
                "soma_surface_area": 580.3,
                "total_length": 2750.6,
                "total_height": 160.5,
                "total_depth": 190.7,
                "total_area": 9100.2,
                "total_volume": 6800.5,
                "section_lengths": [73.2, 105.4, 87.3, 44.9, 67.1],
                "segment_radii": [0.8, 1.1, 0.5, 1.3, 0.6],
                "number_of_sections": 20,
                "local_bifurcation_angles": [1.1, 1.7, 2.2, 0.9, 1.5],
                "remote_bifurcation_angles": [1.2, 1.9, 2.5, 1.1, 1.6],
                "section_path_distances": [105.0, 230.4, 145.3, 198.2, 112.7],
                "section_radial_distances": [55.4, 175.3, 120.5, 142.6, 100.7],
                "section_branch_orders": [1, 2, 3, 2, 1],
                "section_strahler_orders": [1, 2, 2, 1, 3],
            },
        )

        tool = MorphoMetricsTool(
            metadata=MorphoMetricsMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=uuid.uuid4(),
                project_id=uuid.uuid4(),
            ),
            input_schema=MorphoMetricsInputs(morphology_id="1234"),
        )

        response = await tool.arun()
        assert isinstance(response, MorphologyMetricsOutput)

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock):
        tool = MorphoMetricsTool(
            metadata=MorphoMetricsMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=None,
                project_id=None,
            ),
            input_schema=MorphoMetricsInputs(morphology_id="1234"),
        )

        httpx_mock.add_response(
            url="http://obione.org/declared/neuron-morphology-metrics/1234",
            status_code=404,
            text="Resource not found.",
        )
        with pytest.raises(ValueError) as tool_exception:
            await tool.arun()

        assert (
            tool_exception.value.args[0]
            == "The morpho metrics endpoint returned a non 200 response code. Error: Resource not found."
        )
