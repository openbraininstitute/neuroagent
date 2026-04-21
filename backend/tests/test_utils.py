"""Test utility functions."""

import json
from unittest.mock import Mock, call

import pytest

from neuroagent.utils import (
    complete_partial_json,
    delete_from_storage,
    extract_frontend_context,
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


VLAB_ID = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
PROJECT_ID = "b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e"
ENTITY_ID = "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f"
BASE = f"https://example.com/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}"


class TestExtractFrontendContextRouteMatching:
    """Test that URLs are matched to the correct sitemap route."""

    def test_project_home(self):
        result = extract_frontend_context(BASE)
        assert "project home page" in result.route_description.lower()
        assert result.path_params == []

    def test_team_page(self):
        result = extract_frontend_context(f"{BASE}/team")
        assert "team" in result.route_description.lower()

    def test_credits_page(self):
        result = extract_frontend_context(f"{BASE}/credits")
        assert "credit" in result.route_description.lower()

    def test_help_page(self):
        result = extract_frontend_context(f"{BASE}/help")
        assert "help" in result.route_description.lower()

    def test_data_landing(self):
        result = extract_frontend_context(f"{BASE}/data")
        assert "data" in result.route_description.lower()

    def test_workflows_landing(self):
        result = extract_frontend_context(f"{BASE}/workflows")
        assert "workflow" in result.route_description.lower()

    def test_reports_page(self):
        result = extract_frontend_context(f"{BASE}/reports")
        assert "report" in result.route_description.lower()


class TestExtractFrontendContextPathParams:
    """Test that path parameters are extracted with their descriptions."""

    def test_data_browse_entity_type(self):
        result = extract_frontend_context(f"{BASE}/data/browse/entity/memodel")
        assert any("memodel" == p.value for p in result.path_params)
        type_param = next(p for p in result.path_params if p.value == "memodel")
        assert type_param.name == "type"

    def test_data_detail_view(self):
        result = extract_frontend_context(
            f"{BASE}/data/view/emodel/{ENTITY_ID}/analysis"
        )
        assert any(ENTITY_ID == p.value for p in result.path_params)
        assert any("emodel" == p.value for p in result.path_params)
        assert any("analysis" == p.value for p in result.path_params)

    def test_notebooks_scope(self):
        result = extract_frontend_context(f"{BASE}/notebooks/public")
        assert any("public" == p.value for p in result.path_params)

    def test_simulate_configure_memodel(self):
        result = extract_frontend_context(
            f"{BASE}/workflows/simulate/configure/memodel/{ENTITY_ID}"
        )
        assert any(ENTITY_ID == p.value for p in result.path_params)

    def test_workflow_view_with_section(self):
        result = extract_frontend_context(
            f"{BASE}/workflows/view/single-neuron-simulation/{ENTITY_ID}/results"
        )
        assert any("results" == p.value for p in result.path_params)
        assert any(ENTITY_ID == p.value for p in result.path_params)
        assert any("single-neuron-simulation" == p.value for p in result.path_params)

    def test_obi_showcase_slug(self):
        result = extract_frontend_context(
            f"{BASE}/reports/obi-showcase/my-showcase-slug"
        )
        assert any("my-showcase-slug" == p.value for p in result.path_params)

    def test_extract_configure_circuit(self):
        result = extract_frontend_context(
            f"{BASE}/workflows/extract/configure/circuit/{ENTITY_ID}"
        )
        assert any(ENTITY_ID == p.value for p in result.path_params)


class TestExtractFrontendContextSearchParams:
    """Test that search parameters are extracted with their descriptions."""

    def test_data_landing_with_group_and_scope(self):
        result = extract_frontend_context(f"{BASE}/data?group=models&scope=project")
        assert any("models" == p.value for p in result.search_params)
        assert any("project" == p.value for p in result.search_params)

    def test_data_landing_with_brain_region(self):
        br_id = "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a"
        result = extract_frontend_context(f"{BASE}/data?br_id={br_id}&br_av=567")
        assert any(br_id == p.value for p in result.search_params)
        assert any("567" == p.value for p in result.search_params)

    def test_help_with_section_and_scale(self):
        result = extract_frontend_context(
            f"{BASE}/help?section=features&scale=cellular"
        )
        assert any("features" == p.value for p in result.search_params)
        assert any("cellular" == p.value for p in result.search_params)

    def test_browse_entity_with_scope(self):
        result = extract_frontend_context(
            f"{BASE}/data/browse/entity/cell-morphology?scope=project"
        )
        assert any("project" == p.value for p in result.search_params)

    def test_simulate_configure_with_session_and_panel(self):
        session = "abc-123"
        result = extract_frontend_context(
            f"{BASE}/workflows/simulate/configure/circuit/{ENTITY_ID}"
            f"?sessionId={session}&panel=results"
        )
        assert any(session == p.value for p in result.search_params)
        assert any("results" == p.value for p in result.search_params)

    def test_unknown_search_param_still_captured(self):
        result = extract_frontend_context(f"{BASE}/data?unknown_param=hello")
        assert any("hello" == p.value for p in result.search_params)

    def test_reports_section_param(self):
        result = extract_frontend_context(f"{BASE}/reports?section=summaries")
        assert any("summaries" == p.value for p in result.search_params)


class TestExtractFrontendContextNonProjectRoutes:
    """Test routes that are not under /app/virtual-lab/[vlabId]/[projectId]."""

    def test_public_landing(self):
        result = extract_frontend_context("https://example.com/")
        assert "landing" in result.route_description.lower()

    def test_gallery(self):
        result = extract_frontend_context("https://example.com/gallery")
        assert "gallery" in result.route_description.lower()

    def test_login(self):
        result = extract_frontend_context("https://example.com/app/log-in")
        assert (
            "login" in result.route_description.lower()
            or "log" in result.route_description.lower()
        )

    def test_entity_shortcut(self):
        result = extract_frontend_context(f"https://example.com/app/entity/{ENTITY_ID}")
        assert any(ENTITY_ID == p.value for p in result.path_params)

    def test_documentation_home(self):
        result = extract_frontend_context("https://example.com/app/documentation")
        assert "documentation" in result.route_description.lower()

    def test_documentation_tutorial_slug(self):
        result = extract_frontend_context(
            "https://example.com/app/documentation/tutorials/my-tutorial"
        )
        assert any("my-tutorial" == p.value for p in result.path_params)


class TestExtractFrontendContextEdgeCases:
    """Edge cases and fallback behavior."""

    def test_unknown_route_returns_unknown(self):
        result = extract_frontend_context(
            "https://example.com/this/does/not/exist/at/all"
        )
        assert "unknown" in result.route_description.lower()
        assert result.path_params == []
        assert result.search_params == []

    def test_trailing_slash_still_matches(self):
        result = extract_frontend_context(f"{BASE}/team")
        assert "team" in result.route_description.lower()

    def test_empty_search_params(self):
        result = extract_frontend_context(f"{BASE}/credits")
        assert result.search_params == []

    def test_empty_path_params_for_static_route(self):
        result = extract_frontend_context("https://example.com/gallery")
        assert result.path_params == []

    def test_virtual_lab_sync(self):
        result = extract_frontend_context(
            "https://example.com/app/virtual-lab/sync?redirectUrl=/app/home"
        )
        assert (
            "sync" in result.route_description.lower()
            or "workspace" in result.route_description.lower()
        )
        assert any("/app/home" == p.value for p in result.search_params)
