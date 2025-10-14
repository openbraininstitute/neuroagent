"""Browse the OBI github repositories to fetch relevant code."""

from typing import ClassVar, Literal

from httpx import AsyncClient
from pydantic import BaseModel, Field, SecretStr

from neuroagent.tools.base_tool import BaseMetadata, BaseTool


class OBICodeInput(BaseModel):
    """Input to the OBICode tool."""

    query: str = Field(
        description="Search query to find relevant context for APIs, Libraries, and SDKs. For example, 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware', 'Next js partial prerendering configuration' Will only be fetched within https://github.com/openbraininstitute"
    )
    num_tokens: Literal["dynamic"] | int = Field(
        description="Token allocation strategy: 'dynamic' (default, token-efficient, returns the 100-1000+ most useful tokens), 1000-50000 tokens (returns a specific number of tokens). Use 'dynamic' for optimal token efficiency - only specify a concrete number of tokens if 'dynamic' mode doesn't return the right information."
    )


class OBICodeMetadata(BaseMetadata):
    """Metadata of the OBICode tool."""

    exa_api_key: SecretStr


class OBICodeOutput(BaseModel):
    """Output class for the tool."""

    code_snippet: str


class OBICodeTool(BaseTool):
    """Based on a query, browse OBI's github repos to fetch code."""

    name: ClassVar[str] = "obi-code"
    name_frontend: ClassVar[str] = "Search OBI Code"
    utterances: ClassVar[list[str]] = [
        "How can I read morphology files using NeuroM ?",
        "Write a snippet to analyse electrical recording using bluepyefe and efel.",
        "How can I analyze my circuit using bluepysnap ?",
    ]
    description: ClassVar[
        str
    ] = """Browses the Openbraininstitute's github repository looking for code similar to the user's query.
    Use the tool when the user requires guidance in using the various packages and libraries written by the open brain institute."""
    description_frontend: ClassVar[str] = (
        """Searches OBI's github repo to retrieve code snippet. Useful to navigate OBI's packages and libraries"""
    )
    metadata: OBICodeMetadata
    input_schema: OBICodeInput

    async def arun(self) -> OBICodeOutput:
        """Run the tool."""
        async with AsyncClient(timeout=300) as client:
            response = await client.post(
                "https://api.exa.ai/context",
                headers={"x-api-key": self.metadata.exa_api_key.get_secret_value()},
                json={
                    "query": self.input_schema.query + " openbraininstitute/neurom",
                    "tokensNum": self.input_schema.num_tokens,
                },
            )
        breakpoint()
        if response.status_code != 200:
            raise ValueError(
                f"The context endpoint returned a non 200 response code. Error: {response.text}"
            )
        return OBICodeOutput(code_snippet=response.json()["response"])
