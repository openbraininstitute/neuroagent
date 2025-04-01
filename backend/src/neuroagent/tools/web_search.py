"""Generic websearch tool."""

from typing import ClassVar, Literal

from pydantic import BaseModel, Field, SecretStr
from tavily import AsyncTavilyClient

from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class WebSearchMetadata(BaseMetadata):
    """Metadata of the web search tool."""

    tavily_api_key: SecretStr


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
        ge=1,
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


class SingleSearchOutput(BaseModel):
    """Single search result."""

    title: str
    url: str
    content: str
    score: float
    raw_content: str | None


class WebSearchToolOutput(BaseModel):
    """Output of the Web Search tool."""

    query: str
    results: list[SingleSearchOutput]
    response_time: float


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

    async def arun(self) -> WebSearchToolOutput:
        """Run the tools."""
        client = AsyncTavilyClient(
            api_key=self.metadata.tavily_api_key.get_secret_value()
        )
        search_result = await client.search(
            query=self.input_schema.query,
            max_results=self.input_schema.max_results,
            include_domains=self.input_schema.include_domains,
            exclude_domains=self.input_schema.exclude_domains,
            time_range=self.input_schema.time_range,
        )
        return WebSearchToolOutput(
            query=search_result["query"],
            response_time=search_result["response_time"],
            results=[
                SingleSearchOutput(
                    title=result["title"],
                    url=result["url"],
                    content=result["content"],
                    score=result["score"],
                    raw_content=result.get("raw_content"),
                )
                for result in search_result["results"]
            ],
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        client = AsyncTavilyClient(api_key="temp")
        ping_request = await client._client_creator().get("")
        return ping_request.status_code == 200
