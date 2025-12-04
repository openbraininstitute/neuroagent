"""Test utility functions."""

import json
from unittest.mock import Mock, call

import pytest

from neuroagent.utils import (
    complete_partial_json,
    delete_from_storage,
    save_to_storage,
)


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
