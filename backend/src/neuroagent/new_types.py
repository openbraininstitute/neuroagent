"""New types."""

from typing import Any, Callable

# Third-party imports
from pydantic import BaseModel, ConfigDict

from neuroagent.tools.base_tool import BaseTool


class Agent(BaseModel):
    """Agent class."""

    name: str = "Agent"
    model: str = "openai/gpt-4.1-mini"
    instructions: str | Callable[[], str] = "You are a helpful agent."
    temperature: float = 0
    tools: list[type[BaseTool]] = []
    tool_choice: str | None = None
    parallel_tool_calls: bool = True


class HILResponse(BaseModel):
    """Response for tools that require HIL validation."""

    message: str
    name: str
    inputs: dict[str, Any]
    tool_call_id: str


class HILValidation(BaseModel):
    """Class to send the validated json to the api."""

    validated_inputs: dict[str, Any] | None = None
    is_validated: bool = True


class Response(BaseModel):
    """Agent response."""

    messages: list[dict[str, Any]] = []
    agent: Agent | None = None
    context_variables: dict[str, Any] = {}
    hil_messages: list[HILResponse] | None = None


class AgentRequest(BaseModel):
    """Class for agent request."""

    query: str


class AgentResponse(BaseModel):
    """Final agent response."""

    message: str = ""


class ClientRequest(BaseModel):
    """Vercel class."""

    content: str
    tool_selection: list[str] | None = None
    model: str = "openai/gpt-4.1-mini"

    model_config = ConfigDict(extra="ignore")


class Result(BaseModel):
    """
    Encapsulates the possible return values for an agent function.

    Attributes
    ----------
        value (str): The result value as a string.
        agent (Agent): The agent instance, if applicable.
        context_variables (dict): A dictionary of context variables.
    """

    value: str = ""
    agent: Agent | None = None
    context_variables: dict[str, Any] = {}
