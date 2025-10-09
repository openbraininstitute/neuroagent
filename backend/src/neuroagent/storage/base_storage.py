"""Base class for the storage abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Iterable


class StorageClient(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    def put_object(
        self,
        container: str,
        key: str,
        body: bytes | str,
        content_type: str,
        metadata: Dict[str, str] | None = None,
    ) -> None:
        """Upload or overwrite an object."""

    @abstractmethod
    def delete_object(self, container: str, key: str) -> None:
        """Delete a single object."""

    @abstractmethod
    def list_objects(self, container: str, prefix: str) -> Iterable[str]:
        """List object keys under a prefix."""

    @abstractmethod
    def get_metadata(self, container: str, key: str) -> Dict[str, str] | None:
        """Return metadata dict for the object, or None if not found."""

    @abstractmethod
    def generate_presigned_url(self, container: str, key: str, expires_in: int) -> str:
        """Return a provider-specific presigned URL (GET) valid for expires_in seconds."""
