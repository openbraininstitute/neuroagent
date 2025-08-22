"""Tests ObiOne Morphometrics tool."""

import uuid

import httpx
import pytest

from neuroagent.tools import MorphometricsGetOneTool
from neuroagent.tools.obione_morphometrics_getone import (
    MorphologyMetricsOutput,
    MorphometricsGetOneInputs,
    MorphometricsGetOneMetadata,
)


class TestMorphometricsGetOneTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock):
        httpx_mock.add_response(
            url="http://obione.org/declared/neuron-morphology-metrics/1234?requested_metrics=circularity&requested_metrics=soma_radius",
            json={
                "aspect_ratio": None,
                "circularity": 0.78,
                "length_fraction_above_soma": None,
                "max_radial_distance": None,
                "number_of_neurites": None,
                "soma_radius": 6.8,
                "soma_surface_area": None,
                "total_length": None,
                "total_height": None,
                "total_depth": None,
                "total_area": None,
                "total_volume": None,
                "section_lengths": None,
                "segment_radii": None,
                "number_of_sections": None,
                "local_bifurcation_angles": None,
                "remote_bifurcation_angles": None,
                "section_path_distances": None,
                "section_radial_distances": None,
                "section_branch_orders": None,
                "section_strahler_orders": None,
            },
        )
        tool = MorphometricsGetOneTool(
            metadata=MorphometricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=None,
                project_id=None,
            ),
            input_schema=MorphometricsGetOneInputs(
                morphology_id="1234", requested_metrics=["circularity", "soma_radius"]
            ),
        )

        response = await tool.arun()
        assert isinstance(response, MorphologyMetricsOutput)

    @pytest.mark.asyncio
    async def test_arun_vlab_proj(self, httpx_mock):
        httpx_mock.add_response(
            url="http://obione.org/declared/neuron-morphology-metrics/1234?requested_metrics=circularity&requested_metrics=soma_radius",
            json={
                "aspect_ratio": None,
                "circularity": 0.78,
                "length_fraction_above_soma": None,
                "max_radial_distance": None,
                "number_of_neurites": None,
                "soma_radius": 6.8,
                "soma_surface_area": None,
                "total_length": None,
                "total_height": None,
                "total_depth": None,
                "total_area": None,
                "total_volume": None,
                "section_lengths": None,
                "segment_radii": None,
                "number_of_sections": None,
                "local_bifurcation_angles": None,
                "remote_bifurcation_angles": None,
                "section_path_distances": None,
                "section_radial_distances": None,
                "section_branch_orders": None,
                "section_strahler_orders": None,
            },
        )

        tool = MorphometricsGetOneTool(
            metadata=MorphometricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=uuid.uuid4(),
                project_id=uuid.uuid4(),
            ),
            input_schema=MorphometricsGetOneInputs(
                morphology_id="1234", requested_metrics=["circularity", "soma_radius"]
            ),
        )

        response = await tool.arun()
        assert isinstance(response, MorphologyMetricsOutput)

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock):
        tool = MorphometricsGetOneTool(
            metadata=MorphometricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=None,
                project_id=None,
            ),
            input_schema=MorphometricsGetOneInputs(morphology_id="1234"),
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
