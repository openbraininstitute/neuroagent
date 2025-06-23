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

        tool = MorphometricsGetOneTool(
            metadata=MorphometricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=uuid.uuid4().hex,
                project_id=uuid.uuid4().hex,
            ),
            input_schema=MorphometricsGetOneInputs(morphology_id="1234"),
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
