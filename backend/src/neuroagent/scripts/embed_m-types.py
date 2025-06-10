"""Using the get-all endpoint from entitycore, embed all the m-types for resolving."""

import argparse
import asyncio
import logging
import os

import boto3
from dotenv import load_dotenv
from httpx import AsyncClient
from openai import AsyncOpenAI

from neuroagent.schemas import EmbeddedMType, EmbeddedMTypes

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
        "--entity-core-url",
        "-e",
        required=False,
        default=None,
        help="URL of the entity core API. Read from env if not specified.",
    )
    parser.add_argument(
        "--page-size",
        "-p",
        required=False,
        default=1000,
        type=int,
        help="page size to get all the m-types.",
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


async def push_mtype_embeddings_to_s3(
    s3_url: str | None,
    entity_core_url: str | None,
    s3_access_key: str | None,
    s3_secret_key: str | None,
    s3_bucket_name: str,
    token: str,
    page_size: int,
) -> None:
    """Compute and push m-type embeddings to s3."""
    httpx_client = AsyncClient(timeout=None)
    logger.info("Getting list of all m-types from Entity-Core.")

    response = await httpx_client.get(
        f"{(entity_core_url or os.getenv('NEUROAGENT_TOOLS__ENTITYCORE__URL')).rstrip('/')}/mtype",
        params={"page_size": page_size},
        headers={"Authorization": f"Bearer {token}"},
    )
    if response.status_code != 200:
        raise ValueError(
            f"Entity core returned a non 200 status code. Could not update the brain region embeddings. Error: {response.text}"
        )

    m_types_response = response.json()
    if m_types_response["pagination"]["total_items"] > page_size:
        raise ValueError(
            "Not all m-types were retreived, please increase the page size."
        )

    m_types = EmbeddedMTypes(
        mtypes=[
            EmbeddedMType(id=m_type["id"], pref_label=m_type["pref_label"])
            for m_type in m_types_response["data"]
        ]
    )
    # Gather the names
    pref_labels = [m_types.pref_label for m_types in m_types.mtypes]

    # Embed them
    logger.info("Embedding the m_types pref_labels.")
    openai_client = AsyncOpenAI(api_key=os.getenv("NEUROAGENT_OPENAI__TOKEN"))
    m_types_embeddings = await openai_client.embeddings.create(
        input=pref_labels, model="text-embedding-3-small"
    )

    # Set the embeddings in the original class
    for m_types_class, pref_label_embedding in zip(
        m_types.mtypes, m_types_embeddings.data
    ):
        m_types_class.pref_label_embedding = pref_label_embedding.embedding

    # Put the result in the s3 bucket
    logger.info(
        f"Saving the results in s3 bucket: {s3_url or os.getenv('NEUROAGENT_STORAGE__ENDPOINT_URL')} at location: {'shared/mtypes.json'}"
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
        Key="shared/mtypes_embeddings.json",
        Body=m_types.model_dump_json(),
        ContentType="application/json",
    )


async def main() -> None:
    """Run main logic."""
    parser = get_parser()
    args = parser.parse_args()
    await push_mtype_embeddings_to_s3(**vars(args))


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
