"""Unit tests for the presigned URL generation endpoint."""

import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from neuroagent.app.config import Settings, SettingsStorage
from neuroagent.app.main import app  # Adjust import path as needed
from neuroagent.app.schemas import UserInfo
from neuroagent.storage.base_storage import StorageClient


class TestGeneratePresignedUrlEndpoint:
    """Test suite for the generate_presigned_url endpoint."""

    @pytest.fixture
    def mock_storage_client(self):
        """Create a mock StorageClient."""
        return MagicMock(spec=StorageClient)

    @pytest.fixture
    def mock_settings(self):
        """Create mock Settings with storage configuration."""
        settings = MagicMock(spec=Settings)
        settings.storage = MagicMock(spec=SettingsStorage)
        settings.storage.container_name = "test-bucket"
        settings.storage.expires_in = 3600
        settings.misc = MagicMock(application_prefix="dour")
        return settings

    @pytest.fixture
    def mock_user_info(self):
        """Create mock UserInfo."""
        user_info = MagicMock(spec=UserInfo)
        user_info.sub = str(uuid.UUID("12345678-1234-5678-1234-567812345678"))
        return user_info

    @pytest.fixture
    def test_client(self):
        """Create a FastAPI test client."""
        return TestClient(app)

    @pytest.fixture
    def override_dependencies(
        self, test_client, mock_storage_client, mock_settings, mock_user_info
    ):
        """Override FastAPI dependencies for testing."""
        from neuroagent.app.dependencies import (
            get_settings,
            get_storage_client,
            get_user_info,
        )

        app.dependency_overrides[get_storage_client] = lambda: mock_storage_client
        app.dependency_overrides[get_settings] = lambda: mock_settings
        app.dependency_overrides[get_user_info] = lambda: mock_user_info

        yield

        # Clean up
        app.dependency_overrides.clear()

    def test_generate_presigned_url_success(
        self,
        test_client,
        override_dependencies,
        mock_storage_client,
        mock_settings,
        mock_user_info,
    ):
        """Test successful presigned URL generation."""
        file_identifier = "test-file-id"
        expected_url = "https://storage.example.com/bucket/user/file?signature=xyz"

        # Mock successful metadata retrieval
        mock_storage_client.get_metadata.return_value = {
            "category": "image",
            "thread_id": "some-thread-id",
        }

        # Mock presigned URL generation
        mock_storage_client.generate_presigned_url.return_value = expected_url

        # Make request
        response = test_client.get(f"/storage/{file_identifier}/presigned-url")

        # Assertions
        assert response.status_code == 200
        assert response.json() == expected_url

        # Verify the correct key was used
        expected_key = f"{mock_user_info.sub}/{file_identifier}"
        mock_storage_client.get_metadata.assert_called_once_with(
            container=mock_settings.storage.container_name, key=expected_key
        )

        # Verify presigned URL generation
        mock_storage_client.generate_presigned_url.assert_called_once_with(
            container=mock_settings.storage.container_name,
            key=expected_key,
            expires_in=mock_settings.storage.expires_in,
        )

    def test_generate_presigned_url_file_not_found(
        self,
        test_client,
        override_dependencies,
        mock_storage_client,
        mock_user_info,
    ):
        """Test when file doesn't exist (metadata returns None)."""
        file_identifier = "nonexistent-file"

        # Mock metadata returning None (file not found)
        mock_storage_client.get_metadata.return_value = None

        # Make request
        response = test_client.get(f"/storage/{file_identifier}/presigned-url")

        # Assertions
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

        # Verify get_metadata was called but generate_presigned_url was not
        mock_storage_client.get_metadata.assert_called_once()
        mock_storage_client.generate_presigned_url.assert_not_called()

    def test_generate_presigned_url_storage_error(
        self,
        test_client,
        override_dependencies,
        mock_storage_client,
    ):
        """Test when storage client raises an unexpected error."""
        file_identifier = "test-file-id"

        # Mock successful metadata retrieval
        mock_storage_client.get_metadata.return_value = {"category": "image"}

        # Mock a generic exception
        mock_storage_client.generate_presigned_url.side_effect = Exception(
            "Storage service unavailable"
        )

        # Make request
        response = test_client.get(f"/storage/{file_identifier}/presigned-url")

        # Assertions
        assert response.status_code == 500
        assert "error generating presigned url" in response.json()["detail"].lower()
        assert "storage service unavailable" in response.json()["detail"].lower()

    def test_generate_presigned_url_different_users(
        self, test_client, mock_storage_client, mock_settings
    ):
        """Test that different users access different files based on their user_id."""
        from neuroagent.app.dependencies import (
            get_settings,
            get_storage_client,
            get_user_info,
        )

        file_identifier = "shared-filename.txt"

        # User 1
        user1_info = MagicMock(spec=UserInfo)
        user1_info.sub = "user-1-id"

        app.dependency_overrides[get_storage_client] = lambda: mock_storage_client
        app.dependency_overrides[get_settings] = lambda: mock_settings
        app.dependency_overrides[get_user_info] = lambda: user1_info

        mock_storage_client.get_metadata.return_value = {"category": "image"}
        mock_storage_client.generate_presigned_url.return_value = "https://url1.com"

        response1 = test_client.get(f"/storage/{file_identifier}/presigned-url")
        assert response1.status_code == 200

        key1 = mock_storage_client.get_metadata.call_args.kwargs["key"]
        assert key1 == f"user-1-id/{file_identifier}"

        # Reset mock
        mock_storage_client.reset_mock()

        # User 2
        user2_info = MagicMock(spec=UserInfo)
        user2_info.sub = "user-2-id"

        app.dependency_overrides[get_user_info] = lambda: user2_info

        mock_storage_client.get_metadata.return_value = {"category": "image"}
        mock_storage_client.generate_presigned_url.return_value = "https://url2.com"

        response2 = test_client.get(f"/storage/{file_identifier}/presigned-url")
        assert response2.status_code == 200

        key2 = mock_storage_client.get_metadata.call_args.kwargs["key"]
        assert key2 == f"user-2-id/{file_identifier}"

        # Verify different keys were used
        assert key1 != key2

        # Clean up
        app.dependency_overrides.clear()
