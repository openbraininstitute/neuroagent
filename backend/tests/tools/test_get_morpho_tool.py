"""Tests Get Morpho tool."""

import json
from pathlib import Path
from unittest.mock import Mock

import httpx
import pytest

from neuroagent.tools import GetMorphoTool
from neuroagent.tools.get_morpho_tool import (
    GetMorphoInput,
    GetMorphoMetadata,
    GetMorphoToolOutput,
    MorphologieOutput,
)


class TestGetMorphoTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock):
        url = "http://fake_url"

        # Load the entitcor response
        json_path = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "entitycore_morphologies_thalamus.json"
        )
        with open(json_path) as f:
            entitycore_response = json.load(f)

        # Mock the KG API response
        httpx_mock.add_response(
            url=url + "/reconstruction-morphology?brain_region_id=549&page_size=2",
            json=entitycore_response,
        )

        tool = GetMorphoTool(
            input_schema=GetMorphoInput(
                brain_region_id="brain_region_id_link/549",
                mtype_id=None,
            ),
            metadata=GetMorphoMetadata(
                entitycore_url=url,
                morpho_search_size=2,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
            ),
        )

        response = await tool.arun()
        assert isinstance(response, GetMorphoToolOutput)
        assert len(response.morphologies) == 6
        assert isinstance(response.morphologies[0], MorphologieOutput)

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock, brain_region_json_path, tmp_path):
        url = "http://fake_url"

        httpx_mock.add_response(
            url=url
            + "/reconstruction-morphology?brain_region_id=bad&page_size=2&mtype__id=brain_region_id_link%2Fsuperbad",
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
                entitycore_url=url,
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

        assert tool_exception.value.args[0] == "data"
