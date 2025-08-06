"""Tests for the OBI Expert tool."""

from neuroagent.tools.obi_expert import Page, flatten_portable_text


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


def test_page_sanity_document_instantiation():
    """Test instantiating a Page sanity document using sanity_mapping."""
    raw_json = {
        "_createdAt": "2025-02-04T09:52:13Z",
        "_id": "8def50b3-5a70-43a3-bf14-093b16ebf0a5",
        "_rev": "OEMEHZu3FbATFxdPjDZroo",
        "_type": "pages",
        "_updatedAt": "2025-04-14T02:42:13Z",
        "content": [
            {"_key": "2e65f2354b45", "_type": "verticalDivider", "spacing": "large"},
            {"_key": "947af447957a", "_type": "section", "name": "supportEmailButton"},
            {"_key": "25318d5a1367", "_type": "verticalDivider", "spacing": "small"},
            {"_key": "de25f688aa2e", "_type": "section", "name": "infoEmailButton"},
        ],
        "headerImage": {
            "_type": "image",
            "asset": {
                "_ref": "image-04db78f572036247b4e9e3306a1d695834eac7e1-2414x1060-jpg",
                "_type": "reference",
            },
        },
        "headerVideo": "https://player.vimeo.com/progressive_redirect/playback/1054051910/rendition/1080p/file.mp4?loc=external&log_user=0&signature=070bd29998265382ef18c98a492f96e62301edb61ff90d04acbdfcccf450b997",
        "introduction": "We're here to support your journey in neuroscience. Reach out for assistance, inquiries, or collaboration opportunities.",
        "isHome": False,
        "mediaType": "video",
        "ogImage": {
            "_type": "image",
            "asset": {
                "_ref": "image-ed2098c6832ea8faf1e4b5b8c4fff6fd86feac25-1200x630-jpg",
                "_type": "reference",
            },
        },
        "posterImage": {
            "_type": "image",
            "asset": {
                "_ref": "image-95d4a2d4e9400e54da912635e27706b841135931-1920x1080-jpg",
                "_type": "reference",
            },
        },
        "scrollCatcher": "Need Help? Get in Touch!",
        "seoKeywords": [
            "Contact",
            "Neuroscience",
            "Collaboration",
            "Support",
            "Brain",
            "Model",
            "Simulation",
            "Experiment",
        ],
        "seoTitle": "Open Brain Institute - Contact us to get information, collaborate or get your hands on the platform",
        "slug": {"_type": "slug", "current": "contact"},
        "title": "Contact",
    }

    # Map the raw JSON using sanity_mapping
    mapped_data = {}
    for pydantic_field, sanity_field in Page.sanity_mapping.items():
        if sanity_field in raw_json:
            mapped_data[pydantic_field] = raw_json[sanity_field]

    # Instantiate the Page document
    page_document = Page(**mapped_data)

    # Assert the mapped fields are correct
    assert page_document.id == "8def50b3-5a70-43a3-bf14-093b16ebf0a5"
    assert page_document.created_at == "2025-02-04T09:52:13Z"
    assert page_document.updated_at == "2025-04-14T02:42:13Z"
    assert page_document.title == "Contact"
    assert (
        page_document.introduction
        == "We're here to support your journey in neuroscience. Reach out for assistance, inquiries, or collaboration opportunities."
    )

    # Test that content is flattened to a string
    # The content should be flattened to extract text from section names
    expected_content = "supportEmailButton infoEmailButton"
    assert page_document.content == expected_content


def test_glossary_item_sanity_document_instantiation():
    """Test instantiating a GlossaryItemDocument sanity document using sanity_mapping."""
    from neuroagent.tools.obi_expert import GlossaryItemDocument

    # Raw JSON from Sanity
    raw_json = {
        "Data_Type": "Model ",
        "Description": "An ME-model, or morphoelectric model, is a combination of an E-model with relevant morphology. ME-models can be simulated using [BlueCellulab](https://github.com/openbraininstitute/BlueCelluLab) and can serve as essential elements in circuit building.",
        "Name": "ME-model",
        "New_suggested_name": "SimulatableNeuron ",
        "Scale": "Cellular",
        "Status": "Available",
        "_createdAt": "2025-06-11T13:50:35Z",
        "_id": "IYthF0bAW1gjnJ64ATi2TT",
        "_rev": "tffpUQMFomeQiuwnKu7XB1",
        "_type": "glossaryItem",
        "_updatedAt": "2025-06-17T09:07:31Z",
        "definition": [
            {
                "_key": "d37ae6820745",
                "_type": "block",
                "children": [
                    {
                        "_key": "e68040b2091b",
                        "_type": "span",
                        "marks": [],
                        "text": "An ME-model, or morphoelectric model, is a combination of an E-model with relevant morphology. ME-models can be simulated using ",
                    },
                    {
                        "_key": "84412d75fb68",
                        "_type": "span",
                        "marks": ["02cab47b2668"],
                        "text": "BlueCellulab",
                    },
                    {
                        "_key": "25cf18baafb1",
                        "_type": "span",
                        "marks": [],
                        "text": " and can serve as essential elements in circuit building.",
                    },
                ],
                "markDefs": [
                    {
                        "_key": "02cab47b2668",
                        "_type": "link",
                        "href": "https://github.com/openbraininstitute/BlueCelluLab",
                    }
                ],
                "style": "normal",
            }
        ],
    }

    # Map the raw JSON using sanity_mapping
    mapped_data = {}
    for pydantic_field, sanity_field in GlossaryItemDocument.sanity_mapping.items():
        if sanity_field in raw_json:
            mapped_data[pydantic_field] = raw_json[sanity_field]

    # Instantiate the GlossaryItemDocument
    glossary_document = GlossaryItemDocument(**mapped_data)

    # Assert the mapped fields are correct
    assert glossary_document.id == "IYthF0bAW1gjnJ64ATi2TT"
    assert glossary_document.created_at == "2025-06-11T13:50:35Z"
    assert glossary_document.updated_at == "2025-06-17T09:07:31Z"
    assert glossary_document.name == "ME-model"
    assert (
        glossary_document.description
        == "An ME-model, or morphoelectric model, is a combination of an E-model with relevant morphology. ME-models can be simulated using [BlueCellulab](https://github.com/openbraininstitute/BlueCelluLab) and can serve as essential elements in circuit building."
    )

    # Test that definition is flattened to a string
    # The definition should be flattened to extract text from portable text blocks
    expected_definition = "An ME-model, or morphoelectric model, is a combination of an E-model with relevant morphology. ME-models can be simulated using BlueCellulab and can serve as essential elements in circuit building."
    assert glossary_document.definition == expected_definition
