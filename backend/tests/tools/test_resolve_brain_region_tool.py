"""Test the revole_brain_region_tool."""

import json

import pytest
from httpx import AsyncClient

from neuroagent.tools import ResolveBrainRegionTool
from neuroagent.tools.resolve_brain_region_tool import (
    BrainRegion,
    ResolveBRInput,
    ResolveBRMetadata,
    ResolveBROutput,
)


@pytest.mark.asyncio
async def test_arun(httpx_mock):
    with open("tests/data/entitycore_brain_region.json") as f:
        reponse_brain_region = json.load(f)

    httpx_mock.add_response(
        url="http://fake_entitycore_url.com/78/brain-region?hierarchy_id=e3e70682-c209-4cac-a29f-6fbed82c07cd&page_size=500&name__ilike=Field",
        json=reponse_brain_region,
    )

    tool = ResolveBrainRegionTool(
        metadata=ResolveBRMetadata(
            token="greattokenpleasedontexpire",
            httpx_client=AsyncClient(timeout=None),
            entitycore_url="http://fake_entitycore_url.com/78",
        ),
        input_schema=ResolveBRInput(
            brain_region="Field",
        ),
    )

    response = await tool.arun()
    assert isinstance(response, ResolveBROutput)
    assert response == ResolveBROutput(
        brain_regions=[
            BrainRegion(
                brain_region_name="Thalamus",
                brain_region_id="5b8d11ba-a0ec-4e5a-a487-8d19586d7f41",
            ),
            BrainRegion(
                brain_region_name="Epithalamus",
                brain_region_id="b934718f-2d49-4ca2-81f4-317df5141524",
            ),
            BrainRegion(
                brain_region_name="Hypothalamus",
                brain_region_id="b75db71e-a453-4fe9-b48f-653e7b1bcb6b",
            ),
            BrainRegion(
                brain_region_name="Thalamus: Other",
                brain_region_id="84caa7c8-a159-4b4f-b901-726fc421325a",
            ),
            BrainRegion(
                brain_region_name="thalamus related",
                brain_region_id="41a93f90-dc82-4527-9da3-b7e2cad6e514",
            ),
            BrainRegion(
                brain_region_name="epithalamus related",
                brain_region_id="fb82860d-eabc-48d0-b341-facdff0ac0f1",
            ),
            BrainRegion(
                brain_region_name="Hypothalamus: Other",
                brain_region_id="bad4c288-0bf5-4ed8-b93c-2989c399fd7f",
            ),
            BrainRegion(
                brain_region_name="hypothalamus related",
                brain_region_id="37176e84-d977-4993-bc49-d76fcfc6e625",
            ),
            BrainRegion(
                brain_region_name="dorsal thalamus related",
                brain_region_id="5f3f5638-3870-4a14-b490-b6081dfc8352",
            ),
            BrainRegion(
                brain_region_name="Ethmoid nucleus of the thalamus",
                brain_region_id="68adc28f-8463-416a-be65-6befe0efc989",
            ),
        ],
    )
