"""Test the revole_brain_region_tool."""

import pytest
from httpx import AsyncClient

from neuroagent.tools import ResolveETypeTool
from neuroagent.tools.resolve_etypes_tool import (
    ResolveEtypeInput,
    ResolveEtypeMetadata,
    ResolveEtypeOutput,
)


@pytest.mark.asyncio
async def test_arun(httpx_mock):
    tool = ResolveETypeTool(
        metadata=ResolveEtypeMetadata(
            httpx_client=AsyncClient(timeout=None),
        ),
        input_schema=ResolveEtypeInput(etype="bAC"),
    )

    response = await tool.arun()
    assert isinstance(response, ResolveEtypeOutput)
    assert response == ResolveEtypeOutput(
        etype_name="bAC",
        etype_id="http://uri.interlex.org/base/ilx_0738199",
    )
