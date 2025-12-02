import pytest

from neuroagent.tools.context_analyzer_tool import (
    ContextAnalyzerInput,
    ContextAnalyzerMetdata,
    ContextAnalyzerTool,
    is_uuid,
)


def test_valid_uuid():
    """Test that valid UUID strings return True."""
    assert is_uuid("123e4567-e89b-12d3-a456-426614174000") is True


def test_invalid_uuid():
    """Test that invalid UUID strings return False."""
    assert is_uuid("not-a-uuid") is False
    assert is_uuid("12345") is False


def test_none_value():
    """Test that None returns False."""
    assert is_uuid(None) is False


def test_empty_string():
    """Test that empty string returns False."""
    assert is_uuid("") is False


@pytest.mark.asyncio
async def test_basic_url_parsing():
    """Test basic URL parsing without query params."""

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/cell-morphology"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "cell-morphology"
    assert result.query_params == {}
    assert result.brain_region_id is None
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id is None


@pytest.mark.asyncio
async def test_url_with_entity_id():
    """Test URL parsing with entity ID."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
    assert result.observed_entity_type == "cell-morphology"
    assert str(result.current_entity_id) == "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"


@pytest.mark.asyncio
async def test_url_with_query_params():
    """Test URL parsing with query parameters."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/electrical-cell-recording?br_id=d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a&filter=active"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "electrical-cell-recording"
    assert result.query_params["br_id"] == ["d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"]
    assert result.query_params["filter"] == ["active"]
    assert result.brain_region_id == "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"
    assert result.observed_entity_type == "electrical-cell-recording"


@pytest.mark.asyncio
async def test_url_with_nested_path():
    """Test URL parsing with nested paths."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/emodel/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/results"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "emodel/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/results"
    assert str(result.current_entity_id) == "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
    assert result.observed_entity_type == "emodel"


@pytest.mark.asyncio
async def test_complex_url_with_cell_morphology():
    """Test URL with complex path including cell-morphology."""
    url = "https://mydomain.org/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/some/path/entity/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f?br_id=d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert (
        result.raw_path
        == "some/path/entity/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
    )
    assert result.observed_entity_type == "cell-morphology"
    assert str(result.current_entity_id) == "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
    assert result.brain_region_id == "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"


@pytest.mark.asyncio
async def test_complex_url_without_optional_uuid():
    """Test URL with complex path without optional UUID."""
    url = "https://mydomain.org/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/some/path/entity/cell-morphology?br_id=d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "some/path/entity/cell-morphology"
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id is None
    assert result.brain_region_id == "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"


@pytest.mark.asyncio
async def test_invalid_url_raises_error():
    """Test that invalid URL raises ValueError."""
    invalid_url = "https://example.com/some/other/path"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=invalid_url),
        input_schema=ContextAnalyzerInput(),
    )

    with pytest.raises(ValueError, match="Invalid URL"):
        await tool.arun()


@pytest.mark.asyncio
async def test_url_without_br_id_param():
    """Test URL without br_id query parameter."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/morphologies?other_param=value"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.brain_region_id is None
    assert "other_param" in result.query_params


@pytest.mark.asyncio
async def test_url_with_trailing_slash():
    """Test URL with trailing slash."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/morphologies/"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert "morphologies" in result.raw_path


@pytest.mark.asyncio
async def test_no_matching_entity_type():
    """Test URL with no matching entity type."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/unknown-route"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.observed_entity_type is None
    assert result.raw_path == "unknown-route"


@pytest.mark.asyncio
async def test_url_with_multiple_uuid():
    """Test URL parsing with entity ID."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert (
        result.raw_path
        == "cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    )
    assert result.observed_entity_type == "cell-morphology"
    assert str(result.current_entity_id) == "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"


@pytest.mark.asyncio
async def test_url_with_simulation():
    """Test URL parsing with entity ID."""
    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/small-microcircuit-simulation?br_id=4642cddb-4fbe-4aae-bbf7-0946d6ada066&br_av=8&group=simulations&view=flat"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "small-microcircuit-simulation"
    assert result.observed_entity_type == "simulation-campaign"
    assert result.current_entity_id is None
    assert result.query_params["br_id"] == ["4642cddb-4fbe-4aae-bbf7-0946d6ada066"]
    assert result.query_params["br_av"] == ["8"]
    assert result.query_params["group"] == ["simulations"]
    assert result.query_params["view"] == ["flat"]
    assert result.query_params["circuit__scale"] == ["small"]

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/paired-neuron-circuit-simulation?br_id=4642cddb-4fbe-4aae-bbf7-0946d6ada066&br_av=8&group=simulations&view=flat"

    tool = ContextAnalyzerTool(
        metadata=ContextAnalyzerMetdata(current_frontend_url=url),
        input_schema=ContextAnalyzerInput(),
    )

    result = await tool.arun()

    assert result.raw_path == "paired-neuron-circuit-simulation"
    assert result.observed_entity_type == "simulation-campaign"
    assert result.current_entity_id is None
    assert result.query_params["br_id"] == ["4642cddb-4fbe-4aae-bbf7-0946d6ada066"]
    assert result.query_params["br_av"] == ["8"]
    assert result.query_params["group"] == ["simulations"]
    assert result.query_params["view"] == ["flat"]
    assert result.query_params["circuit__scale"] == ["pair"]
