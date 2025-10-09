"""S3 class for the storage."""

from typing import Any, Dict, Generator

import boto3
import botocore
from botocore.config import Config as BotoConfig

from neuroagent.storage.base_storage import StorageClient


class S3StorageClient(StorageClient):
    """Client for interacting with S3 or S3-compatible storage services."""

    def __init__(
        self, endpoint_url: str | None, access_key: str | None, secret_key: str | None
    ):
        """Initialize the S3 storage client.

        Args:
            endpoint_url (str | None): S3 endpoint URL (for MinIO or custom S3).
            access_key (str | None): AWS access key ID.
            secret_key (str | None): AWS secret access key.
        """
        cfg = BotoConfig(signature_version="s3v4")
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=cfg,
        )
        # endpoint for building user-visible URLs (MinIO or S3)
        self.endpoint_url = getattr(self.client, "meta", None) and getattr(
            self.client.meta, "endpoint_url", None
        )

    def put_object(
        self,
        container: str,
        key: str,
        body: bytes | str,
        content_type: str,
        metadata: Dict[str, str] | None = None,
    ) -> None:
        """Upload an object to the specified S3 bucket."""
        params: dict[str, Any] = {
            "Bucket": container,
            "Key": key,
            "Body": body,
            "ContentType": content_type,
        }
        if metadata:
            params["Metadata"] = {k: str(v) for k, v in metadata.items()}
        self.client.put_object(**params)

    def delete_object(self, container: str, key: str) -> None:
        """Delete an object from the S3 bucket."""
        self.client.delete_object(Bucket=container, Key=key)

    def list_objects(self, container: str, prefix: str) -> Generator[str, None, None]:
        """List object keys in a bucket matching a given prefix."""
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=container, Prefix=prefix):
            for obj in page.get("Contents", []):
                yield obj["Key"]

    def get_metadata(self, container: str, key: str) -> Dict[str, str] | None:
        """Retrieve metadata for an object in the bucket."""
        try:
            head = self.client.head_object(Bucket=container, Key=key)
            # boto3 returns Metadata as a dict
            return {k: v for k, v in head.get("Metadata", {}).items()}
        except botocore.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("404", "NotFound"):
                return None
            raise

    def generate_presigned_url(self, container: str, key: str, expires_in: int) -> str:
        """Generate a presigned URL for temporary access to an object."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": container, "Key": key},
            ExpiresIn=expires_in,
        )
