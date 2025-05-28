"""Tests Literature Search tool."""

from typing import cast

import httpx
import pytest
from openai import AsyncOpenAI

from neuroagent.tools import LiteratureSearchTool
from neuroagent.tools.literature_search_tool import (
    ArticleOutput,
    ArticleSelection,
    LiteratureSearchInput,
    LiteratureSearchMetadata,
    LiteratureSearchToolOutput,
    ParagraphOutput,
)
from tests.mock_client import MockOpenAIClient, create_mock_response


class TestLiteratureSearchTool:
    @pytest.mark.asyncio
    async def test_arun(self, httpx_mock):
        url = "http://fake_url/retrieval/?query=covid+19&reranker_k=100"
        reranker_k = 5
        retriever_k = 100

        fake_response = [
            {
                "article_title": "great_title",
                "article_authors": ["author1", "author2"],
                "article_id": f"super_id_{i % 30}",
                "article_doi": "magnigficent_doi",
                "pubmed_id": "random_pubmed_id",
                "date": "02/02/2022",
                "article_type": "journal",
                "journal_issn": "123123",
                "journal_name": "wang",
                "cited_by": "1",
                "impact_factor": "12",
                "abstract": "Hello I am an abstract.",
                "paragraph": "This is some great content",
                "ds_document_id": "78",
                "section": "Introduction",
                "context_id": "21",
                "reranking_score": "0.12345",
            }
            for i in range(retriever_k)
        ]

        httpx_mock.add_response(
            url=url,
            json=fake_response,
        )
        mock_openai_client = MockOpenAIClient()
        mock_openai_client = cast(AsyncOpenAI, mock_openai_client)
        mock_class_response = ArticleSelection(sources=[0, 1, 2, 3, 4, 5])
        mock_response = create_mock_response(
            {"role": "assistant", "content": "sample response content"},
            structured_output_class=mock_class_response,
        )
        mock_openai_client.set_response(mock_response)

        tool = LiteratureSearchTool(
            input_schema=LiteratureSearchInput(
                user_message="covid 19", max_article_number=reranker_k
            ),
            metadata=LiteratureSearchMetadata(
                literature_search_url="http://fake_url",
                httpx_client=httpx.AsyncClient(),
                token="fake_token",
                retriever_k=retriever_k,
                use_reranker=True,
                openai_client=mock_openai_client,
            ),
        )
        response = await tool.arun()
        assert isinstance(response, LiteratureSearchToolOutput)
        assert len(response.articles) == reranker_k
        assert isinstance(response.articles[0], ArticleOutput)
        assert isinstance(response.articles[0].paragraphs[0], ParagraphOutput)


def make_paragraph(article_id, section, paragraph, reranking_score, **meta):
    base = dict(
        article_id=article_id,
        section=section,
        paragraph=paragraph,
        reranking_score=reranking_score,
        # metadata fields used in ArticleOutput
        article_title=meta.get("article_title", f"Title {article_id}"),
        article_authors=meta.get("article_authors", [f"Author {article_id}"]),
        article_doi=meta.get("article_doi", f"10.0/{article_id}"),
        pubmed_id=meta.get("pubmed_id", f"PMID{article_id}"),
        date=meta.get("date", "2021-01-01"),
        article_type=meta.get("article_type", "research"),
        journal_issn=meta.get("journal_issn", "0000-0000"),
        journal_name=meta.get("journal_name", f"Journal {article_id}"),
        cited_by=meta.get("cited_by", 0),
        impact_factor=meta.get("impact_factor", 1.0),
        abstract=meta.get("abstract", f"Abstract {article_id}"),
        ds_document_id="12345",
        context_id=1,
    )
    return base


def test_aggregate_paragraphs_basic_limit_two():
    # Build input: 2 paras for A1, 1 para for A2, 1 para for A3
    input_data = [
        make_paragraph("A1", "Intro", "P1", 0.9),
        make_paragraph("A1", "Methods", "P2", 0.8),
        make_paragraph("A2", "Intro", "P3", 0.7),
        make_paragraph("A3", "Intro", "P4", 0.6),
    ]
    # Only want up to 2 unique articles
    result = LiteratureSearchTool._aggregate_paragraphs(input_data, max_articles=2)

    # Expect two ArticleOutput objects for A1 then A2, in that insertion order
    assert len(result) == 2
    # first article
    art1 = result[0]
    assert isinstance(art1, ArticleOutput)
    assert art1.source == 0
    # two paragraphs under A1
    assert [p.paragraph for p in art1.paragraphs] == ["P1", "P2"]
    assert [p.section for p in art1.paragraphs] == ["Intro", "Methods"]
    # metadata carried over
    assert art1.article_title == "Title A1"
    assert art1.abstract == "Abstract A1"

    # second article
    art2 = result[1]
    assert art2.source == 1
    assert len(art2.paragraphs) == 1
    assert art2.paragraphs[0].paragraph == "P3"


def test_aggregate_paragraphs_no_limit_exceeding():
    # If max_articles >= unique articles, include all
    input_data = [
        make_paragraph("X", "S", "p", 1.0),
        make_paragraph("Y", "S2", "q", 0.5),
    ]
    result = LiteratureSearchTool._aggregate_paragraphs(input_data, max_articles=10)
    assert {a.source for a in result} == {0, 1}
    # order must respect first-seen: X then Y
    assert result[0].source == 0
    assert result[1].source == 1


def test_aggregate_paragraphs_empty_input():
    # empty list => empty output
    result = LiteratureSearchTool._aggregate_paragraphs([], max_articles=5)
    assert result == []


def test_process_output():
    sample_articles = [
        ArticleOutput(
            article_title=f"Title a{i}",
            article_authors=["Author A", "Author B"],
            article_doi=None,
            pubmed_id=None,
            date=None,
            article_type=None,
            journal_issn=None,
            journal_name=None,
            cited_by=None,
            impact_factor=None,
            abstract=None,
            paragraphs=[
                ParagraphOutput(
                    section="Example section",
                    paragraph="Sample paragraph",
                    reranking_score=0.1234,
                )
            ],
            source=i,
        )
        for i in range(5)
    ]
    llm_output = ArticleSelection(sources=[1, 2, 0])
    max_article_number = 2

    result = LiteratureSearchTool._process_output(
        llm_outputs=llm_output,
        articles=sample_articles,
        max_article_number=max_article_number,
    )

    assert isinstance(result, LiteratureSearchToolOutput)
    assert len(result.articles) == 2
    assert result.articles[0].source == 1
    assert result.articles[1].source == 2
