"""Tests Morphology features tool."""

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
                "aspect_ratio": 0.322,
                "circularity": 0.5,
                "length_fraction_above_soma": 0.824,
                "max_radial_distance": 1085.525,
                "number_of_neurites": 8,
                "soma_radius": 7.554,
                "soma_surface_area": 676.125,
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
                "aspect_ratio": 0.322,
                "circularity": 0.5,
                "length_fraction_above_soma": 0.824,
                "max_radial_distance": 1085.525,
                "number_of_neurites": 8,
                "soma_radius": 7.554,
                "soma_surface_area": 676.125,
            },
        )

        tool = MorphoMetricsTool(
            metadata=MorphoMetricsMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id="vlab_1234",
                project_id="proj_3456",
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
