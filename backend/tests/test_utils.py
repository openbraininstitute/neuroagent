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


@pytest.mark.asyncio
async def test_messages_to_openai_content():
    from neuroagent.utils import messages_to_openai_content

    # Create mock messages with parts
    mock_part1 = Mock()
    mock_part1.output = {"role": "user", "content": "Hello"}

    mock_part2 = Mock()
    mock_part2.output = {"role": "assistant", "content": "Hi there"}

    mock_message1 = Mock()
    mock_message1.parts = [mock_part1]

    mock_message2 = Mock()
    mock_message2.parts = [mock_part2]

    db_messages = [mock_message1, mock_message2]

    result = await messages_to_openai_content(db_messages)

    assert len(result) == 2
    assert result[0] == {"role": "user", "content": "Hello"}
    assert result[1] == {"role": "assistant", "content": "Hi there"}


def test_get_token_count():
    from unittest.mock import Mock

    from neuroagent.utils import get_token_count

    # Test with usage data
    mock_usage = Mock()
    mock_usage.input_tokens = 100
    mock_usage.output_tokens = 50
    mock_usage.input_tokens_details = Mock()
    mock_usage.input_tokens_details.cached_tokens = 20

    result = get_token_count(mock_usage)

    assert result["input_cached"] == 20
    assert result["input_noncached"] == 80
    assert result["completion"] == 50

    # Test with None
    result_none = get_token_count(None)
    assert result_none == {
        "input_cached": None,
        "input_noncached": None,
        "completion": None,
    }


def test_append_part():
    from unittest.mock import Mock

    from neuroagent.app.database.sql_schemas import PartType
    from neuroagent.utils import append_part

    mock_message = Mock()
    mock_message.message_id = "msg-123"
    mock_message.parts = []

    mock_openai_part = Mock()
    mock_openai_part.model_dump.return_value = {"type": "message", "content": "test"}

    history = []

    append_part(
        mock_message, history, mock_openai_part, PartType.MESSAGE, is_complete=True
    )

    assert len(mock_message.parts) == 1
    assert len(history) == 1
    assert history[0] == {"type": "message", "content": "test"}


def test_get_main_LLM_token_consumption():
    from unittest.mock import Mock

    from neuroagent.app.database.sql_schemas import Task
    from neuroagent.utils import get_main_LLM_token_consumption

    mock_usage = Mock()
    mock_usage.input_tokens = 150
    mock_usage.output_tokens = 75
    mock_details = Mock()
    mock_details.cached_tokens = 30
    mock_usage.input_tokens_details = mock_details

    result = get_main_LLM_token_consumption(mock_usage, "gpt-4", Task.CHAT_COMPLETION)

    assert len(result) == 3
    assert all(tc.model == "gpt-4" for tc in result)
    assert all(tc.task == Task.CHAT_COMPLETION for tc in result)

    # Test with None
    result_none = get_main_LLM_token_consumption(None, "gpt-4", Task.CHAT_COMPLETION)
    assert result_none == []


def test_get_tool_token_consumption():
    from unittest.mock import Mock

    from neuroagent.app.database.sql_schemas import Task
    from neuroagent.utils import get_tool_token_consumption

    mock_tool_response = Mock()
    mock_tool_response.call_id = "call-123"

    context_variables = {
        "usage_dict": {
            "call-123": {
                "model": "gpt-4",
                "input_cached": 10,
                "input_noncached": 50,
                "completion": 25,
            }
        }
    }

    result = get_tool_token_consumption(mock_tool_response, context_variables)

    assert len(result) == 3
    assert all(tc.task == Task.CALL_WITHIN_TOOL for tc in result)
    assert all(tc.model == "gpt-4" for tc in result)

    # Test with missing call_id
    context_empty = {"usage_dict": {}}
    result_empty = get_tool_token_consumption(mock_tool_response, context_empty)
    assert result_empty == []


def test_get_previous_hil_metadata():
    from unittest.mock import Mock

    from neuroagent.app.database.sql_schemas import PartType
    from neuroagent.utils import get_previous_hil_metadata

    mock_message = Mock()

    mock_part1 = Mock()
    mock_part1.type = PartType.FUNCTION_CALL
    mock_part1.output = {"name": "tool1", "id": "call-1"}
    mock_part1.validated = True
    mock_part1.is_complete = True

    mock_part2 = Mock()
    mock_part2.type = PartType.MESSAGE

    mock_message.parts = [mock_part1, mock_part2]

    mock_tool = Mock()
    mock_tool.hil = True
    tool_map = {"tool1": mock_tool}

    result = get_previous_hil_metadata(mock_message, tool_map)

    assert len(result) == 1
    assert result[0]["toolCallId"] == "call-1"
    assert result[0]["validated"] == "accepted"
    assert result[0]["isComplete"] is True
