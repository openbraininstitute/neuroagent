"""Based on a brain region hierarchy, add embeddings in minio/s3 for every brain region."""

import argparse
import asyncio
import logging
import os
from typing import Any

import boto3
from dotenv import load_dotenv
from httpx import AsyncClient
from openai import AsyncOpenAI

from neuroagent.schemas import EmbeddedBrainRegion, EmbeddedBrainRegions

logging.basicConfig(
    format="[%(levelname)s]  %(asctime)s %(name)s  %(message)s", level=logging.INFO
)

logger = logging.getLogger(__name__)


def get_parser() -> argparse.ArgumentParser:
    """Get parser for command line arguments."""
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "token",
        type=str,
        help="Bearer token for the entity core call.",
    )
    parser.add_argument(
        "--hierarchy-id",
        "-i",
        type=str,
        default="e3e70682-c209-4cac-a29f-6fbed82c07cd",
        help="Id of the brain region hierarchy.",
    )
    parser.add_argument(
        "--entity-core-url",
        "-e",
        required=False,
        default=None,
        help="URL of the entity core API. Read from env if not specified.",
    )
    (
        parser.add_argument(
            "--s3-url",
            "-u",
            type=str,
            required=False,
            default=None,
            help="URL of the s3 bucket. Read from env if not specified.",
        ),
    )
    (
        parser.add_argument(
            "--s3-bucket-name",
            "-b",
            type=str,
            required=False,
            default=None,
            help="Name of the s3 bucket. Read from env if not specified.",
        ),
    )
    (
        parser.add_argument(
            "--s3-access-key",
            "-a",
            type=str,
            required=False,
            default=None,
            help="Access key of the s3 bucket. Read from env if not specified.",
        ),
    )
    (
        parser.add_argument(
            "--s3-secret-key",
            "-s",
            type=str,
            required=False,
            default=None,
            help="Secret key of the s3 bucket. Read from env if not specified.",
        ),
    )
    return parser


def flatten_hierarchy(
    hierarchy: dict[str, Any], level: int = 0
) -> list[EmbeddedBrainRegion]:
    """Recursively walk the hierarchy and return a flat list of all brain regions for every node."""
    regions: list[EmbeddedBrainRegion] = []

    # 1. Add this node
    regions.append(
        EmbeddedBrainRegion(
            id=hierarchy["id"],
            name=hierarchy["name"],
            hierarchy_level=level,
        )
    )

    # 2. Recurse into any children
    for child in hierarchy.get("children", []):
        regions.extend(flatten_hierarchy(child, level=level + 1))

    return regions


async def push_embeddings_to_s3(
    hierarchy_id: str,
    s3_url: str | None,
    entity_core_url: str | None,
    s3_access_key: str | None,
    s3_secret_key: str | None,
    s3_bucket_name: str,
    token: str,
) -> None:
    """Update the database with the latest brain regions and embeddings."""
    httpx_client = AsyncClient(timeout=None)
    logger.info(f"Getting brain hierarchy {hierarchy_id} from Entity-Core.")

    hierarchy = await httpx_client.get(
        f"{(entity_core_url or os.getenv('NEUROAGENT_TOOLS__ENTITYCORE__URL')).rstrip('/')}/brain-region-hierarchy/{hierarchy_id}/hierarchy",  # type: ignore
        headers={"Authorization": f"Bearer {token}"},
    )
    if hierarchy.status_code != 200:
        raise ValueError(
            f"Entity core returned a non 200 status code. Could not update the brain region embeddings. Error: {hierarchy.text}"
        )

    logger.info("Flattening the hierarchy.")
    flattened_hierarchy = flatten_hierarchy(hierarchy=hierarchy.json(), level=0)
    brain_regions = EmbeddedBrainRegions(
        regions=flattened_hierarchy, hierarchy_id=hierarchy_id
    )

    # Gather the names
    names = [brain_region.name for brain_region in brain_regions.regions]

    # Embed them
    logger.info("Embedding the names.")
    openai_client = AsyncOpenAI(api_key=os.getenv("NEUROAGENT_OPENAI__TOKEN"))
    name_embeddings = await openai_client.embeddings.create(
        input=names, model="text-embedding-3-small"
    )

    # Set the embeddings in the original class
    for brain_region, name_embedding in zip(
        brain_regions.regions, name_embeddings.data
    ):
        brain_region.name_embedding = name_embedding.embedding

    # Put the result in the s3 bucket
    logger.info(
        f"Saving the results in s3 bucket: {s3_url or os.getenv('NEUROAGENT_STORAGE__ENDPOINT_URL')} at location: {f'shared/{hierarchy_id}_hierarchy.json'}"
    )
    s3_client = boto3.client(
        "s3",
        endpoint_url=s3_url or os.getenv("NEUROAGENT_STORAGE__ENDPOINT_URL"),
        aws_access_key_id=s3_access_key or os.getenv("NEUROAGENT_STORAGE__ACCESS_KEY"),
        aws_secret_access_key=s3_secret_key
        or os.getenv("NEUROAGENT_STORAGE__SECRET_KEY"),
        aws_session_token=None,
        config=boto3.session.Config(signature_version="s3v4"),
    )

    s3_client.put_object(
        Bucket=s3_bucket_name or os.getenv("NEUROAGENT_STORAGE__BUCKET_NAME"),
        Key=f"shared/{hierarchy_id}_hierarchy_embeddings.json",
        Body=brain_regions.model_dump_json(),
        ContentType="application/json",
    )


async def main() -> None:
    """Run main logic."""
    parser = get_parser()
    args = parser.parse_args()
    await push_embeddings_to_s3(**vars(args))


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
