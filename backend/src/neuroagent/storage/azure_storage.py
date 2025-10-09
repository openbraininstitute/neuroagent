"""Azure blob class for the storage."""

from datetime import datetime, timedelta
from typing import Dict, Iterable, Optional

from azure.core.credentials import AzureNamedKeyCredential
from azure.core.exceptions import (
    HttpResponseError,
    ResourceExistsError,
    ResourceNotFoundError,
    ServiceRequestError,
)
from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    CorsRule,
    generate_blob_sas,
)

from neuroagent.storage.base_storage import StorageClient


class AzureBlobStorageClient(StorageClient):
    """Class for the storage instance for Azure Blob Storage."""

    def __init__(
        self,
        account_name: str,
        account_key: str,
        container: str,
        azure_endpoint_url: str | None = None,
    ):
        """
        Initialize an Azure storage client.

        Args:

            account_name (str): Azure account name. Required only for generating SAS tokens.
            account_key (str): Azure account key. Required only for generating SAS tokens.
            container (str): Name of the Azure container.
            connection_string (str, optional): for local storage, the endpoint url to generate the connection string.

        Returns
        -------
            Any: An instance of the Azure storage class.
        """
        if azure_endpoint_url:
            connection_string = (
                f"DefaultEndpointsProtocol=http;"
                f"AccountName={account_name};"
                f"AccountKey={account_key};"
                f"BlobEndpoint={azure_endpoint_url};"
            )
            self.service = BlobServiceClient.from_connection_string(connection_string)
        else:
            account_url = f"https://{account_name}.blob.core.windows.net"
            credential = AzureNamedKeyCredential(account_name, account_key)
            self.service = BlobServiceClient(
                account_url=account_url,
                credential=credential,
            )

        self.account_name = account_name
        self.account_key = account_key
        self.container = container

        # Ensure container exists
        container_client = self.service.get_container_client(container)
        try:
            container_client.create_container()
        except ResourceExistsError:
            pass

        # CORS setup for local dev
        try:
            self.service.set_service_properties(
                cors=[
                    CorsRule(
                        allowed_origins=["*"],
                        allowed_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS"],
                        allowed_headers=["*"],
                        exposed_headers=["*"],
                        max_age_in_seconds=3600,
                    )
                ]
            )
        except (HttpResponseError, ServiceRequestError) as e:
            raise ValueError("Warning: could not set CORS automatically:", e)

    def put_object(
        self,
        container: str,
        key: str,
        body: bytes | str,
        content_type: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> None:
        """Save an object in the azure blob storage."""
        meta = {k.lower(): str(v) for k, v in (metadata or {}).items()}
        container_client = self.service.get_container_client(container)
        blob_client = container_client.get_blob_client(key)
        data = body if isinstance(body, (bytes, bytearray)) else body.encode("utf-8")
        content_settings = ContentSettings(content_type=content_type)
        blob_client.upload_blob(
            data, overwrite=True, content_settings=content_settings, metadata=meta
        )

    def delete_object(self, container: str, key: str) -> None:
        """Delete one blob from the storage."""
        blob = self.service.get_blob_client(container=container, blob=key)
        blob.delete_blob()

    def list_objects(self, container: str, prefix: str) -> Iterable[str]:
        """List all objects from the container."""
        container_client = self.service.get_container_client(container)
        for blob in container_client.list_blobs(name_starts_with=prefix):
            yield blob.name

    def get_metadata(self, container: str, key: str) -> Dict[str, str] | None:
        """Retreive all metadata from the blob."""
        blob_client = self.service.get_blob_client(container=container, blob=key)
        try:
            props = blob_client.get_blob_properties()
            return dict(props.metadata or {})
        except ResourceNotFoundError:
            return None

    def generate_presigned_url(self, container: str, key: str, expires_in: int) -> str:
        """Generate a pre-signed url for a specific user object."""
        if not (self.account_name and self.account_key):
            raise RuntimeError(
                "Account name/key required to generate SAS token for Azure storage."
            )
        expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        sas = generate_blob_sas(
            account_name=self.account_name,
            container_name=container,
            blob_name=key,
            account_key=self.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=expiry,
        )
        blob = self.service.get_blob_client(container=container, blob=key)
        return f"{blob.url}?{sas}"
