"""Tests for the OBI Expert tool."""

from neuroagent.tools.obi_expert import flatten_portable_text


def test_flatten_portable_text_simple_blocks():
    """Test flattening of simple portable text blocks."""
    # Test input with simple portable text blocks
    portable_text = [
        {
            "_type": "block",
            "children": [
                {
                    "_type": "span",
                    "text": "The data privacy is governed by the Privacy Policy. ",
                    "marks": [],
                },
                {
                    "_type": "span",
                    "text": "https://example.org/privacy",
                    "marks": ["link"],
                },
            ],
        },
        {
            "_type": "block",
            "children": [
                {
                    "_type": "span",
                    "text": "By accepting these Terms, you agree to the policy.",
                    "marks": [],
                }
            ],
        },
    ]

    expected_output = "The data privacy is governed by the Privacy Policy. https://example.org/privacyBy accepting these Terms, you agree to the policy."

    result = flatten_portable_text(portable_text)
    assert result == expected_output


def test_flatten_portable_text_single_block():
    """Test flattening of a single portable text block."""
    single_block = {
        "_type": "block",
        "children": [
            {"_type": "span", "text": "This is a single block test.", "marks": []}
        ],
    }

    # The function processes single blocks recursively but doesn't flatten them
    # It only flattens lists of blocks
    expected_output = {
        "_type": "block",
        "children": [
            {"_type": "span", "text": "This is a single block test.", "marks": []}
        ],
    }
    result = flatten_portable_text(single_block)
    assert result == expected_output


def test_flatten_portable_text_empty_blocks():
    """Test flattening of portable text with empty blocks."""
    empty_blocks = [
        {"_type": "block", "children": []},
        {"_type": "block", "children": [{"_type": "span", "text": "", "marks": []}]},
    ]

    result = flatten_portable_text(empty_blocks)
    assert result == ""


def test_flatten_portable_text_nested_structure():
    """Test flattening of nested structure with portable text blocks."""
    nested_structure = {
        "content": [
            {
                "_type": "block",
                "children": [
                    {
                        "_type": "span",
                        "text": "This is nested text. ",
                        "marks": [],
                    }
                ],
            },
            {
                "_type": "block",
                "children": [
                    {
                        "_type": "span",
                        "text": "More nested text.",
                        "marks": [],
                    }
                ],
            },
        ]
    }

    expected_output = {"content": "This is nested text. More nested text."}

    result = flatten_portable_text(nested_structure)
    assert result == expected_output


def test_flatten_portable_text_mixed_content():
    """Test flattening of mixed content with portable text blocks."""
    mixed_content = [
        {
            "_type": "block",
            "children": [
                {"_type": "span", "text": "First block content.", "marks": []}
            ],
        },
        {
            "_type": "block",
            "children": [
                {"_type": "span", "text": "Second block content.", "marks": []}
            ],
        },
        {
            "_type": "block",
            "children": [
                {"_type": "span", "text": "Third block content.", "marks": []}
            ],
        },
    ]

    expected_output = "First block content.Second block content.Third block content."

    result = flatten_portable_text(mixed_content)
    assert result == expected_output


def test_flatten_portable_text_non_block_content():
    """Test that non-block content is processed recursively but not flattened."""
    non_block_content = [
        {"_type": "titleHeadline", "title": "Some Title"},
        {
            "_type": "richContent",
            "content": [
                {
                    "_type": "block",
                    "children": [
                        {"_type": "span", "text": "Some content", "marks": []}
                    ],
                }
            ],
        },
    ]

    # The function should process recursively but not flatten non-block content
    result = flatten_portable_text(non_block_content)

    # Should return the same structure but with the block content flattened
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0] == {"_type": "titleHeadline", "title": "Some Title"}
    assert result[1]["_type"] == "richContent"
    assert result[1]["content"] == "Some content"


def test_flatten_portable_text_none_input():
    """Test handling of None input."""
    result = flatten_portable_text(None)
    assert result is None


def test_flatten_portable_text_string_input():
    """Test handling of string input."""
    result = flatten_portable_text("Just a string")
    assert result == "Just a string"


def test_flatten_portable_text_empty_list():
    """Test handling of empty list."""
    result = flatten_portable_text([])
    assert result == []
