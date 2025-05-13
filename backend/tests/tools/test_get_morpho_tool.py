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
            url=url
            + "/reconstruction-morphology?page_size=2&within_brain_region_hierachy_id=e3e70682-c209-4cac-a29f-6fbed82c07cd&within_brain_region_brain_region_id=random_UUID&within_brain_region_ascendants=false",
            json=entitycore_response,
        )

        tool = GetMorphoTool(
            input_schema=GetMorphoInput(
                brain_region_id="random_UUID",
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
        assert len(response.morphologies) == 10
        assert isinstance(response.morphologies[0], MorphologieOutput)

    @pytest.mark.asyncio
    async def test_arun_errors(self, httpx_mock, brain_region_json_path, tmp_path):
        url = "http://fake_url"

        httpx_mock.add_response(
            url=url
            + "/reconstruction-morphology?page_size=2&within_brain_region_hierachy_id=e3e70682-c209-4cac-a29f-6fbed82c07cd&within_brain_region_brain_region_id=bad_UUID&within_brain_region_ascendants=false&mtype__id=superbad",
            json={},
        )

        # Create mock S3 client
        mock_s3 = Mock()

        tool = GetMorphoTool(
            input_schema=GetMorphoInput(
                brain_region_id="bad_UUID",
                mtype_id="superbad",
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
