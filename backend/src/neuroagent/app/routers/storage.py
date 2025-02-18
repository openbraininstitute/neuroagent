"""Storage related operations."""

import logging
from typing import Annotated

import boto3
from fastapi import APIRouter, Depends, HTTPException

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import get_settings, get_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/storage", tags=["Storage operations"])


@router.get("/{file_identifier}/presigned-url")
async def generate_presigned_url(
    file_identifier: str,
    user_id: Annotated[str, Depends(get_user_id)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    """Generate a presigned URL for file access."""
    s3_client = boto3.client(
        "s3",
        endpoint_url=settings.storage.endpoint_url,
        aws_access_key_id=settings.storage.access_key.get_secret_value(),
        aws_secret_access_key=settings.storage.secret_key.get_secret_value(),
        aws_session_token=None,
        config=boto3.session.Config(signature_version="s3v4"),
    )

    # Construct the key with user-specific path (without bucket name)
    key = f"{user_id}/{file_identifier}"

    # Check if object exists first
    try:
        s3_client.head_object(Bucket=settings.storage.bucket_name, Key=key)
    except s3_client.exceptions.ClientError as e:
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
