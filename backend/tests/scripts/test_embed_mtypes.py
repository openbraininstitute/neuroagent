"""Unit tests for the brain region embeddings script."""

import json
from unittest.mock import AsyncMock, Mock, patch

import pytest

from neuroagent.scripts.embed_mtypes import (
    push_mtype_embeddings_to_s3,
)


class TestPushMTypesEmbeddingsToS3:
    """Tests for the push_mtype_embeddings_to_s3 function with mocked dependencies."""

    @pytest.fixture
    def sample_entitycore_response(self):
        """Sample response from Entity-Core get-all m-types."""
        data = [
            {"id": "mt1", "pref_label": "Type One"},
            {"id": "mt2", "pref_label": "Type Two"},
            {"id": "mt3", "pref_label": "Type Three"},
        ]
        return {
            "pagination": {"total_items": len(data)},
            "data": data,
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

    @patch("neuroagent.scripts.embed_mtypes.AsyncOpenAI")
    @patch("neuroagent.scripts.embed_mtypes.boto3.client")
    @pytest.mark.asyncio
    async def test_successful_embedding_pipeline(
        self,
        mock_boto_client,
        mock_openai_client,
        httpx_mock,
        sample_entitycore_response,
        mock_embedding_data,
    ):
        """Test successful execution of the embedding pipeline."""
        # Setup HTTP client mock for entity core API
        httpx_mock.add_response(
            method="GET",
            url="http://test-entity-core.com/mtype?page_size=1000",
            json=sample_entitycore_response,
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
        await push_mtype_embeddings_to_s3(
            s3_url="http://test-s3.com",
            entity_core_url="http://test-entity-core.com",
            s3_access_key="test-access-key",
            s3_secret_key="test-secret-key",
            s3_bucket_name="test-bucket",
            token="test-bearer-token",
            page_size=1000,
        )

        # Verify entity core API call was made
        assert len(httpx_mock.get_requests()) == 1
        request = httpx_mock.get_requests()[0]
        assert request.headers["Authorization"] == "Bearer test-bearer-token"

        # Verify OpenAI embedding calls
        assert mock_embeddings_api.create.call_count == 1

        # Check the embedding calls
        embedding_calls = mock_embeddings_api.create.call_args_list
        names_call = embedding_calls[0]

        # Verify names were embedded
        expected_names = [
            "Type One",
            "Type Two",
            "Type Three",
        ]
        assert names_call.kwargs["input"] == expected_names
        assert names_call.kwargs["model"] == "text-embedding-3-small"

        # Verify S3 upload
        mock_s3_instance.put_object.assert_called_once()
        s3_call_args = mock_s3_instance.put_object.call_args.kwargs

        assert s3_call_args["Bucket"] == "test-bucket"
        assert s3_call_args["Key"] == "shared/mtypes_embeddings.json"
        assert s3_call_args["ContentType"] == "application/json"

        # Verify the uploaded data structure
        uploaded_data = json.loads(s3_call_args["Body"])
        assert len(uploaded_data["mtypes"]) == 3

        # Check that embeddings were properly assigned
        for region_data in uploaded_data["mtypes"]:
            assert region_data["pref_label_embedding"] is not None
            assert len(region_data["pref_label_embedding"]) == 5  # Embedding dimension

    @pytest.mark.asyncio
    async def test_entity_core_api_error_handling(self, httpx_mock):
        """Test proper error handling when entity core API fails."""
        httpx_mock.add_response(
            method="GET",
            url="http://test-entity-core.com/mtype?page_size=1000",
            text="Unauthorized",
            status_code=401,
        )

        # Verify exception is raised
        with pytest.raises(ValueError) as exc_info:
            await push_mtype_embeddings_to_s3(
                s3_url="http://test-s3.com",
                entity_core_url="http://test-entity-core.com",
                s3_access_key="test-access-key",
                s3_secret_key="test-secret-key",
                s3_bucket_name="test-bucket",
                token="test-token",
                page_size=1000,
            )

        assert "Entity core returned a non 200 status code" in str(exc_info.value)
        assert "Unauthorized" in str(exc_info.value)
