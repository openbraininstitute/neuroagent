"""Tests for the Navigate tool."""

from unittest.mock import Mock
from uuid import uuid4

import pytest

from neuroagent.tools.navigate import (
    NavigateInput,
    NavigateMetadata,
    NavigateOutput,
    NavigateTool,
)
from tests.mock_client import MockOpenAIClient, create_mock_response

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

BASE_URL = "https://bbp.epfl.ch"
VLAB_ID = str(uuid4())
PROJECT_ID = str(uuid4())
FRONTEND_URL = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}/home"
PREFIX = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}"


def _mock_openai_client(returned_url: str) -> MockOpenAIClient:
    """Create a MockOpenAIClient that returns the given URL from chat.completions.create."""
    client = MockOpenAIClient()
    response = create_mock_response({"role": "assistant", "content": returned_url})
    response.usage = Mock(
        prompt_tokens=10,
        completion_tokens=5,
        prompt_tokens_details=None,
        completion_tokens_details=None,
    )
    client.set_response(response)
    return client


def _make_tool(description: str, openai_url: str = f"{PREFIX}/data") -> NavigateTool:
    """Create a NavigateTool with a mocked OpenAI client."""
    return NavigateTool(
        metadata=NavigateMetadata(
            current_frontend_url=FRONTEND_URL,
            openai_client=_mock_openai_client(openai_url),
        ),
        input_schema=NavigateInput(description=description),
    )


# ---------------------------------------------------------------------------
# _extract_base_url parsing
# ---------------------------------------------------------------------------


class TestExtractBaseUrl:
    """Tests for _extract_base_url."""

    def test_standard_project_url(self):
        tool = _make_tool("home")
        assert tool._extract_base_url() == PREFIX

    def test_deep_path_after_project(self):
        url = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}/data/browse/entity/memodel"
        tool = NavigateTool(
            metadata=NavigateMetadata(
                current_frontend_url=url,
                openai_client=_mock_openai_client("x"),
            ),
            input_schema=NavigateInput(description="home"),
        )
        assert tool._extract_base_url() == PREFIX

    def test_trailing_slash(self):
        url = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}/"
        tool = NavigateTool(
            metadata=NavigateMetadata(
                current_frontend_url=url,
                openai_client=_mock_openai_client("x"),
            ),
            input_schema=NavigateInput(description="home"),
        )
        assert tool._extract_base_url() == PREFIX

    def test_non_virtual_lab_url_returns_host(self):
        url = f"{BASE_URL}/app/something-else/x/y"
        tool = NavigateTool(
            metadata=NavigateMetadata(
                current_frontend_url=url,
                openai_client=_mock_openai_client("x"),
            ),
            input_schema=NavigateInput(description="home"),
        )
        assert tool._extract_base_url() == BASE_URL

    def test_too_few_segments_returns_host(self):
        url = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}"
        tool = NavigateTool(
            metadata=NavigateMetadata(
                current_frontend_url=url,
                openai_client=_mock_openai_client("x"),
            ),
            input_schema=NavigateInput(description="home"),
        )
        assert tool._extract_base_url() == BASE_URL


# ---------------------------------------------------------------------------
# arun — LLM call and URL extraction
# ---------------------------------------------------------------------------


class TestArun:
    """Tests for the arun method with mocked OpenAI."""

    @pytest.mark.asyncio
    async def test_returns_llm_url(self):
        expected = f"{PREFIX}/data/browse/entity/memodel?scope=project"
        tool = _make_tool("browse memodels in project scope", openai_url=expected)
        result = await tool.arun()
        assert str(result.url) == expected

    @pytest.mark.asyncio
    async def test_strips_markdown_backticks(self):
        raw = f"`{PREFIX}/team`"
        tool = _make_tool("team page", openai_url=raw)
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/team"

    @pytest.mark.asyncio
    async def test_strips_quotes(self):
        raw = f'"{PREFIX}/credits"'
        tool = _make_tool("credits page", openai_url=raw)
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/credits"

    @pytest.mark.asyncio
    async def test_llm_called_with_correct_messages(self):
        tool = _make_tool("the project home page")
        await tool.arun()

        call_kwargs = tool.metadata.openai_client.chat.completions.create.call_args
        messages = call_kwargs.kwargs["messages"]
        assert messages[0]["role"] == "system"
        assert PREFIX in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "the project home page"

    @pytest.mark.asyncio
    async def test_token_consumption_tracked(self):
        tool = _make_tool("home", openai_url=PREFIX)
        assert tool.metadata.token_consumption is None
        await tool.arun()
        assert tool.metadata.token_consumption is not None
        assert "model" in tool.metadata.token_consumption


# ---------------------------------------------------------------------------
# Input / Output models
# ---------------------------------------------------------------------------


class TestModels:
    def test_input_requires_description(self):
        inp = NavigateInput(description="go to the data page")
        assert inp.description == "go to the data page"

    def test_output_valid_url(self):
        out = NavigateOutput(url="https://example.com/page")
        assert str(out.url) == "https://example.com/page"

    def test_output_invalid_url_rejected(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            NavigateOutput(url="not-a-url")


# ---------------------------------------------------------------------------
# is_online
# ---------------------------------------------------------------------------


class TestIsOnline:
    @pytest.mark.asyncio
    async def test_always_online(self):
        assert await NavigateTool.is_online() is True
