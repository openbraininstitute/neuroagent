"""MCP client logic."""

import logging
import shutil
from contextlib import AsyncExitStack
from typing import Any, ClassVar, Type

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import CallToolResult, Tool
from pydantic import BaseModel, ConfigDict

from neuroagent.app.config import SettingsMCP
from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class MCPClient:
    """MCP client."""

    def __init__(self, config: SettingsMCP):
        # Initialize session and client objects
        self.config = config
        self.exit_stack: dict[str, AsyncExitStack] = {
            name: AsyncExitStack() for name in self.config.servers.keys()
        }
        self.sessions: dict[str, ClientSession] = {}
        self.tools: dict[str, list[Tool]] = {}

    async def start(self) -> None:
        """Start the MCP client by connecting to servers."""
        for name, server_config in self.config.servers.items():
            logger.info(f"Connecting to server: {name}")
            if server_config.env:
                env = {k: v.get_secret_value() for k, v in server_config.env.items()}
            else:
                env = None
            server_params = StdioServerParameters(
                command=server_config.command,
                args=server_config.args or [],
                env=env,
            )

            stdio_transport = await self.exit_stack[name].enter_async_context(
                stdio_client(server_params)
            )
            self.sessions[name] = await self.exit_stack[name].enter_async_context(
                ClientSession(*stdio_transport)
            )

            await self.sessions[name].initialize()

            # List available tools
            response = await self.sessions[name].list_tools()

            self.tools[name] = response.tools

    async def cleanup(self) -> None:
        """Clean up resources."""
        # Clean up dynamic tools directory
        if self.dynamic_tools_dir.exists():
            shutil.rmtree(self.dynamic_tools_dir)

        # Clean up server connections - for some reason does not work
        # for name, stack in self.exit_stack.items():
        #     logger.info(f"Cleaning up server: {name}")
        #     await stack.aclose()


def create_dynamic_tool(
    server_name: str,
    tool_name: str,
    tool_description: str,
    input_schema_serialized: dict[str, Any],
    session: ClientSession,
) -> Type[BaseTool]:
    """Create a dynamic BaseTool subclass for an MCP tool.

    Parameters
    ----------
    server_name : str
        Name of the MCP server
    tool_name : str
        Name of the tool
    tool_description : str
        Description of the tool
    input_schema_serialized : dict
        JSON schema for the tool's input
    session : ClientSession
        MCP client session for invoking the tool

    Returns
    -------
    Type[BaseTool]
        A dynamically created BaseTool subclass
    """

    class InputSchema(BaseModel):
        """Wildcard input schema for the tool.

        The actual schema will be provided via `json_schema` argument.
        However, this class is still important since it will be instantiated
        before doing the tool call.
        """

        model_config = ConfigDict(extra="allow")

    class Metadata(BaseMetadata):
        """Metadata for the tool."""

        model_config = ConfigDict(extra="ignore")

    # Create the tool class
    class DynamicTool(BaseTool):
        name: ClassVar[str] = f"mcp-{server_name}-{tool_name}"
        name_frontend: ClassVar[str] = f"mcp-{server_name}-{tool_name}"
        description: ClassVar[str] = tool_description
        description_frontend: ClassVar[str] = tool_description
        json_schema: ClassVar[dict[str, Any]] = input_schema_serialized
        input_schema: InputSchema
        metadata: Metadata

        async def arun(self) -> CallToolResult:
            """Run the tool."""
            # This will be implemented by the MCP client
            result = await session.call_tool(
                tool_name,
                arguments=self.input_schema.model_dump(),  # type: ignore[attr-defined]
            )

            return result

        @classmethod
        async def is_online(cls) -> bool:
            """Check if the tool is online."""
            # the below would hang if the server is not online
            _ = await session.send_ping()

            return True

    return DynamicTool
