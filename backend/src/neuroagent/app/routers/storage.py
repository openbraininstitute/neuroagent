"""Storage related operations."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import get_settings, get_storage_client, get_user_info
from neuroagent.app.schemas import UserInfo
from neuroagent.storage.base_storage import StorageClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/storage", tags=["Storage operations"])


@router.get("/{file_identifier}/presigned-url")
async def generate_presigned_url(
    file_identifier: str,
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    settings: Annotated[Settings, Depends(get_settings)],
    storage_client: Annotated[StorageClient, Depends(get_storage_client)],
) -> str:
    """
    Generate a presigned URL for file access using the storage abstraction.

    Supports S3/MinIO and Azure/Azurite storage backends.

    Returns
    -------
        str: The presigned URL for accessing the file.
    """
    # Build key from the authenticated user's id
    key = f"{user_info.sub}/{file_identifier}"

    # Check existence with the abstracted method (provider-agnostic)
    metadata = storage_client.get_metadata(
        container=settings.storage.container_name, key=key
    )
    if metadata is None:
        raise HTTPException(status_code=404, detail=f"File {file_identifier} not found")

    # Ask the provider to build a presigned URL / SAS
    try:
        url = storage_client.generate_presigned_url(
            container=settings.storage.container_name,
            key=key,
            expires_in=settings.storage.expires_in,
        )
    except NotImplementedError:
        raise HTTPException(
            status_code=501,
            detail="Presigned URL generation not implemented for this provider",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Error generating presigned URL: {exc}"
        )

    return url
