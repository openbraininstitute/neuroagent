from unittest.mock import AsyncMock, Mock

import pytest
from openai import AsyncOpenAI

from neuroagent.schemas import EmbeddedMType, EmbeddedMTypes
from neuroagent.tools.resolve_mtypes_tool import (
    ResolveMtypeInput,
    ResolveMtypeMetadata,
    ResolveMtypeTool,
)


@pytest.fixture
def sample_mtypes():
    return [
        EmbeddedMType(
            id="1", pref_label="Layer 1", pref_label_embedding=[1.0, 0.0, 0.0]
        ),
        EmbeddedMType(
            id="2", pref_label="Layer 2", pref_label_embedding=[0.0, 1.0, 0.0]
        ),
        EmbeddedMType(
            id="3", pref_label="Layer 3", pref_label_embedding=[0.0, 0.0, 1.0]
        ),
    ]


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for embedding generation."""
    client = AsyncMock(spec=AsyncOpenAI)
    client.embeddings = Mock()
    client.embeddings.create = AsyncMock()

    mock_response = Mock()
    mock_response.data = [Mock(embedding=[0.1, 0.1, 0.1])]
    client.embeddings.create.return_value = mock_response
    return client


@pytest.fixture
def metadata(sample_mtypes, mock_openai_client):
    dummy_embeddings = EmbeddedMTypes(mtypes=sample_mtypes)
    return ResolveMtypeMetadata(
        mtype_embeddings=dummy_embeddings, openai_client=mock_openai_client
    )


@pytest.mark.asyncio
async def test_exact_match(metadata):
    input_schema = ResolveMtypeInput(mtype_pref_label="Layer 2", number_of_candidates=5)
    tool = ResolveMtypeTool(metadata=metadata, input_schema=input_schema)
    output = await tool.arun()
    assert len(output.mtypes) == 1
    candidate = output.mtypes[0]
    assert candidate.mtype_id == "2"
    assert candidate.mtype_pref_label == "Layer 2"
    assert pytest.approx(candidate.score) == 1.0


@pytest.mark.asyncio
async def test_semantic_search(metadata):
    metadata.openai_client.embeddings.create.return_value = AsyncMock(
        data=[AsyncMock(embedding=[0.0, 0.0, 0.9])]
    )
    input_schema = ResolveMtypeInput(
        mtype_pref_label="Deep layer", number_of_candidates=2
    )
    tool = ResolveMtypeTool(metadata=metadata, input_schema=input_schema)
    output = await tool.arun()
    assert len(output.mtypes) == 2
    first = output.mtypes[0]
    assert first.mtype_id == "3"
    assert output.mtypes[0].score >= output.mtypes[1].score
