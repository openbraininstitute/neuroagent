"""Test utility functions."""

import json
from pathlib import Path
from unittest.mock import Mock, call

import pytest
from httpx import AsyncClient

from neuroagent.schemas import KGMetadata
from neuroagent.utils import (
    RegionMeta,
    complete_partial_json,
    delete_from_storage,
    get_descendants_id,
    get_descendants_id_s3,
    get_kg_data,
    is_lnmc,
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


@pytest.mark.parametrize(
    "brain_region_id,expected_descendants",
    [
        ("brain-region-id/68", {"brain-region-id/68"}),
        (
            "another-brain-region-id/985",
            {
                "another-brain-region-id/320",
                "another-brain-region-id/648",
                "another-brain-region-id/844",
                "another-brain-region-id/882",
                "another-brain-region-id/943",
                "another-brain-region-id/985",
                "another-brain-region-id/3718675619",
                "another-brain-region-id/1758306548",
            },
        ),
        (
            "another-brain-region-id/369",
            {
                "another-brain-region-id/450",
                "another-brain-region-id/369",
                "another-brain-region-id/1026",
                "another-brain-region-id/854",
                "another-brain-region-id/577",
                "another-brain-region-id/625",
                "another-brain-region-id/945",
                "another-brain-region-id/1890964946",
                "another-brain-region-id/3693772975",
            },
        ),
        (
            "another-brain-region-id/178",
            {
                "another-brain-region-id/316",
                "another-brain-region-id/178",
                "another-brain-region-id/300",
                "another-brain-region-id/1043765183",
            },
        ),
        ("brain-region-id/not-a-int", {"brain-region-id/not-a-int"}),
    ],
)
def test_get_descendants(brain_region_id, expected_descendants, brain_region_json_path):
    descendants = get_descendants_id(brain_region_id, json_path=brain_region_json_path)
    assert expected_descendants == descendants


def test_get_descendants_errors(brain_region_json_path):
    brain_region_id = "does-not-exits/1111111111"
    with pytest.raises(KeyError):
        get_descendants_id(brain_region_id, json_path=brain_region_json_path)


def test_RegionMeta_from_KG_dict():
    with open(
        Path(__file__).parent / "data" / "KG_brain_regions_hierarchy_test.json"
    ) as fh:
        KG_hierarchy = json.load(fh)

    RegionMeta_test = RegionMeta.from_KG_dict(KG_hierarchy)

    # check names.
    assert RegionMeta_test.name_[1] == "Tuberomammillary nucleus, ventral part"
    assert (
        RegionMeta_test.name_[2]
        == "Superior colliculus, motor related, intermediate gray layer"
    )
    assert RegionMeta_test.name_[3] == "Primary Motor Cortex"

    # check parents / childrens.
    assert RegionMeta_test.parent_id[1] == 2
    assert RegionMeta_test.parent_id[2] == 0
    assert RegionMeta_test.parent_id[3] == 2
    assert RegionMeta_test.children_ids[1] == []
    assert RegionMeta_test.children_ids[2] == [1, 3]
    assert RegionMeta_test.children_ids[3] == []


def test_RegionMeta_save_load(tmp_path: Path):
    # load fake file from KG
    with open(
        Path(__file__).parent / "data" / "KG_brain_regions_hierarchy_test.json"
    ) as fh:
        KG_hierarchy = json.load(fh)

    RegionMeta_test = RegionMeta.from_KG_dict(KG_hierarchy)

    # save / load file.
    json_file = tmp_path / "test.json"
    RegionMeta_test.save_config(json_file)
    RegionMeta_test.load_config(json_file)

    # check names.
    assert RegionMeta_test.name_[1] == "Tuberomammillary nucleus, ventral part"
    assert (
        RegionMeta_test.name_[2]
        == "Superior colliculus, motor related, intermediate gray layer"
    )
    assert RegionMeta_test.name_[3] == "Primary Motor Cortex"

    # check parents / childrens.
    assert RegionMeta_test.parent_id[1] == 2
    assert RegionMeta_test.parent_id[2] == 0
    assert RegionMeta_test.parent_id[3] == 2
    assert RegionMeta_test.children_ids[1] == []
    assert RegionMeta_test.children_ids[2] == [1, 3]
    assert RegionMeta_test.children_ids[3] == []


def test_RegionMeta_load_real_file(brain_region_json_path):
    RegionMeta_test = RegionMeta.load_config(brain_region_json_path)

    # check root.
    assert RegionMeta_test.root_id == 997
    assert RegionMeta_test.parent_id[997] == 0

    # check some names / st_levels.
    assert RegionMeta_test.name_[123] == "Koelliker-Fuse subnucleus"
    assert RegionMeta_test.name_[78] == "middle cerebellar peduncle"
    assert RegionMeta_test.st_level[55] == 10

    # check some random parents / childrens.
    assert RegionMeta_test.parent_id[12] == 165
    assert RegionMeta_test.parent_id[78] == 752
    assert RegionMeta_test.parent_id[700] == 88
    assert RegionMeta_test.parent_id[900] == 840
    assert RegionMeta_test.children_ids[12] == []
    assert RegionMeta_test.children_ids[23] == []
    assert RegionMeta_test.children_ids[670] == [2260827822, 3562104832]
    assert RegionMeta_test.children_ids[31] == [1053, 179, 227, 39, 48, 572, 739]


@pytest.mark.asyncio
async def test_get_kg_data_errors(httpx_mock):
    url = "http://fake_url"
    token = "fake_token"
    client = AsyncClient()

    # First failure: invalid object_id
    with pytest.raises(ValueError) as invalid_object_id:
        await get_kg_data(
            object_id="invalid_object_id",
            httpx_client=client,
            url=url,
            token=token,
            preferred_format="preferred_format",
        )

    assert (
        invalid_object_id.value.args[0]
        == "The provided ID (invalid_object_id) is not valid."
    )

    # Second failure: Number of hits = 0
    httpx_mock.add_response(url=url, json={"hits": {"hits": []}})

    with pytest.raises(ValueError) as no_hits:
        await get_kg_data(
            object_id="https://object-id",
            httpx_client=client,
            url=url,
            token=token,
            preferred_format="preferred_format",
        )

    assert (
        no_hits.value.args[0]
        == "We did not find the object https://object-id you are asking"
    )

    # Third failure: Wrong object id
    httpx_mock.add_response(
        url=url, json={"hits": {"hits": [{"_source": {"@id": "wrong-object-id"}}]}}
    )

    with pytest.raises(ValueError) as wrong_object_id:
        await get_kg_data(
            object_id="https://object-id",
            httpx_client=client,
            url=url,
            token=token,
            preferred_format="preferred_format",
        )

    assert (
        wrong_object_id.value.args[0]
        == "We did not find the object https://object-id you are asking"
    )


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_kg_data(httpx_mock):
    url = "http://fake_url"
    token = "fake_token"
    client = AsyncClient()
    preferred_format = "txt"
    object_id = "https://object-id"

    response_json = {
        "hits": {
            "hits": [
                {
                    "_source": {
                        "@id": object_id,
                        "distribution": [
                            {
                                "encodingFormat": f"application/{preferred_format}",
                                "contentUrl": "http://content-url-txt",
                            }
                        ],
                        "contributors": [
                            {
                                "@id": "https://www.grid.ac/institutes/grid.5333.6",
                            }
                        ],
                        "brainRegion": {
                            "@id": "http://api.brain-map.org/api/v2/data/Structure/252",
                            "idLabel": (
                                "http://api.brain-map.org/api/v2/data/Structure/252|Dorsal"
                                " auditory area, layer 5"
                            ),
                            "identifier": (
                                "http://api.brain-map.org/api/v2/data/Structure/252"
                            ),
                            "label": "Dorsal auditory area, layer 5",
                        },
                    }
                }
            ]
        }
    }
    httpx_mock.add_response(
        url=url,
        json=response_json,
    )

    httpx_mock.add_response(
        url="http://content-url-txt",
        content=b"this is the txt content",
    )

    # Response with preferred format
    object_content, metadata = await get_kg_data(
        object_id="https://object-id",
        httpx_client=client,
        url=url,
        token=token,
        preferred_format=preferred_format,
    )

    assert isinstance(object_content, bytes)
    assert isinstance(metadata, KGMetadata)
    assert metadata.file_extension == "txt"
    assert metadata.is_lnmc is True

    # Response without preferred format
    object_content, reader = await get_kg_data(
        object_id="https://object-id",
        httpx_client=client,
        url=url,
        token=token,
        preferred_format="no_preferred_format_available",
    )

    assert isinstance(object_content, bytes)
    assert isinstance(metadata, KGMetadata)
    assert metadata.file_extension == "txt"
    assert metadata.is_lnmc is True


@pytest.mark.parametrize(
    "contributors,expected_bool",
    [
        (
            [
                {
                    "@id": "https://www.grid.ac/institutes/grid.5333.6",
                    "@type": ["http://schema.org/Organization"],
                    "label": "École Polytechnique Fédérale de Lausanne",
                }
            ],
            True,
        ),
        (
            [
                {
                    "@id": "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/gevaert",
                    "@type": ["http://schema.org/Person"],
                    "affiliation": "École Polytechnique Fédérale de Lausanne",
                }
            ],
            True,
        ),
        (
            [
                {},
                {
                    "@id": "https://bbp.epfl.ch/nexus/v1/realms/bbp/users/kanari",
                    "@type": ["http://schema.org/Person"],
                    "affiliation": "École Polytechnique Fédérale de Lausanne",
                },
            ],
            True,
        ),
        (
            [
                {
                    "@id": "wrong-id",
                    "@type": ["http://schema.org/Person"],
                    "affiliation": "Another school",
                }
            ],
            False,
        ),
    ],
)
def test_is_lnmc(contributors, expected_bool):
    assert is_lnmc(contributors) is expected_bool


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


@pytest.mark.parametrize(
    "brain_region_id,expected_descendants",
    [
        ("brain-region-id/68", {"brain-region-id/68"}),
        (
            "another-brain-region-id/985",
            {
                "another-brain-region-id/320",
                "another-brain-region-id/648",
                "another-brain-region-id/844",
                "another-brain-region-id/882",
                "another-brain-region-id/943",
                "another-brain-region-id/985",
                "another-brain-region-id/3718675619",
                "another-brain-region-id/1758306548",
            },
        ),
        (
            "another-brain-region-id/369",
            {
                "another-brain-region-id/450",
                "another-brain-region-id/369",
                "another-brain-region-id/1026",
                "another-brain-region-id/854",
                "another-brain-region-id/577",
                "another-brain-region-id/625",
                "another-brain-region-id/945",
                "another-brain-region-id/1890964946",
                "another-brain-region-id/3693772975",
            },
        ),
        (
            "another-brain-region-id/178",
            {
                "another-brain-region-id/316",
                "another-brain-region-id/178",
                "another-brain-region-id/300",
                "another-brain-region-id/1043765183",
            },
        ),
        ("brain-region-id/not-a-int", {"brain-region-id/not-a-int"}),
    ],
)
def test_get_descendants_s3(
    brain_region_id, expected_descendants, brain_region_json_path
):
    # Setup mock s3 client
    mock_s3 = Mock()

    # Mock the get_object response using the actual file content
    with open(brain_region_json_path) as f:
        brain_region_dict = json.load(f)

    # Create a mock response object with a Body that can be loaded as JSON
    class MockStreamingBody:
        def read(self):
            return json.dumps(brain_region_dict).encode()

    s3_response = {"Body": MockStreamingBody()}

    mock_s3.get_object.return_value = s3_response

    descendants = get_descendants_id_s3(
        brain_region_id=brain_region_id,
        s3_client=mock_s3,
        bucket_name="test-bucket",
        key="test-key",
    )

    assert expected_descendants == descendants

    if brain_region_id == "brain-region-id/not-a-int":
        mock_s3.get_object.assert_not_called()
    else:
        mock_s3.get_object.assert_called_once_with(Bucket="test-bucket", Key="test-key")


def test_get_descendants_s3_errors():
    # Setup mock s3 client
    mock_s3 = Mock()

    # Test case: S3 client raises an exception
    mock_s3.get_object.side_effect = Exception("S3 error")

    brain_region_id = "brain-region-id/123"
    descendants = get_descendants_id_s3(
        brain_region_id=brain_region_id,
        s3_client=mock_s3,
        bucket_name="test-bucket",
        key="test-key",
    )

    # Should return just the input ID when there's an error
    assert descendants == {brain_region_id}
    mock_s3.get_object.assert_called_once_with(Bucket="test-bucket", Key="test-key")
