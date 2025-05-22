"""Unit tests for the brain region embeddings script."""

import json
import os
from unittest.mock import AsyncMock, Mock, patch

import pytest

from neuroagent.scripts.embed_hierarchies import (
    flatten_hierarchy,
    push_embeddings_to_s3,
)


class TestFlattenHierarchy:
    """Tests for the flatten_hierarchy function with comprehensive fake data."""

    def test_flatten_single_node_minimal(self):
        """Test flattening a hierarchy with a single node."""
        hierarchy = {
            "id": "brain_001",
            "name": "Whole Brain",
            "acronym": "WB",
        }

        result = flatten_hierarchy(hierarchy)

        assert len(result) == 1
        assert result[0].id == "brain_001"
        assert result[0].name == "Whole Brain"
        assert result[0].acronym == "WB"
        assert result[0].hierarchy_level == 0

    def test_flatten_simple_parent_child(self):
        """Test flattening with one parent and multiple children."""
        hierarchy = {
            "id": "ctx_001",
            "name": "Cerebral Cortex",
            "acronym": "CTX",
            "children": [
                {
                    "id": "ctx_motor_001",
                    "name": "Primary Motor Cortex",
                    "acronym": "M1",
                },
                {
                    "id": "ctx_visual_001",
                    "name": "Primary Visual Cortex",
                    "acronym": "V1",
                },
                {
                    "id": "ctx_auditory_001",
                    "name": "Primary Auditory Cortex",
                    "acronym": "A1",
                },
            ],
        }

        result = flatten_hierarchy(hierarchy)

        assert len(result) == 4  # 1 parent + 3 children

        # Check parent
        parent = result[0]
        assert parent.id == "ctx_001"
        assert parent.name == "Cerebral Cortex"
        assert parent.acronym == "CTX"
        assert parent.hierarchy_level == 0

        # Check children
        children = [r for r in result if r.hierarchy_level == 1]
        assert len(children) == 3

        child_ids = {child.id for child in children}
        expected_ids = {"ctx_motor_001", "ctx_visual_001", "ctx_auditory_001"}
        assert child_ids == expected_ids

    def test_flatten_deep_nested_hierarchy(self):
        """Test flattening a deeply nested brain region hierarchy."""
        hierarchy = {
            "id": "brain_root",
            "name": "Brain",
            "acronym": "BR",
            "children": [
                {
                    "id": "forebrain_001",
                    "name": "Forebrain",
                    "acronym": "FB",
                    "children": [
                        {
                            "id": "telencephalon_001",
                            "name": "Telencephalon",
                            "acronym": "TEL",
                            "children": [
                                {
                                    "id": "hippocampus_001",
                                    "name": "Hippocampus",
                                    "acronym": "HIP",
                                    "children": [
                                        {
                                            "id": "ca1_001",
                                            "name": "Cornu Ammonis 1",
                                            "acronym": "CA1",
                                        },
                                        {
                                            "id": "ca3_001",
                                            "name": "Cornu Ammonis 3",
                                            "acronym": "CA3",
                                        },
                                    ],
                                },
                                {
                                    "id": "amygdala_001",
                                    "name": "Amygdala",
                                    "acronym": "AMY",
                                },
                            ],
                        }
                    ],
                },
                {
                    "id": "brainstem_001",
                    "name": "Brainstem",
                    "acronym": "BS",
                    "children": [
                        {
                            "id": "midbrain_001",
                            "name": "Midbrain",
                            "acronym": "MB",
                        }
                    ],
                },
            ],
        }

        result = flatten_hierarchy(hierarchy)

        assert len(result) == 9  # Total nodes in the hierarchy

        # Check hierarchy levels
        level_0 = [r for r in result if r.hierarchy_level == 0]
        level_1 = [r for r in result if r.hierarchy_level == 1]
        level_2 = [r for r in result if r.hierarchy_level == 2]
        level_3 = [r for r in result if r.hierarchy_level == 3]
        level_4 = [r for r in result if r.hierarchy_level == 4]

        assert len(level_0) == 1  # Brain
        assert len(level_1) == 2  # Forebrain, Brainstem
        assert len(level_2) == 2  # Telencephalon, Midbrain
        assert len(level_3) == 2  # Hippocampus, Amygdala
        assert len(level_4) == 2  # CA1, CA3

        # Verify specific regions at correct levels
        assert level_0[0].name == "Brain"
        assert any(r.name == "Hippocampus" for r in level_3)
        assert any(r.acronym == "CA1" for r in level_4)

    def test_flatten_with_custom_starting_level(self):
        """Test flattening with a custom starting hierarchy level."""
        hierarchy = {
            "id": "thalamus_001",
            "name": "Thalamus",
            "acronym": "TH",
            "children": [
                {
                    "id": "lgn_001",
                    "name": "Lateral Geniculate Nucleus",
                    "acronym": "LGN",
                }
            ],
        }

        result = flatten_hierarchy(hierarchy, level=3)

        assert len(result) == 2
        assert result[0].hierarchy_level == 3  # Thalamus at level 3
        assert result[1].hierarchy_level == 4  # LGN at level 4

    def test_flatten_empty_children_list(self):
        """Test flattening with explicitly empty children list."""
        hierarchy = {
            "id": "cerebellum_001",
            "name": "Cerebellum",
            "acronym": "CB",
            "children": [],
        }

        result = flatten_hierarchy(hierarchy)

        assert len(result) == 1
        assert result[0].id == "cerebellum_001"
        assert result[0].name == "Cerebellum"

    def test_flatten_complex_realistic_hierarchy(self):
        """Test with a complex, realistic brain region hierarchy."""
        hierarchy = {
            "id": "ctx_frontal",
            "name": "Frontal Cortex",
            "acronym": "FC",
            "children": [
                {
                    "id": "ctx_prefrontal",
                    "name": "Prefrontal Cortex",
                    "acronym": "PFC",
                    "children": [
                        {
                            "id": "ctx_dlpfc",
                            "name": "Dorsolateral Prefrontal Cortex",
                            "acronym": "dlPFC",
                        },
                        {
                            "id": "ctx_vmpfc",
                            "name": "Ventromedial Prefrontal Cortex",
                            "acronym": "vmPFC",
                        },
                        {
                            "id": "ctx_ofc",
                            "name": "Orbitofrontal Cortex",
                            "acronym": "OFC",
                            "children": [
                                {
                                    "id": "ctx_ofc_lateral",
                                    "name": "Lateral Orbitofrontal Cortex",
                                    "acronym": "lOFC",
                                },
                                {
                                    "id": "ctx_ofc_medial",
                                    "name": "Medial Orbitofrontal Cortex",
                                    "acronym": "mOFC",
                                },
                            ],
                        },
                    ],
                },
                {
                    "id": "ctx_motor_primary",
                    "name": "Primary Motor Cortex",
                    "acronym": "M1",
                },
                {
                    "id": "ctx_motor_supplementary",
                    "name": "Supplementary Motor Area",
                    "acronym": "SMA",
                },
            ],
        }

        result = flatten_hierarchy(hierarchy)

        # Verify total count
        assert len(result) == 9

        # Verify all expected regions are present
        region_names = {r.name for r in result}
        expected_names = {
            "Frontal Cortex",
            "Prefrontal Cortex",
            "Dorsolateral Prefrontal Cortex",
            "Ventromedial Prefrontal Cortex",
            "Orbitofrontal Cortex",
            "Lateral Orbitofrontal Cortex",
            "Medial Orbitofrontal Cortex",
            "Primary Motor Cortex",
            "Supplementary Motor Area",
        }
        assert len(region_names.intersection(expected_names)) == 9

        # Verify hierarchy levels are correct
        ofc_regions = [
            r
            for r in result
            if "Orbitofrontal" in r.name and "Lateral" in r.name or "Medial" in r.name
        ]
        assert all(r.hierarchy_level == 3 for r in ofc_regions)


class TestPushEmbeddingsToS3:
    """Tests for the push_embeddings_to_s3 function with mocked dependencies."""

    @pytest.fixture
    def sample_hierarchy_response(self):
        """Sample hierarchy response from entity core API."""
        return {
            "id": "test_hierarchy_root",
            "name": "Test Brain Region",
            "acronym": "TBR",
            "children": [
                {
                    "id": "test_child_1",
                    "name": "Test Child Region 1",
                    "acronym": "TCR1",
                },
                {
                    "id": "test_child_2",
                    "name": "Test Child Region 2",
                    "acronym": "TCR2",
                    "children": [
                        {
                            "id": "test_grandchild_1",
                            "name": "Test Grandchild Region 1",
                            "acronym": "TGCR1",
                        }
                    ],
                },
            ],
        }

    @pytest.fixture
    def mock_embedding_data(self):
        """Mock embedding response data from OpenAI."""
        return [
            Mock(embedding=[0.1, 0.2, 0.3, 0.4, 0.5]),
            Mock(embedding=[0.2, 0.3, 0.4, 0.5, 0.6]),
            Mock(embedding=[0.3, 0.4, 0.5, 0.6, 0.7]),
            Mock(embedding=[0.4, 0.5, 0.6, 0.7, 0.8]),
        ]

    @patch("neuroagent.scripts.embed_hierarchies.AsyncOpenAI")
    @patch("neuroagent.scripts.embed_hierarchies.boto3.client")
    @patch.dict(os.environ, {"NEUROAGENT_OPENAI__TOKEN": "test-openai-token"})
    @pytest.mark.asyncio
    async def test_successful_embedding_pipeline(
        self,
        mock_boto_client,
        mock_openai_client,
        httpx_mock,
        sample_hierarchy_response,
        mock_embedding_data,
    ):
        """Test successful execution of the embedding pipeline."""
        # Setup HTTP client mock for entity core API
        httpx_mock.add_response(
            method="GET",
            url="http://test-entity-core.com/brain-region-hierarchy/test-hierarchy-123/hierarchy",
            json=sample_hierarchy_response,
            status_code=200,
        )

        # Setup OpenAI client mock
        mock_openai_instance = AsyncMock()
        mock_openai_client.return_value = mock_openai_instance

        mock_embedding_response = Mock(data=mock_embedding_data)
        mock_embeddings_api = AsyncMock()
        mock_embeddings_api.create.return_value = mock_embedding_response
        mock_openai_instance.embeddings = mock_embeddings_api

        # Setup S3 client mock
        mock_s3_instance = Mock()
        mock_boto_client.return_value = mock_s3_instance

        # Execute function
        await push_embeddings_to_s3(
            hierarchy_id="test-hierarchy-123",
            s3_url="http://test-s3.com",
            entity_core_url="http://test-entity-core.com",
            s3_access_key="test-access-key",
            s3_secret_key="test-secret-key",
            s3_bucket_name="test-bucket",
            token="test-bearer-token",
        )

        # Verify entity core API call was made
        assert len(httpx_mock.get_requests()) == 1
        request = httpx_mock.get_requests()[0]
        assert "test-hierarchy-123" in str(request.url)
        assert request.headers["Authorization"] == "Bearer test-bearer-token"

        # Verify OpenAI embedding calls (should be called twice: names and acronyms)
        assert mock_embeddings_api.create.call_count == 2

        # Check the embedding calls
        embedding_calls = mock_embeddings_api.create.call_args_list
        names_call = embedding_calls[0]
        acronyms_call = embedding_calls[1]

        # Verify names were embedded
        expected_names = [
            "Test Brain Region",
            "Test Child Region 1",
            "Test Child Region 2",
            "Test Grandchild Region 1",
        ]
        assert names_call.kwargs["input"] == expected_names
        assert names_call.kwargs["model"] == "text-embedding-3-small"

        # Verify acronyms were embedded
        expected_acronyms = ["TBR", "TCR1", "TCR2", "TGCR1"]
        assert acronyms_call.kwargs["input"] == expected_acronyms
        assert acronyms_call.kwargs["model"] == "text-embedding-3-small"

        # Verify S3 upload
        mock_s3_instance.put_object.assert_called_once()
        s3_call_args = mock_s3_instance.put_object.call_args.kwargs

        assert s3_call_args["Bucket"] == "test-bucket"
        assert (
            s3_call_args["Key"] == "shared/test-hierarchy-123_hierarchy_embeddings.json"
        )
        assert s3_call_args["ContentType"] == "application/json"

        # Verify the uploaded data structure
        uploaded_data = json.loads(s3_call_args["Body"])
        assert uploaded_data["hierarchy_id"] == "test-hierarchy-123"
        assert len(uploaded_data["regions"]) == 4

        # Check that embeddings were properly assigned
        for region_data in uploaded_data["regions"]:
            assert region_data["name_embedding"] is not None
            assert region_data["acronym_embedding"] is not None
            assert len(region_data["name_embedding"]) == 5  # Embedding dimension
            assert len(region_data["acronym_embedding"]) == 5

    @pytest.mark.asyncio
    async def test_entity_core_api_error_handling(self, httpx_mock):
        """Test proper error handling when entity core API fails."""
        httpx_mock.add_response(
            method="GET",
            url="http://test-entity-core.com/brain-region-hierarchy/nonexistent-hierarchy/hierarchy",
            text="Hierarchy not found",
            status_code=404,
        )

        # Verify exception is raised
        with pytest.raises(ValueError) as exc_info:
            await push_embeddings_to_s3(
                hierarchy_id="nonexistent-hierarchy",
                s3_url="http://test-s3.com",
                entity_core_url="http://test-entity-core.com",
                s3_access_key="test-access-key",
                s3_secret_key="test-secret-key",
                s3_bucket_name="test-bucket",
                token="test-token",
            )

        assert "Entity core returned a non 200 status code" in str(exc_info.value)
        assert "Hierarchy not found" in str(exc_info.value)
