"""Storage related operations."""

import logging
from typing import Annotated, Any

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import get_s3_client, get_settings, get_user_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/storage", tags=["Storage operations"])


@router.get("/{file_identifier}/presigned-url")
async def generate_presigned_url(
    file_identifier: str,
    user_info: Annotated[dict[str, Any], Depends(get_user_info)],
    settings: Annotated[Settings, Depends(get_settings)],
    s3_client: Annotated[Any, Depends(get_s3_client)],
) -> str:
    """Generate a presigned URL for file access."""
    # Construct the key with user-specific path (without bucket name)
    key = f"{user_info['sub']}/{file_identifier}"

    # Check if object exists first
    try:
        s3_client.head_object(Bucket=settings.storage.bucket_name, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            raise HTTPException(
                status_code=404, detail=f"File {file_identifier} not found"
            )
        raise HTTPException(status_code=500, detail="Error accessing the file")

    # Generate presigned URL that's valid for 10 minutes
    presigned_url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.storage.bucket_name,
            "Key": key,
        },
        ExpiresIn=settings.storage.expires_in,
    )

    return presigned_url
