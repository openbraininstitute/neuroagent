"""Generic websearch tool."""

import json
from typing import ClassVar, Literal

from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.constants import ServiceSubtype
from pydantic import BaseModel, Field, SecretStr
from tavily import AsyncTavilyClient

from neuroagent.app.app_utils import get_accounting_context_manager
from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class WebSearchMetadata(BaseMetadata):
    """Metadata of the web search tool."""

    tavily_api_key: SecretStr
    accounting_session: AsyncAccountingSessionFactory
    vlab_id: str | None
    project_id: str | None
    user_id: str


class WebSearchInput(BaseModel):
    """Input of the web search."""

    query: str = Field(
        description="Parameter defines the query you want to search. You can use anything that you would use in a regular Google search. e.g. inurl:, site:, intitle:."
    )
    time_range: Literal["day", "week", "month", "year"] | None = Field(
        default=None,
        description="The time range back from the current date to filter results.",
    )
    max_results: int = Field(
        default=5,
        le=20,
        description="The maximum number of search results to return.",
    )
    include_domains: list[str] | None = Field(
        default=None,
        description="A list of websites to restrict the search to. If the user specifies sources from which he wants his information, specify it here.",
    )
    exclude_domains: list[str] | None = Field(
        default=None,
        description="A list of website to specifically exclude from the search. If the user specifies sources to avoid, specify it here.",
    )


class WebSearchTool(BaseTool):
    """Perform a generic web search."""

    name: ClassVar[str] = "web-search-tool"
    name_frontend: ClassVar[str] = "Web Search"
    description: ClassVar[str] = (
        "Searches the web using Tavily Search. Use this tool to gather general knowledge when needed, but prioritize other more specialized tools first if they are available."
    )
    description_frontend: ClassVar[str] = "Searches the web using Tavily Search."
    metadata: WebSearchMetadata
    input_schema: WebSearchInput

    async def arun(self) -> str:
        """Run the tools."""
        client = AsyncTavilyClient(
            api_key=self.metadata.tavily_api_key.get_secret_value()
        )
        accounting_context = get_accounting_context_manager(
            vlab_id=self.metadata.vlab_id,
            project_id=self.metadata.project_id,
            accounting_session_factory=self.metadata.accounting_session,
        )
        async with accounting_context(
            subtype=ServiceSubtype.ML_LLM,
            user_id=self.metadata.user_id,
            proj_id=self.metadata.project_id,
            count=1,
        ):
            search_result = await client.search(
                query=self.input_schema.query,
                max_results=self.input_schema.max_results,
                include_domains=self.input_schema.include_domains,
                exclude_domains=self.input_schema.exclude_domains,
                time_range=self.input_schema.time_range,
            )
        return json.dumps(search_result)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        client = AsyncTavilyClient(api_key="temp")
        ping_request = await client._client_creator().get("")
        return ping_request.status_code == 200
