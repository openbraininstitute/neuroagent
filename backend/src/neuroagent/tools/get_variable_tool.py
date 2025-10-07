"""Retrieve the value of a variable."""

import logging
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseOutput, BaseTool

logger = logging.getLogger(__name__)


class GetVariableToolInput(BaseModel):
    """Input schema for GetVariableTool."""

    variable: Any = Field(
        description="Name of the variable. Follows the pattern `'${xxxxxxxx-xxx-xxx-xxx-xxxxxxxxxxxx}'`",
        pattern=r"\$\{([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}",
    )


class GetVariableToolMetadata(BaseMetadata):
    """Metadata for the GetVariableTool."""

    pass


class GetVariableToolOutput(BaseOutput):
    """Output schema of the GetVariableTool."""

    value: Any


class GetVariableTool(BaseTool):
    """Given a variable, output its actual value."""

    name: ClassVar[str] = "get-variable-tool"
    name_frontend: ClassVar[str] = "Get Variable"
    utterances: ClassVar[list[str]] = [
        "Give me the actual value.",
        "I need the whole thing.",
        "Don't use variables.",
    ]
    description: ClassVar[
        str
    ] = """Given a variable, return its value. This is useful when the user asks for a variable's value, or when you need it for further processing.
    If you need the value as is to pass it into another tool's input, don't use this tool simply use the variable's name."""
    description_frontend: ClassVar[str] = """Fetches the value of a chat's variable"""
    metadata: GetVariableToolMetadata
    input_schema: GetVariableToolInput

    async def arun(self) -> GetVariableToolOutput:
        """Get variable's value."""
        return GetVariableToolOutput(value=self.input_schema.variable)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Always returns True as this tool doesn't depend on external services.
        """
        return True
