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
                    "step_0": {
                        "spike_count": {
                            "avg": 1.6666666666666667,
                            "num_traces": 3,
                            "unit": None,
                        },
                        "time_to_first_spike": {
                            "avg": 6.62500000002413,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "time_to_last_spike": {
                            "avg": 19.400000000027035,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "inv_time_to_first_spike": {
                            "avg": 303.1065437050581,
                            "num_traces": 3,
                            "unit": "Hz",
                        },
                        "doublet_ISI": {
                            "avg": 19.162500000004357,
                            "num_traces": 2,
                            "unit": "ms",
                        },
                        "inv_first_ISI": {
                            "avg": 72.74608153443701,
                            "num_traces": 2,
                            "unit": "Hz",
                        },
                        "mean_frequency": {
                            "avg": 228.74223751569082,
                            "num_traces": 3,
                            "unit": "Hz",
                        },
                        "strict_burst_number": {
                            "avg": 0,
                            "num_traces": 3,
                            "unit": None,
                        },
                        "AP_height": {
                            "avg": -12.364847343260458,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AP_amplitude": {
                            "avg": 50.82487408104208,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AP1_amp": {
                            "avg": 52.47725295811486,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "APlast_amp": {
                            "avg": 49.1724952039693,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AP_duration_half_width": {
                            "avg": 0.30833333333340346,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "AHP_depth": {
                            "avg": 20.406671862343615,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AHP_time_from_peak": {
                            "avg": 4.0458333333342535,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "AP_peak_upstroke": {
                            "avg": 308.75729239209045,
                            "num_traces": 3,
                            "unit": "V/s",
                        },
                        "AP_peak_downstroke": {
                            "avg": -187.83831913656505,
                            "num_traces": 3,
                            "unit": "V/s",
                        },
                        "voltage_base": {
                            "avg": -84.99950124873655,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "voltage_after_stim": {
                            "avg": -86.35750426839668,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "ohmic_input_resistance_vb_ssse": {
                            "avg": 98.15062867785197,
                            "num_traces": 3,
                            "unit": "MΩ",
                        },
                        "steady_state_voltage_stimend": {
                            "avg": -48.9862517948066,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "decay_time_constant_after_stim": {
                            "avg": 2.369212177407707,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "depol_block_bool": {"avg": 0, "num_traces": 3, "unit": None},
                        "stimulus_current": "0.37648126234610874 nA",
                    }
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
                    "step_0": {
                        "spike_count": {
                            "avg": 1.6666666666666667,
                            "num_traces": 3,
                            "unit": None,
                        },
                        "time_to_first_spike": {
                            "avg": 6.62500000002413,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "time_to_last_spike": {
                            "avg": 19.400000000027035,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "inv_time_to_first_spike": {
                            "avg": 303.1065437050581,
                            "num_traces": 3,
                            "unit": "Hz",
                        },
                        "doublet_ISI": {
                            "avg": 19.162500000004357,
                            "num_traces": 2,
                            "unit": "ms",
                        },
                        "inv_first_ISI": {
                            "avg": 72.74608153443701,
                            "num_traces": 2,
                            "unit": "Hz",
                        },
                        "mean_frequency": {
                            "avg": 228.74223751569082,
                            "num_traces": 3,
                            "unit": "Hz",
                        },
                        "strict_burst_number": {
                            "avg": 0,
                            "num_traces": 3,
                            "unit": None,
                        },
                        "AP_height": {
                            "avg": -12.364847343260458,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AP_amplitude": {
                            "avg": 50.82487408104208,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AP1_amp": {
                            "avg": 52.47725295811486,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "APlast_amp": {
                            "avg": 49.1724952039693,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AP_duration_half_width": {
                            "avg": 0.30833333333340346,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "AHP_depth": {
                            "avg": 20.406671862343615,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "AHP_time_from_peak": {
                            "avg": 4.0458333333342535,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "AP_peak_upstroke": {
                            "avg": 308.75729239209045,
                            "num_traces": 3,
                            "unit": "V/s",
                        },
                        "AP_peak_downstroke": {
                            "avg": -187.83831913656505,
                            "num_traces": 3,
                            "unit": "V/s",
                        },
                        "voltage_base": {
                            "avg": -84.99950124873655,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "voltage_after_stim": {
                            "avg": -86.35750426839668,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "ohmic_input_resistance_vb_ssse": {
                            "avg": 98.15062867785197,
                            "num_traces": 3,
                            "unit": "MΩ",
                        },
                        "steady_state_voltage_stimend": {
                            "avg": -48.9862517948066,
                            "num_traces": 3,
                            "unit": "mV",
                        },
                        "decay_time_constant_after_stim": {
                            "avg": 2.369212177407707,
                            "num_traces": 3,
                            "unit": "ms",
                        },
                        "depol_block_bool": {"avg": 0, "num_traces": 3, "unit": None},
                        "stimulus_current": "0.37648126234610874 nA",
                    }
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
