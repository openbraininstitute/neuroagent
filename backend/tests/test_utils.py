"""Test utility functions."""

import json
from unittest.mock import Mock, call

import pytest

from neuroagent.utils import (
    complete_partial_json,
    convert_to_responses_api_format,
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


def test_convert_to_responses_api_format_general():
    """
    One comprehensive test that covers:
     - user messages
     - assistant messages with reasoning, content, and tool_calls
     - tool role entries producing function_call_output
     - assistant entry with empty content but with reasoning and tool_calls
     - ordering preservation
    """
    db_messages = [
        {"role": "user", "content": "Hello"},
        {
            "role": "assistant",
            "content": "Assistant answer",
            "encrypted_reasoning": "enc1",
            "reasoning": ["r1", "r2"],
            "tool_calls": [
                {"id": "tc1", "function": {"name": "search", "arguments": '{"q":"x"}'}},
                {"id": "tc2", "function": {"name": "calc", "arguments": '{"n":2}'}},
            ],
        },
        {"role": "tool", "tool_call_id": "tc1", "content": "search results"},
        {
            "role": "assistant",
            "content": "",  # empty -> no assistant message, but reasoning + tool_calls still included
            "encrypted_reasoning": "enc2",
            "reasoning": ["only"],
            "tool_calls": [
                {"id": "tc3", "function": {"name": "format", "arguments": "{}"}}
            ],
        },
        {"role": "tool", "tool_call_id": "tc3", "content": "formatted"},
        {"role": "user", "content": "Thanks"},
    ]

    out = convert_to_responses_api_format(
        db_messages, send_reasoning=True, send_tool_output=True
    )

    expected = [
        # user "Hello"
        {
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [{"type": "input_text", "text": "Hello"}],
        },
        # assistant reasoning (enc1)
        {
            "type": "reasoning",
            "encrypted_content": "enc1",
            "summary": [
                {"type": "summary_text", "text": "r1"},
                {"type": "summary_text", "text": "r2"},
            ],
            "content": [],
        },
        # assistant message (content)
        {
            "type": "message",
            "status": "completed",
            "role": "assistant",
            "content": [{"type": "output_text", "text": "Assistant answer"}],
        },
        # function_call entries from first assistant
        {
            "type": "function_call",
            "call_id": "tc1",
            "name": "search",
            "arguments": '{"q":"x"}',
            "status": "completed",
        },
        {
            "type": "function_call",
            "call_id": "tc2",
            "name": "calc",
            "arguments": '{"n":2}',
            "status": "completed",
        },
        # tool role corresponding to tc1 -> function_call_output
        {
            "type": "function_call_output",
            "call_id": "tc1",
            "output": "search results",
            "status": "completed",
        },
        # assistant reasoning (enc2) with empty content
        {
            "type": "reasoning",
            "encrypted_content": "enc2",
            "summary": [{"type": "summary_text", "text": "only"}],
            "content": [],
        },
        # function_call from second assistant (tc3)
        {
            "type": "function_call",
            "call_id": "tc3",
            "name": "format",
            "arguments": "{}",
            "status": "completed",
        },
        # tool role corresponding to tc3 -> function_call_output
        {
            "type": "function_call_output",
            "call_id": "tc3",
            "output": "formatted",
            "status": "completed",
        },
        # final user "Thanks"
        {
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [{"type": "input_text", "text": "Thanks"}],
        },
    ]

    assert out == expected
