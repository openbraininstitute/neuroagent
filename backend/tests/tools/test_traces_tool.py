"""Tests Traces tool."""

import json
from pathlib import Path
from unittest.mock import Mock

import httpx
import pytest

from neuroagent.tools import GetTracesTool
from neuroagent.tools.traces_tool import GetTracesInput, GetTracesMetadata


class TestTracesTool:
    @pytest.mark.httpx_mock(can_send_already_matched_responses=True)
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock, brain_region_json_path):
        url = "http://fake_url"
        json_path = Path(__file__).resolve().parent.parent / "data" / "get_traces.json"
        with open(json_path) as f:
            get_traces_response = json.load(f)

        httpx_mock.add_response(
            url=url,
            json=get_traces_response,
        )

        # Mock S3 client and response
        mock_s3 = Mock()
        with open(brain_region_json_path) as f:
            brain_region_dict = json.load(f)

        class MockStreamingBody:
            def read(self):
                return json.dumps(brain_region_dict).encode()

        mock_s3.get_object.return_value = {"Body": MockStreamingBody()}

        tool = GetTracesTool(
            metadata=GetTracesMetadata(
                knowledge_graph_url=url,
                trace_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                bucket_name="test-bucket",
                brainregion_hierarchy_storage_key="test-br-key",
                s3_client=mock_s3,
            ),
            input_schema=GetTracesInput(brain_region_id="brain_region_id_link/549"),
        )

        response = await tool.arun()

        # Verify S3 get_object was called with correct parameters
        mock_s3.get_object.assert_called_once_with(
            Bucket="test-bucket", Key="test-br-key"
        )

        assert isinstance(response, str)
        response = json.loads(response)
        assert len(response["traces"]) == 2
        assert isinstance(response["traces"][0], dict)

    @pytest.mark.httpx_mock(can_send_already_matched_responses=True)
    @pytest.mark.asyncio
    async def test_arun_with_etype(self, httpx_mock, brain_region_json_path):
        url = "http://fake_url"
        json_path = Path(__file__).resolve().parent.parent / "data" / "get_traces.json"
        with open(json_path) as f:
            get_traces_response = json.load(f)

        httpx_mock.add_response(
            url=url,
            json=get_traces_response,
        )

        # Mock S3 client and response
        mock_s3 = Mock()
        with open(brain_region_json_path) as f:
            brain_region_dict = json.load(f)

        class MockStreamingBody:
            def read(self):
                return json.dumps(brain_region_dict).encode()

        mock_s3.get_object.return_value = {"Body": MockStreamingBody()}

        tool = GetTracesTool(
            metadata=GetTracesMetadata(
                knowledge_graph_url=url,
                trace_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                bucket_name="test-bucket",
                brainregion_hierarchy_storage_key="test-br-key",
                s3_client=mock_s3,
            ),
            input_schema=GetTracesInput(
                brain_region_id="brain_region_id_link/549", etype_id="bAC_id/123"
            ),
        )
        response = await tool.arun()

        # Verify S3 get_object was called with correct parameters
        mock_s3.get_object.assert_called_once_with(
            Bucket="test-bucket", Key="test-br-key"
        )

        assert isinstance(response, str)
        response = json.loads(response)
        assert len(response["traces"]) == 2
        assert isinstance(response["traces"][0], dict)

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock, brain_region_json_path):
        url = "http://fake_url"

        # Mocking an issue
        httpx_mock.add_response(
            url=url,
            json={},
        )

        # Mock S3 client and response
        mock_s3 = Mock()
        with open(brain_region_json_path) as f:
            brain_region_dict = json.load(f)

        class MockStreamingBody:
            def read(self):
                return json.dumps(brain_region_dict).encode()

        mock_s3.get_object.return_value = {"Body": MockStreamingBody()}

        tool = GetTracesTool(
            metadata=GetTracesMetadata(
                knowledge_graph_url=url,
                trace_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                bucket_name="test-bucket",
                brainregion_hierarchy_storage_key="test-br-key",
                s3_client=mock_s3,
            ),
            input_schema=GetTracesInput(brain_region_id="brain_region_id_link/549"),
        )

        with pytest.raises(KeyError) as tool_exception:
            await tool.arun()

        # Verify S3 get_object was called with correct parameters
        mock_s3.get_object.assert_called_once_with(
            Bucket="test-bucket", Key="test-br-key"
        )

        assert tool_exception.value.args[0] == "hits"

    def test_create_query(self, brain_region_json_path):
        brain_region_ids = {"brain_region_id1"}
        etype_id = "bAC_id/123"
        url = "http://fake_url"

        # Mock S3 client and response
        mock_s3 = Mock()
        with open(brain_region_json_path) as f:
            brain_region_dict = json.load(f)

        class MockStreamingBody:
            def read(self):
                return json.dumps(brain_region_dict).encode()

        mock_s3.get_object.return_value = {"Body": MockStreamingBody()}

        tool = GetTracesTool(
            metadata=GetTracesMetadata(
                knowledge_graph_url=url,
                trace_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                bucket_name="test-bucket",
                brainregion_hierarchy_storage_key="test-br-key",
                s3_client=mock_s3,
            ),
            input_schema=GetTracesInput(
                brain_region_id="brain_region_id1", etype_id=etype_id
            ),
        )
        entire_query = tool.create_query(
            brain_region_ids=brain_region_ids, etype_id=etype_id
        )
        expected_query = {
            "size": 2,
            "track_total_hits": True,
            "query": {
                "bool": {
                    "must": [
                        {
                            "bool": {
                                "should": [
                                    {
                                        "term": {
                                            "brainRegion.@id.keyword": (
                                                "brain_region_id1"
                                            )
                                        }
                                    },
                                ]
                            }
                        },
                        {"term": {"eType.@id.keyword": ("bAC_id/123")}},
                        {
                            "term": {
                                "@type.keyword": "https://bbp.epfl.ch/ontologies/core/bmo/ExperimentalTrace"
                            }
                        },
                        {"term": {"curated": True}},
                        {"term": {"deprecated": False}},
                    ]
                }
            },
        }
        assert entire_query == expected_query
