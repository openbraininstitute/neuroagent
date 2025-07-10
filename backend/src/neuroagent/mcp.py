"""MCP client logic."""

import logging
import re
from types import TracebackType
from typing import Any, ClassVar, Optional, Type

from mcp import ClientSession, ClientSessionGroup, StdioServerParameters
from mcp.types import CallToolResult, Tool
from pydantic import BaseModel, ConfigDict

from neuroagent.app.config import SettingsMCP
from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)

SERVER_TOOL_SEPARATOR = "|||"


class MCPClient:
    """MCP client."""

    def __init__(self, config: SettingsMCP):
        self.config = config
        self.group_session: ClientSessionGroup = ClientSessionGroup(
            component_name_hook=lambda name,
            server_info: f"{(server_info.name)}{SERVER_TOOL_SEPARATOR}{name}"
        )

        self.tools: dict[str, list[Tool]] = {}  # server -> tool list
        self.sessions: dict[str, ClientSession] = {}  # server -> session

    async def __aenter__(self) -> "MCPClient | None":
        """Enter the async context manager."""
        if not self.config.servers:
            return None

        await self.group_session.__aenter__()

        # Connect to each server
        for name, server_config in self.config.servers.items():
            logger.info(f"Connecting to server: {name}")
            if server_config.env:
                env = {k: v.get_secret_value() for k, v in server_config.env.items()}
            else:
                env = None

            # Connect to server using the group session
            await self.group_session.connect_to_server(
                StdioServerParameters(
                    command=server_config.command,
                    args=server_config.args or [],
                    env=env,
                )
            )

        # Override tool name and description
        # Iterate on each server defined in the settings
        for server in self.config.servers.values():
            # If the server has tool overriding defined
            if server.tool_metadata:
                # Get the list of tools that must be overriden
                tools_to_override = server.tool_metadata.keys()

                # For each tool that has an override defined
                for tool_name in tools_to_override:
                    # Find the corresponding Tool class in the group_session
                    try:
                        tool = next(
                            tool
                            for tool in self.group_session._tools.values()
                            if tool.name == tool_name
                        )
                    except StopIteration:
                        raise ValueError(f"Tool {tool_name} not found")

                    # Perform the override
                    tool.name = server.tool_metadata[tool_name].name or tool.name
                    tool.description = (
                        server.tool_metadata[tool_name].description or tool.description
                    )

        # Populate the tools and sessions dictionaries
        for session, components in self.group_session._sessions.items():
            tool_names = components.tools
            server_name = next(iter(tool_names)).split(SERVER_TOOL_SEPARATOR)[0]
            self.tools[server_name] = [
                self.group_session._tools[tool_name] for tool_name in tool_names
            ]
            self.sessions[server_name] = session

        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[TracebackType],
    ) -> None:
        """Exit the async context manager."""
        if self.config.servers:
            try:
                await self.group_session.__aexit__(exc_type, exc_val, exc_tb)
            except Exception:  # nosec
                # Issue with ClientSessionGroup cleanup when multiple servers are present
                pass


def create_dynamic_tool(
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

    # Create the tool class
    class MCPDynamicTool(BaseTool):
        name: ClassVar[str] = tool_name
        name_frontend: ClassVar[str] = " ".join(
            [word.capitalize() for word in re.split(r"[-/_=+*]", tool_name)]
        )
        description: ClassVar[str] = tool_description
        description_frontend: ClassVar[str] = tool_description
        json_schema: ClassVar[dict[str, Any]] = input_schema_serialized
        input_schema: InputSchema
        metadata: Metadata

        async def arun(self) -> CallToolResult:
            """Run the tool."""
            result = await session.call_tool(
                tool_name,
                arguments=self.input_schema.model_dump(),
            )

            return result

        @classmethod
        async def is_online(cls) -> bool:
            """Check if the tool is online."""
            # The below will raise an exception if the session is not connected
            _ = await session.send_ping()

            return True

    return MCPDynamicTool
