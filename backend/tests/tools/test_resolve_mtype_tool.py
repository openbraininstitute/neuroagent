"""Test the revole_brain_region_tool."""

import json

import pytest
from httpx import AsyncClient

from neuroagent.tools import ResolveMtypeTool
from neuroagent.tools.resolve_mtypes_tool import (
    MType,
    ResolveMtypeInput,
    ResolveMtypeMetadata,
    ResolveMtypeOutput,
)


@pytest.mark.asyncio
async def test_arun(httpx_mock):
    with open("tests/data/entitycore_mtype.json") as f:
        mtypes_region = json.load(f)

    httpx_mock.add_response(
        url="http://fake_entitycore_url.com/78/mtype?page_size=100&pref_label=Interneu",
        json=mtypes_region,
    )

    tool = ResolveMtypeTool(
        metadata=ResolveMtypeMetadata(
            token="greattokenpleasedontexpire",
            httpx_client=AsyncClient(timeout=None),
            entitycore_url="http://fake_entitycore_url.com/78",
        ),
        input_schema=ResolveMtypeInput(mtype="Interneu"),
    )

    response = await tool.arun()
    assert isinstance(response, ResolveMtypeOutput)
    assert response == ResolveMtypeOutput(
        mtypes=[
            MType(
                mtype_name="Pyramidal Neuron",
                mtype_id="1a2b8f1f-f1fd-42a2-9755-d4c13a902931",
            ),
        ],
    )
