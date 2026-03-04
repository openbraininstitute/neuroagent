"""Test utility functions."""

import json
from unittest.mock import Mock, call

import pytest

from neuroagent.utils import (
    complete_partial_json,
    delete_from_storage,
    merge_chunk,
    merge_fields,
    save_to_storage,
)


def test_merge_fields_str():
    target = {"key_1": "abc", "key_2": ""}
    source = {"key_1": "def"}
    merge_fields(target, source)
    assert target == {"key_1": "abcdef", "key_2": ""}

    source = {"key_1": "", "key_2": ""}
    target = {"key_1": "value_1"}
    with pytest.raises(KeyError):
        merge_fields(target, source)


def test_merge_fields_dict():
    target = {"key_1": "abc", "key_2": {"sub_key_1": "", "sub_key_2": "abc"}}
    source = {"key_1": "def", "key_2": {"sub_key_1": "hello", "sub_key_2": "cba"}}
    merge_fields(target, source)
    assert target == {
        "key_1": "abcdef",
        "key_2": {"sub_key_1": "hello", "sub_key_2": "abccba"},
    }


def test_merge_chunk():
    message = {
        "content": "",
        "sender": "test agent",
        "role": "assistant",
        "function_call": None,
        "tool_calls": [
            {
                "function": {"arguments": "", "name": ""},
                "id": "",
                "type": "",
            }
        ],
    }
    delta = {
        "content": "Great content",
        "function_call": None,
        "refusal": None,
        "role": "assistant",
        "tool_calls": [
            {
                "index": 0,
                "id": "call_NDiPAjDW4oLef44xIptVSAZC",
                "function": {"arguments": "Thalamus", "name": "resolve-entities-tool"},
                "type": "function",
            }
        ],
    }
    merge_chunk(message, delta)
    assert message == {
        "content": "Great content",
        "sender": "test agent",
        "role": "assistant",
        "function_call": None,
        "tool_calls": [
            {
                "function": {"arguments": "Thalamus", "name": "resolve-entities-tool"},
                "id": "call_NDiPAjDW4oLef44xIptVSAZC",
                "type": "function",
            }
        ],
    }


@pytest.mark.parametrize(
    "partial",
    [
        '{"key',
        '{"key1": "value1", "key',
        '{"key1": "value1", "key2": "val',
        '{"key1": "value1", "key2":',
        '{"key1": "value1",',
        '{"user": {"id": 123, "name": "Al',
        '{"items": ["a", "b", "c"',
        '{"items": ["a", "b", "c"',
        '{"results": [{"x": 1}, {"x": 2},',
        '{"a": 1, "b": 2,',
        '{"arr": [1, 2, 3,',
        '{"text": "hello',
        '{"value": 3.',
        '{"config": {"settings": ["a", "b"',
        "{",
    ],
)
def test_partial_json_completes(partial):
    fixed = complete_partial_json(partial)
    json.loads(fixed)


def test_save_to_storage():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Test parameters
    bucket_name = "test-bucket"
    user_id = "test-user"
    content_type = "application/json"
    category = "json-barplot"  # Using a valid category from the Literal type
    body = b"test content"
    thread_id = "test-thread"

    # Call function
    identifier = save_to_storage(
        s3_client=mock_s3,
        bucket_name=bucket_name,
        user_id=user_id,
        content_type=content_type,
        category=category,
        body=body,
        thread_id=thread_id,
    )

    # Verify the identifier is a valid UUID string
    assert isinstance(identifier, str)

    # Verify s3 client was called correctly
    mock_s3.put_object.assert_called_once()
    call_args = mock_s3.put_object.call_args[1]

    assert call_args["Bucket"] == bucket_name
    assert call_args["Key"] == f"{user_id}/{identifier}"  # Check exact key format
    assert call_args["Body"] == body
    assert call_args["ContentType"] == content_type
    assert call_args["Metadata"] == {"category": category, "thread_id": thread_id}


def test_save_to_storage_without_thread_id():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Test parameters
    bucket_name = "test-bucket"
    user_id = "test-user"
    content_type = "image/png"
    category = "image"  # Using another valid category from the Literal type
    body = b"test content"

    # Call function without thread_id
    identifier = save_to_storage(
        s3_client=mock_s3,
        bucket_name=bucket_name,
        user_id=user_id,
        content_type=content_type,
        category=category,
        body=body,
    )

    # Verify the identifier is a valid UUID string
    assert isinstance(identifier, str)

    # Verify s3 client was called correctly
    mock_s3.put_object.assert_called_once()
    call_args = mock_s3.put_object.call_args[1]

    assert call_args["Bucket"] == bucket_name
    assert call_args["Key"] == f"{user_id}/{identifier}"  # Check exact key format
    assert call_args["Body"] == body
    assert call_args["ContentType"] == content_type
    assert call_args["Metadata"] == {"category": category}


def test_save_to_storage_with_string_body():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Test parameters
    bucket_name = "test-bucket"
    user_id = "test-user"
    content_type = "application/json"
    category = "json-scatterplot"
    body = '{"data": "test json string"}'  # String body (e.g. JSON)
    thread_id = "test-thread"

    # Call function
    identifier = save_to_storage(
        s3_client=mock_s3,
        bucket_name=bucket_name,
        user_id=user_id,
        content_type=content_type,
        category=category,
        body=body,
        thread_id=thread_id,
    )

    # Verify the identifier is a valid UUID string
    assert isinstance(identifier, str)

    # Verify s3 client was called correctly
    mock_s3.put_object.assert_called_once()
    call_args = mock_s3.put_object.call_args[1]

    assert call_args["Bucket"] == bucket_name
    assert call_args["Key"] == f"{user_id}/{identifier}"
    assert call_args["Body"] == body
    assert call_args["ContentType"] == content_type
    assert call_args["Metadata"] == {"category": category, "thread_id": thread_id}


def test_delete_from_storage():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Mock paginator and its paginate method
    mock_paginator = Mock()
    mock_s3.get_paginator.return_value = mock_paginator

    # Test parameters
    bucket_name = "test-bucket"
    user_id = "test-user"
    thread_id = "test-thread"

    # Test case 1: Multiple pages with matching objects
    mock_paginator.paginate.return_value = [
        {
            "Contents": [
                {"Key": f"{user_id}/obj1"},
                {"Key": f"{user_id}/obj2"},
            ]
        },
        {
            "Contents": [
                {"Key": f"{user_id}/obj3"},
            ]
        },
    ]

    # Mock head_object responses for each object
    mock_s3.head_object.side_effect = [
        {"Metadata": {"thread_id": thread_id}},  # obj1
        {"Metadata": {"thread_id": "other"}},  # obj2
        {"Metadata": {"thread_id": thread_id}},  # obj3
    ]

    # Call function
    delete_from_storage(
        s3_client=mock_s3,
        bucket_name=bucket_name,
        user_id=user_id,
        thread_id=thread_id,
    )

    # Verify paginator was called correctly
    mock_s3.get_paginator.assert_called_once_with("list_objects_v2")
    mock_paginator.paginate.assert_called_once_with(
        Bucket=bucket_name, Prefix=f"{user_id}/"
    )

    # Verify head_object was called for each object
    assert mock_s3.head_object.call_count == 3
    mock_s3.head_object.assert_has_calls(
        [
            call(Bucket=bucket_name, Key=f"{user_id}/obj1"),
            call(Bucket=bucket_name, Key=f"{user_id}/obj2"),
            call(Bucket=bucket_name, Key=f"{user_id}/obj3"),
        ]
    )

    # Verify delete_objects was called for each page with correct objects
    assert mock_s3.delete_objects.call_count == 2
    mock_s3.delete_objects.assert_has_calls(
        [
            call(
                Bucket=bucket_name,
                Delete={
                    "Objects": [{"Key": f"{user_id}/obj1"}],
                    "Quiet": True,
                },
            ),
            call(
                Bucket=bucket_name,
                Delete={
                    "Objects": [{"Key": f"{user_id}/obj3"}],
                    "Quiet": True,
                },
            ),
        ]
    )


def test_delete_from_storage_no_contents():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Mock paginator and its paginate method
    mock_paginator = Mock()
    mock_s3.get_paginator.return_value = mock_paginator

    # Test parameters
    bucket_name = "test-bucket"
    user_id = "test-user"
    thread_id = "test-thread"

    # Test case: Page with no contents
    mock_paginator.paginate.return_value = [{}]

    # Call function
    delete_from_storage(
        s3_client=mock_s3,
        bucket_name=bucket_name,
        user_id=user_id,
        thread_id=thread_id,
    )

    # Verify paginator was called correctly
    mock_s3.get_paginator.assert_called_once_with("list_objects_v2")
    mock_paginator.paginate.assert_called_once_with(
        Bucket=bucket_name, Prefix=f"{user_id}/"
    )

    # Verify no other methods were called
    mock_s3.head_object.assert_not_called()
    mock_s3.delete_objects.assert_not_called()


def test_delete_from_storage_large_batch():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Mock paginator and its paginate method
    mock_paginator = Mock()
    mock_s3.get_paginator.return_value = mock_paginator

    # Test parameters
    bucket_name = "test-bucket"
    user_id = "test-user"
    thread_id = "test-thread"

    # Create 1500 test objects (more than the 1000 batch limit)
    test_objects = [{"Key": f"{user_id}/obj{i}"} for i in range(1500)]
    mock_paginator.paginate.return_value = [{"Contents": test_objects}]

    # Mock head_object to always return matching thread_id
    mock_s3.head_object.return_value = {"Metadata": {"thread_id": thread_id}}

    # Call function
    delete_from_storage(
        s3_client=mock_s3,
        bucket_name=bucket_name,
        user_id=user_id,
        thread_id=thread_id,
    )

    # Verify delete_objects was called twice (1000 objects, then 500)
    assert mock_s3.delete_objects.call_count == 2

    # First batch should have 1000 objects
    first_batch = mock_s3.delete_objects.call_args_list[0][1]
    assert len(first_batch["Delete"]["Objects"]) == 1000

    # Second batch should have 500 objects
    second_batch = mock_s3.delete_objects.call_args_list[1][1]
    assert len(second_batch["Delete"]["Objects"]) == 500


def test_valid_uuid():
    """Test that valid UUID strings return True."""
    from neuroagent.utils import is_uuid

    assert is_uuid("123e4567-e89b-12d3-a456-426614174000") is True


def test_invalid_uuid():
    """Test that invalid UUID strings return False."""
    from neuroagent.utils import is_uuid

    assert is_uuid("not-a-uuid") is False
    assert is_uuid("12345") is False


def test_none_value():
    """Test that None returns False."""
    from neuroagent.utils import is_uuid

    assert is_uuid(None) is False


def test_empty_string():
    """Test that empty string returns False."""
    from neuroagent.utils import is_uuid

    assert is_uuid("") is False


@pytest.mark.asyncio
async def test_basic_url_parsing():
    """Test basic URL parsing without query params."""

    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/cell-morphology"

    result = extract_frontend_context(url)

    assert result.raw_path == "cell-morphology"
    assert result.query_params == {}
    assert result.brain_region_id is None
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id is None


@pytest.mark.asyncio
async def test_url_with_entity_id():
    """Test URL parsing with entity ID."""
    from uuid import UUID

    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"

    result = extract_frontend_context(url)

    assert result.raw_path == "cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id == UUID("c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f")


@pytest.mark.asyncio
async def test_url_with_query_params():
    """Test URL parsing with query parameters."""
    from uuid import UUID

    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/electrical-cell-recording?br_id=d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a&filter=active"

    result = extract_frontend_context(url)

    assert result.raw_path == "electrical-cell-recording"
    assert result.query_params["br_id"] == ["d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"]
    assert result.query_params["filter"] == ["active"]
    assert result.brain_region_id == UUID("d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a")
    assert result.observed_entity_type == "electrical-cell-recording"


@pytest.mark.asyncio
async def test_url_with_nested_path():
    """Test URL parsing with nested paths."""
    from uuid import UUID

    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/emodel/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/results"

    result = extract_frontend_context(url)

    assert result.raw_path == "emodel/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/results"
    assert result.current_entity_id == UUID("c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f")
    assert result.observed_entity_type == "emodel"


@pytest.mark.asyncio
async def test_complex_url_with_cell_morphology():
    """Test URL with complex path including cell-morphology."""
    from uuid import UUID

    from neuroagent.utils import extract_frontend_context

    url = "https://mydomain.org/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/some/path/entity/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f?br_id=d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"

    result = extract_frontend_context(url)

    assert (
        result.raw_path
        == "some/path/entity/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
    )
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id == UUID("c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f")
    assert result.brain_region_id == UUID("d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a")


@pytest.mark.asyncio
async def test_complex_url_without_optional_uuid():
    """Test URL with complex path without optional UUID."""
    from uuid import UUID

    from neuroagent.utils import extract_frontend_context

    url = "https://mydomain.org/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/some/path/entity/cell-morphology?br_id=d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"

    result = extract_frontend_context(url)

    assert result.raw_path == "some/path/entity/cell-morphology"
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id is None
    assert result.brain_region_id == UUID("d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a")


@pytest.mark.asyncio
async def test_invalid_url_raises_error():
    """Test that invalid URL raises ValueError."""
    from neuroagent.utils import extract_frontend_context

    invalid_url = "https://example.com/some/other/path"

    with pytest.raises(ValueError, match="Invalid URL"):
        extract_frontend_context(invalid_url)


@pytest.mark.asyncio
async def test_url_without_br_id_param():
    """Test URL without br_id query parameter."""
    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/morphologies?other_param=value"

    result = extract_frontend_context(url)

    assert result.brain_region_id is None
    assert "other_param" in result.query_params


@pytest.mark.asyncio
async def test_url_with_trailing_slash():
    """Test URL with trailing slash."""
    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/morphologies/"

    result = extract_frontend_context(url)

    assert "morphologies" in result.raw_path


@pytest.mark.asyncio
async def test_no_matching_entity_type():
    """Test URL with no matching entity type."""
    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/unknown-route"

    result = extract_frontend_context(url)

    assert result.observed_entity_type is None
    assert result.raw_path == "unknown-route"


@pytest.mark.asyncio
async def test_url_with_multiple_uuid():
    """Test URL parsing with multiple UUIDs."""
    from uuid import UUID

    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"

    result = extract_frontend_context(url)

    assert (
        result.raw_path
        == "cell-morphology/c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    )
    assert result.observed_entity_type == "cell-morphology"
    assert result.current_entity_id == UUID("c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f")


@pytest.mark.asyncio
async def test_url_with_simulation():
    """Test URL parsing with simulation campaign."""
    from neuroagent.utils import extract_frontend_context

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/small-microcircuit-simulation?br_id=4642cddb-4fbe-4aae-bbf7-0946d6ada066&br_av=8&group=simulations&view=flat"

    result = extract_frontend_context(url)

    assert result.raw_path == "small-microcircuit-simulation"
    assert result.observed_entity_type == "simulation-campaign"
    assert result.current_entity_id is None
    assert result.query_params["br_id"] == ["4642cddb-4fbe-4aae-bbf7-0946d6ada066"]
    assert result.query_params["br_av"] == ["8"]
    assert result.query_params["group"] == ["simulations"]
    assert result.query_params["view"] == ["flat"]
    assert result.query_params["circuit__scale"] == ["small"]

    url = "https://example.com/app/virtual-lab/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e/paired-neuron-circuit-simulation?br_id=4642cddb-4fbe-4aae-bbf7-0946d6ada066&br_av=8&group=simulations&view=flat"

    result = extract_frontend_context(url)

    assert result.raw_path == "paired-neuron-circuit-simulation"
    assert result.observed_entity_type == "simulation-campaign"
    assert result.current_entity_id is None
    assert result.query_params["br_id"] == ["4642cddb-4fbe-4aae-bbf7-0946d6ada066"]
    assert result.query_params["br_av"] == ["8"]
    assert result.query_params["group"] == ["simulations"]
    assert result.query_params["view"] == ["flat"]
    assert result.query_params["circuit__scale"] == ["pair"]
