"""Test utility functions."""

import json
import uuid
from unittest.mock import MagicMock

import pytest

from neuroagent.storage.base_storage import StorageClient
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


class TestSaveToStorage:
    """Test suite for save_to_storage function."""

    @pytest.fixture
    def mock_storage_client(self):
        """Create a mock StorageClient."""
        return MagicMock(spec=StorageClient)

    @pytest.fixture
    def user_id(self):
        """Generate a test user ID."""
        return uuid.UUID("12345678-1234-5678-1234-567812345678")

    @pytest.fixture
    def thread_id(self):
        """Generate a test thread ID."""
        return uuid.UUID("87654321-4321-8765-4321-876543218765")

    def test_save_to_storage(self, mock_storage_client, user_id, thread_id):
        """Test saving content with all parameters including thread_id."""
        container = "test-bucket"
        content_type = "image/png"
        category = "json-barplot"
        body = b"fake image bytes"

        result = save_to_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            content_type=content_type,
            category=category,
            body=body,
            thread_id=thread_id,
        )

        # Verify a UUID was returned
        assert isinstance(uuid.UUID(result), uuid.UUID)

        # Verify put_object was called
        mock_storage_client.put_object.assert_called_once()
        call_kwargs = mock_storage_client.put_object.call_args.kwargs

        # Check parameters
        assert call_kwargs["container"] == container
        assert call_kwargs["key"] == f"{user_id}/{result}"
        assert call_kwargs["body"] == body
        assert call_kwargs["content_type"] == content_type
        assert call_kwargs["metadata"]["category"] == str(category)
        assert call_kwargs["metadata"]["thread_id"] == str(thread_id)

    def test_save_to_storage_without_thread_id(self, mock_storage_client, user_id):
        """Test saving content without thread_id."""
        container = "test-bucket"
        content_type = "application/json"
        category = "json-barplot"
        body = b'{"data": "value"}'

        result = save_to_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            content_type=content_type,
            category=category,
            body=body,
            thread_id=None,
        )

        # Verify a UUID was returned
        assert isinstance(uuid.UUID(result), uuid.UUID)

        # Verify metadata doesn't include thread_id
        call_kwargs = mock_storage_client.put_object.call_args.kwargs
        assert "thread_id" not in call_kwargs["metadata"]
        assert call_kwargs["metadata"]["category"] == str(category)

    def test_save_to_storage_with_string_body(self, mock_storage_client, user_id):
        """Test saving content with string body instead of bytes."""
        container = "test-bucket"
        content_type = "application/json"
        category = "json-barplot"
        body = '{"key": "value", "nested": {"data": 123}}'

        result = save_to_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            content_type=content_type,
            category=category,
            body=body,
        )

        # Verify a UUID was returned
        assert isinstance(uuid.UUID(result), uuid.UUID)

        # Verify string body was passed correctly
        call_kwargs = mock_storage_client.put_object.call_args.kwargs
        assert call_kwargs["body"] == body
        assert isinstance(call_kwargs["body"], str)


class TestDeleteFromStorage:
    """Test suite for delete_from_storage function."""

    @pytest.fixture
    def mock_storage_client(self):
        """Create a mock StorageClient."""
        return MagicMock(spec=StorageClient)

    @pytest.fixture
    def user_id(self):
        """Generate a test user ID."""
        return uuid.UUID("12345678-1234-5678-1234-567812345678")

    @pytest.fixture
    def thread_id(self):
        """Generate a test thread ID."""
        return uuid.UUID("87654321-4321-8765-4321-876543218765")

    def test_delete_from_storage(self, mock_storage_client, user_id, thread_id):
        """Test deleting objects that match user_id and thread_id."""
        container = "test-bucket"

        # Mock list_objects to return some keys
        mock_storage_client.list_objects.return_value = [
            f"{user_id}/file1.txt",
            f"{user_id}/file2.json",
            f"{user_id}/file3.png",
        ]

        # Mock get_metadata to return matching thread_id for first two files
        def mock_get_metadata(container, key):
            if "file1" in key or "file2" in key:
                return {"thread_id": str(thread_id), "category": "image"}
            return {"thread_id": "different-thread-id", "category": "data"}

        mock_storage_client.get_metadata.side_effect = mock_get_metadata

        delete_from_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            thread_id=thread_id,
        )

        # Verify list_objects was called with correct prefix
        mock_storage_client.list_objects.assert_called_once_with(
            container=container, prefix=f"{user_id}/"
        )

        # Verify get_metadata was called for each file
        assert mock_storage_client.get_metadata.call_count == 3

        # Verify delete_object was called only for matching files
        assert mock_storage_client.delete_object.call_count == 2
        delete_calls = [
            call.kwargs["key"]
            for call in mock_storage_client.delete_object.call_args_list
        ]
        assert f"{user_id}/file1.txt" in delete_calls
        assert f"{user_id}/file2.json" in delete_calls
        assert f"{user_id}/file3.png" not in delete_calls

    def test_delete_from_storage_no_contents(
        self, mock_storage_client, user_id, thread_id
    ):
        """Test deleting when no objects exist for the user."""
        container = "test-bucket"

        # Mock list_objects to return empty list
        mock_storage_client.list_objects.return_value = []

        delete_from_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            thread_id=thread_id,
        )

        # Verify list_objects was called
        mock_storage_client.list_objects.assert_called_once()

        # Verify get_metadata was never called (no objects to check)
        mock_storage_client.get_metadata.assert_not_called()

        # Verify delete_object was never called
        mock_storage_client.delete_object.assert_not_called()

    def test_delete_from_storage_no_matching_thread_id(
        self, mock_storage_client, user_id, thread_id
    ):
        """Test deleting when objects exist but none match the thread_id."""
        container = "test-bucket"
        different_thread_id = uuid.uuid4()

        # Mock list_objects to return some keys
        mock_storage_client.list_objects.return_value = [
            f"{user_id}/file1.txt",
            f"{user_id}/file2.json",
        ]

        # Mock get_metadata to return different thread_id
        mock_storage_client.get_metadata.return_value = {
            "thread_id": str(different_thread_id),
            "category": "image",
        }

        delete_from_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            thread_id=thread_id,
        )

        # Verify get_metadata was called
        assert mock_storage_client.get_metadata.call_count == 2

        # Verify delete_object was never called (no matching thread_id)
        mock_storage_client.delete_object.assert_not_called()

    def test_delete_from_storage_large_batch(
        self, mock_storage_client, user_id, thread_id
    ):
        """Test deleting a large batch of objects."""
        container = "test-bucket"
        num_files = 100

        # Generate 100 file keys
        file_keys = [f"{user_id}/file{i}.txt" for i in range(num_files)]
        mock_storage_client.list_objects.return_value = file_keys

        # All files match the thread_id
        mock_storage_client.get_metadata.return_value = {
            "thread_id": str(thread_id),
            "category": "data",
        }

        delete_from_storage(
            storage_client=mock_storage_client,
            container_name=container,
            user_id=user_id,
            thread_id=thread_id,
        )

        # Verify get_metadata was called for each file
        assert mock_storage_client.get_metadata.call_count == num_files

        # Verify delete_object was called for each file
        assert mock_storage_client.delete_object.call_count == num_files

        # Verify all files were deleted
        deleted_keys = [
            call.kwargs["key"]
            for call in mock_storage_client.delete_object.call_args_list
        ]
        assert len(deleted_keys) == num_files
        assert set(deleted_keys) == set(file_keys)
