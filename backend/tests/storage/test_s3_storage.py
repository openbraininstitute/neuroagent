"""Unit tests for storage client implementations."""

from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from neuroagent.storage.s3_storage import S3StorageClient


class TestS3StorageClient:
    """Test suite for S3StorageClient."""

    @pytest.fixture
    def mock_boto_client(self):
        """Create a mock boto3 S3 client."""
        with patch("neuroagent.storage.s3_storage.boto3.client") as mock_client:
            client_instance = MagicMock()
            client_instance.meta.endpoint_url = "https://s3.amazonaws.com"
            mock_client.return_value = client_instance
            yield client_instance

    @pytest.fixture
    def s3_client(self, mock_boto_client):
        """Create an S3StorageClient instance with mocked boto3 client."""
        return S3StorageClient(
            endpoint_url="https://minio.example.com",
            access_key="test_access_key",
            secret_key="test_secret_key",
        )

    def test_init(self, mock_boto_client):
        """Test S3StorageClient initialization."""
        client = S3StorageClient(
            endpoint_url="https://minio.example.com",
            access_key="access",
            secret_key="secret",
        )
        assert client.client == mock_boto_client
        assert client.endpoint_url == "https://s3.amazonaws.com"

    def test_put_object(self, s3_client, mock_boto_client):
        """Test uploading an object with metadata."""
        metadata = {"user": "test_user", "version": 1}
        s3_client.put_object(
            container="test-bucket",
            key="test/file.txt",
            body="string content",
            content_type="application/json",
            metadata=metadata,
        )

        call_args = mock_boto_client.put_object.call_args
        assert call_args.kwargs["Metadata"] == {"user": "test_user", "version": "1"}

    def test_delete_object(self, s3_client, mock_boto_client):
        """Test deleting an object."""
        s3_client.delete_object(container="test-bucket", key="test/file.txt")

        mock_boto_client.delete_object.assert_called_once_with(
            Bucket="test-bucket", Key="test/file.txt"
        )

    def test_list_objects(self, s3_client, mock_boto_client):
        """Test listing objects with pagination."""
        mock_paginator = MagicMock()
        mock_boto_client.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = [
            {"Contents": [{"Key": "prefix/file1.txt"}, {"Key": "prefix/file2.txt"}]},
            {"Contents": [{"Key": "prefix/file3.txt"}]},
        ]

        result = list(s3_client.list_objects(container="test-bucket", prefix="prefix/"))

        assert result == ["prefix/file1.txt", "prefix/file2.txt", "prefix/file3.txt"]
        mock_boto_client.get_paginator.assert_called_once_with("list_objects_v2")
        mock_paginator.paginate.assert_called_once_with(
            Bucket="test-bucket", Prefix="prefix/"
        )

    def test_get_metadata_success(self, s3_client, mock_boto_client):
        """Test retrieving metadata for an existing object."""
        mock_boto_client.head_object.return_value = {
            "Metadata": {"user": "test_user", "version": "2"}
        }

        metadata = s3_client.get_metadata(container="test-bucket", key="test/file.txt")

        assert metadata == {"user": "test_user", "version": "2"}
        mock_boto_client.head_object.assert_called_once_with(
            Bucket="test-bucket", Key="test/file.txt"
        )

    def test_get_metadata_not_found(self, s3_client, mock_boto_client):
        """Test retrieving metadata for a non-existent object."""
        error_response = {"Error": {"Code": "404"}}
        mock_boto_client.head_object.side_effect = ClientError(
            error_response, "head_object"
        )

        metadata = s3_client.get_metadata(container="test-bucket", key="missing.txt")

        assert metadata is None

    def test_generate_presigned_url(self, s3_client, mock_boto_client):
        """Test generating a presigned URL."""
        mock_boto_client.generate_presigned_url.return_value = (
            "https://s3.amazonaws.com/test-bucket/file.txt?signature=xyz"
        )

        url = s3_client.generate_presigned_url(
            container="test-bucket", key="file.txt", expires_in=3600
        )

        assert "signature=xyz" in url
        mock_boto_client.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "test-bucket", "Key": "file.txt"},
            ExpiresIn=3600,
        )
