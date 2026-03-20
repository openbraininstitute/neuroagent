"""Feedback submission tool."""

import logging
from typing import ClassVar, Literal

import httpx
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class FeedbackSubmitInput(BaseModel):
    """Input schema for Feedback Submit tool."""

    title: str = Field(description="Title of the feedback issue")
    description: str = Field(description="Detailed description of the feedback")
    labels: list[
        Literal[
            "bug",
            "enhancement",
            "question",
            "documentation",
            "feature-request",
            "ui-ux",
            "performance",
            "accessibility",
        ]
    ] = Field(
        default=["enhancement"],
        description="Labels to categorize the feedback. Choose one or more from: bug, enhancement, question, documentation, feature-request, ui-ux, performance, accessibility",
    )


class FeedbackMetadata(BaseMetadata):
    """Metadata for Feedback Submit tool."""

    httpx_client: httpx.AsyncClient
    frontend_base_url: str


class FeedbackSubmitOutput(BaseModel):
    """Output schema for Feedback Submit tool."""

    issue_url: str = Field(description="URL of the created GitHub issue")
    warning: str | None = Field(
        default=None, description="Warning message if any issues occurred"
    )


class FeedbackSubmitTool(BaseTool):
    """Tool for submitting user feedback as GitHub issues."""

    name: ClassVar[str] = "feedback-submit"
    name_frontend: ClassVar[str] = "Submit Feedback"
    utterances: ClassVar[list[str]] = [
        "I want to report a bug",
        "Submit feedback",
        "Create an issue",
        "Report a problem",
        "I have a suggestion",
    ]
    description: ClassVar[str] = (
        "Submit user feedback to create a GitHub issue. "
        "Use this tool when users want to report bugs, suggest features, or provide feedback. "
        "The feedback will be tracked in the feedback repository."
    )
    description_frontend: ClassVar[str] = (
        "Submit feedback to create a GitHub issue. Report bugs, suggest features, or provide general feedback."
    )
    metadata: FeedbackMetadata
    input_schema: FeedbackSubmitInput

    async def arun(self) -> FeedbackSubmitOutput:
        """Submit feedback to GitHub.

        Returns
        -------
            FeedbackSubmitOutput containing the issue URL
        """
        payload = {
            "title": self.input_schema.title,
            "body": self.input_schema.description,
            "labels": self.input_schema.labels,
        }

        response = await self.metadata.httpx_client.post(
            f"{self.metadata.frontend_base_url.rstrip('/')}/api/feedback/create-ticket",
            json=payload,
        )

        if response.status_code != 200:
            raise ValueError(
                f"Failed to create feedback issue. Status: {response.status_code}, Error: {response.text}"
            )

        data = response.json()
        return FeedbackSubmitOutput(
            issue_url=data["issueUrl"], warning=data.get("warning")
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
