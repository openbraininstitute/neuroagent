"""Test the resolve_brain_region_tool."""

from unittest.mock import AsyncMock, Mock, patch

import numpy as np
import pytest
from httpx import AsyncClient
from openai import AsyncOpenAI

from neuroagent.schemas import EmbeddedBrainRegion, EmbeddedBrainRegions
from neuroagent.tools import ResolveBrainRegionTool
from neuroagent.tools.resolve_brain_region_tool import (
    ResolveBrainRegionToolOutput,
    ResolveBRInput,
    ResolveBRMetadata,
)


@pytest.mark.asyncio
class TestResolveBrainRegionTool:
    """Test suite for the ResolveBrainRegionTool."""

    @pytest.fixture
    def sample_brain_regions(self):
        """Create sample brain regions for testing."""
        return EmbeddedBrainRegions(
            hierarchy_id="e3e70682-c209-4cac-a29f-6fbed82c07cd",
            regions=[
                EmbeddedBrainRegion(
                    id="thalamus_001",
                    name="Thalamus",
                    hierarchy_level=0,
                    name_embedding=[0.8, 0.6, 0.7, 0.9, 0.5],
                ),
                EmbeddedBrainRegion(
                    id="epithalamus_001",
                    name="Epithalamus",
                    hierarchy_level=1,
                    name_embedding=[0.7, 0.8, 0.6, 0.8, 0.4],
                ),
                EmbeddedBrainRegion(
                    id="hypothalamus_001",
                    name="Hypothalamus",
                    hierarchy_level=1,
                    name_embedding=[0.6, 0.7, 0.8, 0.7, 0.6],
                ),
                EmbeddedBrainRegion(
                    id="visual_cortex_001",
                    name="Primary Visual Cortex",
                    hierarchy_level=2,
                    name_embedding=[0.2, 0.3, 0.1, 0.4, 0.2],
                ),
                EmbeddedBrainRegion(
                    id="motor_cortex_001",
                    name="Primary Motor Cortex",
                    hierarchy_level=2,
                    name_embedding=[0.3, 0.2, 0.4, 0.1, 0.3],
                ),
            ],
        )

    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client for embedding generation."""
        client = AsyncMock(spec=AsyncOpenAI)
        client.embeddings = Mock()  # or AsyncMock, if `create` is async
        client.embeddings.create = AsyncMock()

        # Mock embedding response for "thalamus" query
        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=[0.85, 0.65, 0.75, 0.95, 0.55])
        ]  # Close to Thalamus embedding
        client.embeddings.create.return_value = mock_response
        return client

    async def test_exact_match_found(self, sample_brain_regions, mock_openai_client):
        """Test when an exact name match is found."""
        tool = ResolveBrainRegionTool(
            metadata=ResolveBRMetadata(
                brainregion_embeddings=[sample_brain_regions],
                openai_client=mock_openai_client,
                httpx_client=Mock(spec=AsyncClient),
            ),
            input_schema=ResolveBRInput(
                brain_region_name="Thalamus",  # Exact match
                hierarchy_id="e3e70682-c209-4cac-a29f-6fbed82c07cd",
                number_of_candidates=5,
            ),
        )

        response = await tool.arun()

        # Should return exact match with score 1.0
        assert isinstance(response, ResolveBrainRegionToolOutput)
        assert len(response.brain_regions) == 1
        assert response.brain_regions[0].id == "thalamus_001"
        assert response.brain_regions[0].name == "Thalamus"
        assert response.brain_regions[0].score == 1.0

        # OpenAI client should not be called for exact matches
        mock_openai_client.embeddings.create.assert_not_called()

    async def test_case_insensitive_exact_match(
        self, sample_brain_regions, mock_openai_client
    ):
        """Test case-insensitive exact matching."""
        tool = ResolveBrainRegionTool(
            metadata=ResolveBRMetadata(
                brainregion_embeddings=[sample_brain_regions],
                openai_client=mock_openai_client,
                httpx_client=Mock(spec=AsyncClient),
            ),
            input_schema=ResolveBRInput(
                brain_region_name="THALAMUS",  # Different case
                hierarchy_id="e3e70682-c209-4cac-a29f-6fbed82c07cd",
                number_of_candidates=5,
            ),
        )

        response = await tool.arun()

        assert isinstance(response, ResolveBrainRegionToolOutput)
        assert len(response.brain_regions) == 1
        assert response.brain_regions[0].id == "thalamus_001"
        assert response.brain_regions[0].name == "Thalamus"
        assert response.brain_regions[0].score == 1.0

    @patch("neuroagent.tools.resolve_brain_region_tool.cosine_similarity")
    async def test_semantic_search_fallback(
        self, mock_cosine_similarity, sample_brain_regions, mock_openai_client
    ):
        """Test semantic search when no exact match is found."""
        # Mock cosine similarity to return high similarity for Thalamus
        mock_cosine_similarity.return_value = np.array(
            [
                [
                    0.95,
                    0.80,
                    0.75,
                    0.30,
                    0.25,
                ]
            ]
        )  # Scores for each region

        tool = ResolveBrainRegionTool(
            metadata=ResolveBRMetadata(
                brainregion_embeddings=[sample_brain_regions],
                openai_client=mock_openai_client,
                httpx_client=Mock(spec=AsyncClient),
            ),
            input_schema=ResolveBRInput(
                brain_region_name="brain stem region",  # No exact match
                hierarchy_id="e3e70682-c209-4cac-a29f-6fbed82c07cd",
                number_of_candidates=3,
            ),
        )

        response = await tool.arun()

        # Verify OpenAI embedding was called
        mock_openai_client.embeddings.create.assert_called_once_with(
            input="brain stem region", model="text-embedding-3-small"
        )

        # Verify cosine similarity was computed
        mock_cosine_similarity.assert_called_once()

        # Check response structure and ordering (should be sorted by score descending)
        assert isinstance(response, ResolveBrainRegionToolOutput)
        assert len(response.brain_regions) == 3  # Limited by number_of_candidates

        # First result should be highest scoring (Thalamus with 0.95)
        assert response.brain_regions[0].id == "thalamus_001"
        assert response.brain_regions[0].score == 0.95

        # Second result should be Epithalamus with 0.80
        assert response.brain_regions[1].id == "epithalamus_001"
        assert response.brain_regions[1].score == 0.80

        # Third result should be Hypothalamus with 0.75
        assert response.brain_regions[2].id == "hypothalamus_001"
        assert response.brain_regions[2].score == 0.75

    async def test_hierarchy_not_found_error(
        self, sample_brain_regions, mock_openai_client
    ):
        """Test error handling when hierarchy ID is not found."""
        tool = ResolveBrainRegionTool(
            metadata=ResolveBRMetadata(
                brainregion_embeddings=[sample_brain_regions],
                openai_client=mock_openai_client,
                httpx_client=Mock(spec=AsyncClient),
            ),
            input_schema=ResolveBRInput(
                brain_region_name="Thalamus",
                hierarchy_id="nonexistent-hierarchy-id",  # Invalid hierarchy ID
                number_of_candidates=5,
            ),
        )

        with pytest.raises(
            ValueError, match="Hierarchy ID not found in existing embeddings"
        ):
            await tool.arun()

    @patch("neuroagent.tools.resolve_brain_region_tool.cosine_similarity")
    async def test_number_of_candidates_limiting(
        self, mock_cosine_similarity, sample_brain_regions, mock_openai_client
    ):
        """Test that the number of returned candidates is properly limited."""
        # Mock similarity scores for all 5 regions
        mock_cosine_similarity.return_value = np.array(
            [
                [
                    0.95,
                    0.80,
                    0.75,
                    0.30,
                    0.25,
                ]
            ]
        )  # Scores for each region

        tool = ResolveBrainRegionTool(
            metadata=ResolveBRMetadata(
                brainregion_embeddings=[sample_brain_regions],
                openai_client=mock_openai_client,
                httpx_client=Mock(spec=AsyncClient),
            ),
            input_schema=ResolveBRInput(
                brain_region_name="cortex region",
                hierarchy_id="e3e70682-c209-4cac-a29f-6fbed82c07cd",
                number_of_candidates=2,  # Limit to 2 results
            ),
        )

        response = await tool.arun()

        assert isinstance(response, ResolveBrainRegionToolOutput)
        assert len(response.brain_regions) == 2  # Should be limited to 2

        # Should return the top 2 scoring regions
        assert response.brain_regions[0].score == 0.95
        assert response.brain_regions[1].score == 0.80

    async def test_multiple_hierarchies_selection(self, mock_openai_client):
        """Test that the correct hierarchy is selected when multiple are available."""
        # Create two different hierarchies
        hierarchy1 = EmbeddedBrainRegions(
            hierarchy_id="hierarchy-1",
            regions=[
                EmbeddedBrainRegion(
                    id="region_h1_1",
                    name="Region H1-1",
                    hierarchy_level=0,
                    name_embedding=[0.1, 0.2, 0.3, 0.4, 0.5],
                ),
            ],
        )

        hierarchy2 = EmbeddedBrainRegions(
            hierarchy_id="hierarchy-2",
            regions=[
                EmbeddedBrainRegion(
                    id="region_h2_1",
                    name="Region H2-1",
                    hierarchy_level=0,
                    name_embedding=[0.6, 0.7, 0.8, 0.9, 1.0],
                ),
            ],
        )

        tool = ResolveBrainRegionTool(
            metadata=ResolveBRMetadata(
                brainregion_embeddings=[hierarchy1, hierarchy2],
                openai_client=mock_openai_client,
                httpx_client=Mock(spec=AsyncClient),
            ),
            input_schema=ResolveBRInput(
                brain_region_name="Region H2-1",  # Exact match in hierarchy-2
                hierarchy_id="hierarchy-2",
                number_of_candidates=5,
            ),
        )

        response = await tool.arun()

        # Should find the exact match in hierarchy-2
        assert isinstance(response, ResolveBrainRegionToolOutput)
        assert len(response.brain_regions) == 1
        assert response.brain_regions[0].id == "region_h2_1"
        assert response.brain_regions[0].name == "Region H2-1"
        assert response.brain_regions[0].score == 1.0
