"""Tests Get Morpho tool."""

import json
from pathlib import Path
from unittest.mock import Mock

import httpx
import pytest

from neuroagent.tools import GetMorphoTool
from neuroagent.tools.get_morpho_tool import GetMorphoInput, GetMorphoMetadata


class TestGetMorphoTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock, brain_region_json_path, tmp_path):
        url = "http://fake_url"

        # Load the knowledge graph response
        json_path = (
            Path(__file__).resolve().parent.parent / "data" / "knowledge_graph.json"
        )
        with open(json_path) as f:
            knowledge_graph_response = json.load(f)

        # Mock the KG API response
        httpx_mock.add_response(
            url=url,
            json=knowledge_graph_response,
        )

        # Create mock S3 client
        mock_s3 = Mock()

        # Mock brain region hierarchy response
        with open(brain_region_json_path) as f:
            brain_region_dict = json.load(f)

        class MockStreamingBody:
            def read(self):
                return json.dumps(brain_region_dict).encode()

        s3_response = {"Body": MockStreamingBody()}
        mock_s3.get_object.return_value = s3_response

        tool = GetMorphoTool(
            input_schema=GetMorphoInput(
                brain_region_id="brain_region_id_link/549",
                mtype_id=None,
            ),
            metadata=GetMorphoMetadata(
                knowledge_graph_url=url,
                morpho_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                bucket_name="test-bucket",
                brainregion_hierarchy_storage_key="test-br-key",
                celltypes_hierarchy_storage_key="test-ct-key",
                s3_client=mock_s3,
            ),
        )

        response = await tool.arun()
        assert isinstance(response, str)
        response = json.loads(response)
        assert len(response) == 2
        assert isinstance(response[0], dict)

        # Verify S3 was called correctly for brain region hierarchy - no cell type
        assert mock_s3.get_object.call_count == 1
        mock_s3.get_object.assert_any_call(Bucket="test-bucket", Key="test-br-key")

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock, brain_region_json_path, tmp_path):
        url = "http://fake_url"
        httpx_mock.add_response(
            url=url,
            json={},
        )

        # Create mock S3 client
        mock_s3 = Mock()

        tool = GetMorphoTool(
            input_schema=GetMorphoInput(
                brain_region_id="brain_region_id_link/bad",
                mtype_id="brain_region_id_link/superbad",
            ),
            metadata=GetMorphoMetadata(
                knowledge_graph_url=url,
                morpho_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                bucket_name="test-bucket",
                brainregion_hierarchy_storage_key="test-br-key",
                celltypes_hierarchy_storage_key="test-ct-key",
                s3_client=mock_s3,
            ),
        )
        with pytest.raises(KeyError) as tool_exception:
            await tool.arun()

        assert tool_exception.value.args[0] == "hits"


def test_create_query(brain_region_json_path, tmp_path):
    url = "http://fake_url"

    # Create mock S3 client
    mock_s3 = Mock()

    tool = GetMorphoTool(
        input_schema=GetMorphoInput(
            brain_region_id="not_needed",
            mtype_id="not_needed",
        ),
        metadata=GetMorphoMetadata(
            knowledge_graph_url=url,
            morpho_search_size=2,
            httpx_client=httpx.AsyncClient(),
            token="fake_token",
            bucket_name="test-bucket",
            brainregion_hierarchy_storage_key="test-br-key",
            celltypes_hierarchy_storage_key="test-ct-key",
            s3_client=mock_s3,
        ),
    )

    # This should be a set, but passing a list here ensures that the test doesn;t rely on order.
    brain_regions_ids = ["brain-region-id/68", "brain-region-id/131"]
    mtype_id = "mtype-id/1234"

    entire_query = tool.create_query(
        brain_regions_ids=brain_regions_ids, mtype_ids={mtype_id}
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
                                        "brainRegion.@id.keyword": "brain-region-id/68"
                                    }
                                },
                                {
                                    "term": {
                                        "brainRegion.@id.keyword": "brain-region-id/131"
                                    }
                                },
                            ]
                        }
                    },
                    {"bool": {"should": [{"term": {"mType.@id.keyword": mtype_id}}]}},
                    {
                        "term": {
                            "@type.keyword": (
                                "https://neuroshapes.org/ReconstructedNeuronMorphology"
                            )
                        }
                    },
                    {"term": {"deprecated": False}},
                    {"term": {"curated": True}},
                ]
            }
        },
    }
    assert isinstance(entire_query, dict)
    assert entire_query == expected_query

    # Case 2 with no mtype
    entire_query1 = tool.create_query(brain_regions_ids=brain_regions_ids)
    expected_query1 = {
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
                                        "brainRegion.@id.keyword": "brain-region-id/68"
                                    }
                                },
                                {
                                    "term": {
                                        "brainRegion.@id.keyword": "brain-region-id/131"
                                    }
                                },
                            ]
                        }
                    },
                    {
                        "term": {
                            "@type.keyword": (
                                "https://neuroshapes.org/ReconstructedNeuronMorphology"
                            )
                        }
                    },
                    {"term": {"deprecated": False}},
                    {"term": {"curated": True}},
                ]
            }
        },
    }
    assert entire_query1 == expected_query1
