"""Tests for the OBI Expert tool."""

from neuroagent.tools.obi_expert import flatten_portable_text


def test_flatten_portable_text():
    """Test flattening of portable text with nested structures."""
    # Test input with various nested structures
    portable_text = [
        {"_type": "titleHeadline", "title": "Data Privacy"},
        {
            "_type": "richContent",
            "content": [
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
            ],
        },
        {
            "_type": "bulletList",
            "content": [
                {
                    "_type": "bulletPoint",
                    "content": "First bullet point content",
                    "title": "Point 1",
                },
                {
                    "_type": "bulletPoint",
                    "content": "Second bullet point content",
                    "title": "Point 2",
                },
            ],
        },
    ]

    expected_output = (
        "The data privacy is governed by the Privacy Policy. https://example.org/privacy\n\n"
        "By accepting these Terms, you agree to the policy.\n\n"
        "First bullet point content\n\n"
        "Second bullet point content"
    )

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

    expected_output = "This is a single block test."
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


def test_flatten_portable_text_deep_nesting():
    """Test flattening of deeply nested portable text structures."""
    deeply_nested_text = [
        {
            "_type": "section",
            "content": {
                "_type": "richContent",
                "content": [
                    {
                        "_type": "nestedSection",
                        "content": [
                            {
                                "_type": "block",
                                "children": [
                                    {
                                        "_type": "span",
                                        "text": "This is deeply nested text. ",
                                        "marks": [],
                                    }
                                ],
                            },
                            {
                                "_type": "bulletList",
                                "content": [
                                    {
                                        "_type": "bulletPoint",
                                        "content": {
                                            "_type": "block",
                                            "children": [
                                                {
                                                    "_type": "span",
                                                    "text": "Nested bullet point with ",
                                                    "marks": [],
                                                },
                                                {
                                                    "_type": "span",
                                                    "text": "formatted text",
                                                    "marks": ["strong"],
                                                },
                                            ],
                                        },
                                    }
                                ],
                            },
                        ],
                    }
                ],
            },
        }
    ]

    expected_output = (
        "This is deeply nested text. \n\nNested bullet point with formatted text"
    )

    result = flatten_portable_text(deeply_nested_text)
    assert result == expected_output
