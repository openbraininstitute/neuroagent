"""Unit tests for storage client implementations."""

from unittest.mock import MagicMock, Mock, patch

import pytest

from neuroagent.storage.azure_storage import AzureBlobStorageClient


class TestAzureBlobStorageClient:
    """Test suite for AzureBlobStorageClient."""

    @pytest.fixture
    def mock_blob_service(self):
        """Create a mock BlobServiceClient."""
        with patch(
            "neuroagent.storage.azure_storage.BlobServiceClient"
        ) as mock_service:
            service_instance = MagicMock()
            mock_service.return_value = service_instance
            mock_service.from_connection_string.return_value = service_instance
            yield service_instance

    @pytest.fixture
    def azure_client(self, mock_blob_service):
        """Create an AzureBlobStorageClient instance."""
        return AzureBlobStorageClient(
            account_name="testaccount",
            account_key="testkey123",
            container="test-container",
        )

    @pytest.fixture
    def azure_client_local(self, mock_blob_service):
        """Create an AzureBlobStorageClient for local/Azurite."""
        return AzureBlobStorageClient(
            account_name="devstoreaccount1",
            account_key="devkey",
            container="test-container",
            azure_endpoint_url="http://localhost:10000",
        )

    def test_init_cloud(self, mock_blob_service):
        """Test initialization for Azure cloud storage."""
        with (
            patch("neuroagent.storage.azure_storage.BlobServiceClient") as mock_service,
            patch(
                "neuroagent.storage.azure_storage.AzureNamedKeyCredential"
            ) as mock_cred,
        ):
            mock_service.return_value = mock_blob_service
            credential_instance = MagicMock()
            mock_cred.return_value = credential_instance

            client = AzureBlobStorageClient(
                account_name="testaccount",
                account_key="testkey",
                container="test-container",
            )

            mock_cred.assert_called_once_with("testaccount", "testkey")
            mock_service.assert_called_once_with(
                account_url="https://testaccount.blob.core.windows.net",
                credential=credential_instance,
            )
            assert client.account_name == "testaccount"
            assert client.account_key == "testkey"
            assert client.container == "test-container"

    def test_init_local(self, mock_blob_service):
        """Test initialization for local Azurite storage."""
        with patch(
            "neuroagent.storage.azure_storage.BlobServiceClient"
        ) as mock_service:
            mock_service.from_connection_string.return_value = mock_blob_service

            _ = AzureBlobStorageClient(
                account_name="devstoreaccount1",
                account_key="devkey",
                container="test-container",
                azure_endpoint_url="http://localhost:10000",
            )

            assert mock_service.from_connection_string.called
            conn_str = mock_service.from_connection_string.call_args[0][0]
            assert "DefaultEndpointsProtocol=http" in conn_str
            assert "AccountName=devstoreaccount1" in conn_str
            assert "BlobEndpoint=http://localhost:10000/devstoreaccount1" in conn_str

    def test_put_object(self, azure_client, mock_blob_service):
        """Test uploading an object with metadata."""
        mock_container = MagicMock()
        mock_blob = MagicMock()
        mock_blob_service.get_container_client.return_value = mock_container
        mock_container.get_blob_client.return_value = mock_blob

        metadata = {"User": "TestUser", "Version": 1}
        azure_client.put_object(
            container="test-container",
            key="test/file.json",
            body='{"data": "value"}',
            content_type="application/json",
            metadata=metadata,
        )

        call_kwargs = mock_blob.upload_blob.call_args.kwargs
        # Azure forces keys to lowercase
        assert call_kwargs["metadata"] == {"user": "TestUser", "version": "1"}

    def test_delete_object(self, azure_client, mock_blob_service):
        """Test deleting an object."""
        mock_blob = MagicMock()
        mock_blob_service.get_blob_client.return_value = mock_blob

        azure_client.delete_object(container="test-container", key="test/file.txt")

        mock_blob_service.get_blob_client.assert_called_once_with(
            container="test-container", blob="test/file.txt"
        )
        mock_blob.delete_blob.assert_called_once()

    def test_list_objects(self, azure_client, mock_blob_service):
        """Test listing objects."""
        mock_container = MagicMock()
        mock_blob_service.get_container_client.return_value = mock_container

        mock_blob1 = Mock()
        mock_blob1.name = "prefix/file1.txt"
        mock_blob2 = Mock()
        mock_blob2.name = "prefix/file2.txt"
        mock_container.list_blobs.return_value = [mock_blob1, mock_blob2]

        result = list(
            azure_client.list_objects(container="test-container", prefix="prefix/")
        )

        assert result == ["prefix/file1.txt", "prefix/file2.txt"]
        mock_container.list_blobs.assert_called_once_with(name_starts_with="prefix/")

    def test_get_metadata_success(self, azure_client, mock_blob_service):
        """Test retrieving metadata for an existing blob."""
        mock_blob = MagicMock()
        mock_blob_service.get_blob_client.return_value = mock_blob

        mock_props = Mock()
        mock_props.metadata = {"user": "test_user", "version": "2"}
        mock_blob.get_blob_properties.return_value = mock_props

        metadata = azure_client.get_metadata(
            container="test-container", key="test/file.txt"
        )

        assert metadata == {"user": "test_user", "version": "2"}

    def test_get_metadata_not_found(self, azure_client, mock_blob_service):
        """Test retrieving metadata for a non-existent blob."""
        from azure.core.exceptions import ResourceNotFoundError

        mock_blob = MagicMock()
        mock_blob_service.get_blob_client.return_value = mock_blob
        mock_blob.get_blob_properties.side_effect = ResourceNotFoundError(
            "Blob not found"
        )

        metadata = azure_client.get_metadata(
            container="test-container", key="missing.txt"
        )

        assert metadata is None

    @patch("neuroagent.storage.azure_storage.generate_blob_sas")
    def test_generate_presigned_url(
        self, mock_generate_sas, azure_client, mock_blob_service
    ):
        """Test generating a presigned URL."""
        mock_blob = MagicMock()
        mock_blob.url = "https://testaccount.blob.core.windows.net/container/file.txt"
        mock_blob_service.get_blob_client.return_value = mock_blob
        mock_generate_sas.return_value = "sv=2021-01-01&sig=signature123"

        url = azure_client.generate_presigned_url(
            container="test-container", key="file.txt", expires_in=3600
        )

        assert (
            url
            == "https://testaccount.blob.core.windows.net/container/file.txt?sv=2021-01-01&sig=signature123"
        )
        mock_generate_sas.assert_called_once()
        call_kwargs = mock_generate_sas.call_args.kwargs
        assert call_kwargs["account_name"] == "testaccount"
        assert call_kwargs["container_name"] == "test-container"
        assert call_kwargs["blob_name"] == "file.txt"
