"""MCP client logic."""

import asyncio
import json
import logging
from contextlib import AsyncExitStack
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class MCPServerConfig(BaseModel):
    command: str
    args: list[str] | None = None
    env: dict[str, str] | None = None


class MCPConfig(BaseModel):
    servers: dict[str, MCPServerConfig]

    @classmethod
    def parse_file(cls, config_path: Path) -> "MCPConfig":
        """Parse the configuration file and return an MCPConfig object."""
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file {config_path} does not exist.")
        dct = json.loads(config_path.read_text())

        return cls(**dct)


class MCPClient:
    def __init__(self, config_path: Path):
        # Initialize session and client objects
        self.config = MCPConfig.parse_file(config_path)
        self.exit_stack: dict[str, AsyncExitStack] = {
            name: AsyncExitStack() for name in self.config.servers.keys()
        }
        self.sessions: dict[str, ClientSession] = {}

    async def connect_to_servers(self) -> None:
        """Connect to an MCP server

        Args:
            server_script_path: Path to the server script (.py or .js)
        """
        for name, server_config in self.config.servers.items():
            logger.info(f"Connecting to server: {name}")
            server_params = StdioServerParameters(
                command=server_config.command,
                args=server_config.args or [],
                env=server_config.env or None,
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
            tools = response.tools

    async def cleanup(self) -> None:
        """Clean up resources"""

        # Unfortunately, the below code seems to have an issue

        # for name, stack in self.exit_stack.items():
        #     logger.info(f"Cleaning up server: {name}")
        #     await stack.aclose()


async def main():
    # Path to the configuration file
    config_path = Path("mcp_config.json")

    # Create an instance of MCPClient
    mcp_client = MCPClient(config_path)

    # Connect to the server
    await mcp_client.connect_to_servers()

    # # Clean up resources
    # await mcp_client.cleanup()

    while True:
        pass


if __name__ == "__main__":
    asyncio.run(main())
