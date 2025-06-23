"""Tests ObiOne Electrophysiology Metrics tool."""

import uuid

import httpx
import pytest

from neuroagent.tools import EphysMetricsGetOneTool
from neuroagent.tools.obione_ephysmetrics_getone import (
    ElectrophysiologyMetricsOutput,
    EphysMetricsGetOneInputs,
    EphysMetricsGetOneMetadata,
)


class TestEphysMetricsGetOneTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock):
        httpx_mock.add_response(
            url="http://obione.org/declared/electrophysiology-metrics/1234",
            json={
                "feature_dict": {
                    "spike_frequency": {"avg": 15.5, "unit": "Hz", "num_traces": 3},
                    "resting_membrane_potential": {
                        "avg": -65.2,
                        "unit": "mV",
                        "num_traces": 3,
                    },
                }
            },
        )
        tool = EphysMetricsGetOneTool(
            metadata=EphysMetricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=None,
                project_id=None,
            ),
            input_schema=EphysMetricsGetOneInputs(electrical_cell_recording_id="1234"),
        )

        response = await tool.arun()
        assert isinstance(response, ElectrophysiologyMetricsOutput)

    @pytest.mark.asyncio
    async def test_arun_vlab_proj(self, httpx_mock):
        httpx_mock.add_response(
            url="http://obione.org/declared/electrophysiology-metrics/1234",
            json={
                "feature_dict": {
                    "spike_frequency": {"avg": 15.5, "unit": "Hz", "num_traces": 3},
                    "resting_membrane_potential": {
                        "avg": -65.2,
                        "unit": "mV",
                        "num_traces": 3,
                    },
                }
            },
        )

        tool = EphysMetricsGetOneTool(
            metadata=EphysMetricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=uuid.uuid4().hex,
                project_id=uuid.uuid4().hex,
            ),
            input_schema=EphysMetricsGetOneInputs(electrical_cell_recording_id="1234"),
        )

        response = await tool.arun()
        assert isinstance(response, ElectrophysiologyMetricsOutput)

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock):
        tool = EphysMetricsGetOneTool(
            metadata=EphysMetricsGetOneMetadata(
                httpx_client=httpx.AsyncClient(),
                obi_one_url="http://obione.org",
                token="fake_token",
                vlab_id=None,
                project_id=None,
            ),
            input_schema=EphysMetricsGetOneInputs(electrical_cell_recording_id="1234"),
        )

        httpx_mock.add_response(
            url="http://obione.org/declared/electrophysiology-metrics/1234",
            status_code=404,
            text="Resource not found.",
        )
        with pytest.raises(ValueError) as tool_exception:
            await tool.arun()

        assert (
            tool_exception.value.args[0]
            == "The electrophysiology metrics endpoint returned a non 200 response code. Error: Resource not found."
        )
