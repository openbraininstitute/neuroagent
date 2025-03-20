"""Resampling tool."""

import logging
from typing import ClassVar

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from neuroagent.base_types import Agent, BaseMetadata, BaseTool
from neuroagent.utils import sample_tools

logger = logging.getLogger(__name__)


class ResampleToolMetadata(BaseMetadata):
    """Metadata for tool resampling."""

    openai_client: AsyncOpenAI
    agent: Agent
    tools_embedding_dict: dict[type[BaseTool], list[float]]
    embedding_model: str
    embedding_dim: int | None
    fake_embeddings: bool
    max_tools: int


class ResampleToolInput(BaseModel):
    """Input of the tool resampling."""

    task_description: str = Field(
        description="""Give a 3 words MAXIMUM description of the task at hands.
        Examples: Search the Literature, Retrieve morphology data, Simulate me-model, Search the web, Plot data, Retrieve electrophysiology data, Get simulations..."""
    )


class ResampleTool(BaseTool):
    """Tool for resampling subset of tools given to the LLM."""

    name: ClassVar[str] = "tool-resampling"
    name_frontend: ClassVar[str] = "Tool Resampling"
    description: ClassVar[str] = """Resample the set of tools made available to the LLM.
    Use this tool to try to get a new set of tools to fulfill the tasks you are not able to fulfill.
    Always call it if there are remaining tasks that cannot be completed with your current set ot tools."""
    description_frontend: ClassVar[str] = (
        "Resample the tools made available to the LLM."
    )
    metadata: ResampleToolMetadata
    input_schema: ResampleToolInput

    async def arun(self) -> Agent:
        """Run the tool."""
        logger.info(
            f"Running ResampleTool with inputs {self.input_schema.model_dump()}"
        )
        to_resample = set(self.metadata.tools_embedding_dict.keys()) & set(
            self.metadata.agent.tools
        )
        new_tools = await sample_tools(
            openai_client=self.metadata.openai_client,
            content=self.input_schema.task_description,
            tools_embedding_dict=self.metadata.tools_embedding_dict,
            new_tool_size=self.metadata.max_tools
            - len(
                set(self.metadata.agent.tools)
                - set(self.metadata.tools_embedding_dict.keys())
            ),
            embedding_model=self.metadata.embedding_model,
            embedding_dim=self.metadata.embedding_dim,
            fake_embeddings=self.metadata.fake_embeddings,
        )

        self.metadata.agent.tools = list(
            set(self.metadata.agent.tools) - to_resample | set(new_tools)
        )
        return self.metadata.agent

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
