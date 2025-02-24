"""Tests Literature Search tool."""

import json

import httpx
import pytest

from neuroagent.tools import LiteratureSearchTool
from neuroagent.tools.literature_search_tool import (
    LiteratureSearchInput,
    LiteratureSearchMetadata,
)


class TestLiteratureSearchTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock):
        url = "http://fake_url?query=covid+19&retriever_k=100&use_reranker=true&reranker_k=5"
        reranker_k = 5

        fake_response = [
            {
                "article_title": "Article title",
                "article_authors": ["Author1", "Author2"],
                "paragraph": "This is the paragraph",
                "section": "fake_section",
                "article_doi": "fake_doi",
                "journal_issn": "fake_journal_issn",
            }
            for _ in range(reranker_k)
        ]

        httpx_mock.add_response(
            url=url,
            json=fake_response,
        )

        tool = LiteratureSearchTool(
            input_schema=LiteratureSearchInput(query="covid 19"),
            metadata=LiteratureSearchMetadata(
                literature_search_url=url,
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                retriever_k=100,
                use_reranker=True,
                reranker_k=reranker_k,
            ),
        )
        response = await tool.arun()
        assert isinstance(response, str)
        response = json.loads(response)
        assert len(response) == reranker_k
        assert isinstance(response[0], dict)


class TestCreateQuery:
    tool = LiteratureSearchTool(
        input_schema=LiteratureSearchInput(query="covid 19"),
        metadata=LiteratureSearchMetadata(
            literature_search_url="https://fake_url.com",
            httpx_client=httpx.AsyncClient(),
            token="fake_token",
            retriever_k=100,
            use_reranker=False,
            reranker_k=1,
        ),
    )

    def test_create_query_all_values(self):
        result = self.tool.create_query(
            query="machine learning",
            article_types=["research", "review"],
            authors=["John Doe"],
            journals=["IEEE"],
            date_from="2020-01-01",
            date_to="2020-12-31",
            retriever_k=5,
            reranker_k=3,
            use_reranker=True,
        )
        expected = {
            "query": "machine learning",
            "article_types": ["research", "review"],
            "authors": ["John Doe"],
            "journals": ["IEEE"],
            "date_from": "2020-01-01",
            "date_to": "2020-12-31",
            "retriever_k": 5,
            "use_reranker": True,
            "reranker_k": 3,
        }
        assert result == expected

    def test_create_query_with_none(self):
        # Build a query where some parameters are None, which should be filtered out.
        result = self.tool.create_query(
            query="data science",
            article_types=None,
            authors=["Alice"],
            journals=None,
            date_from=None,
            date_to="2021-06-30",
            retriever_k=10,
            reranker_k=4,
            use_reranker=False,
        )
        expected = {
            "query": "data science",
            "authors": ["Alice"],
            "date_to": "2021-06-30",
            "retriever_k": 10,
            "use_reranker": False,
            "reranker_k": 4,
        }
        assert result == expected

    def test_create_query_empty_values(self):
        # Test where empty strings and empty lists (which are not None) are provided.
        result = self.tool.create_query(
            query="",
            article_types=[],
            authors=[],
            journals=[],
            date_from="",
            date_to="",
            retriever_k=0,
            reranker_k=0,
            use_reranker=False,
        )
        expected = {
            "query": "",
            "article_types": [],
            "authors": [],
            "journals": [],
            "date_from": "",
            "date_to": "",
            "retriever_k": 0,
            "use_reranker": False,
            "reranker_k": 0,
        }
        assert result == expected
