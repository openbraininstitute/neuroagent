"""MCP client logic."""

import asyncio
import json
import logging
from contextlib import AsyncExitStack
from pathlib import Path
from tempfile import TemporaryDirectory
from datamodel_code_generator import InputFileType, generate
from datamodel_code_generator import DataModelType
import importlib.util
import sys
from typing import Type, ClassVar
from pydantic import BaseModel

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import CallToolResult, Tool
from neuroagent.tools.base_tool import BaseTool, BaseMetadata

logger = logging.getLogger(__name__)


def jsonschema2pydantic(json_schema: str) -> Type[BaseModel]:
    """Generate a Pydantic model from a JSON schema.

    Parameters
    ----------
    json_schema : str
        The JSON schema as a string
    model_name : str
        The name to give to the generated model class

    Returns
    -------
    Type[BaseModel]
        The generated Pydantic model class
    """
    with TemporaryDirectory() as temporary_directory_name:
        temporary_directory = Path(temporary_directory_name)
        output = Path(temporary_directory / "model.py")
        generate(
            json_schema,
            input_file_type=InputFileType.JsonSchema,
            input_filename="schema.json",
            output=output,
            output_model_type=DataModelType.PydanticV2BaseModel,
        )

        # Load the generated module
        spec = importlib.util.spec_from_file_location("generated_model", output)
        module = importlib.util.module_from_spec(spec)
        sys.modules["generated_model"] = module
        spec.loader.exec_module(module)

        # Get the generated model class
        return getattr(module, "Model")


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
        self.tools: dict[str, list[Tool]] = {}

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

            self.tools[name] = response.tools

    async def cleanup(self) -> None:
        """Clean up resources"""

        # Unfortunately, the below code seems to have an issue

        # for name, stack in self.exit_stack.items():
        #     logger.info(f"Cleaning up server: {name}")
        #     await stack.aclose()


def create_dynamic_tool(
    server_name: str,
    tool_name: str,
    tool_description: str,
    input_schema: dict,
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
    input_schema : dict
        JSON schema for the tool's input
    session : ClientSession
        MCP client session for invoking the tool

    Returns
    -------
    Type[BaseTool]
        A dynamically created BaseTool subclass
    """

    # Generate the input schema model
    input_schema_cls = jsonschema2pydantic(json.dumps(input_schema))

    class DynamicMetadata(BaseMetadata):
        pass

    # Create the tool class
    class DynamicTool(BaseTool):
        name: ClassVar[str] = f"{server_name}_{tool_name}"
        name_frontend: ClassVar[str] = f"{server_name}_{tool_name}"
        description: ClassVar[str] = tool_description
        description_frontend: ClassVar[str] = tool_description
        input_schema: input_schema_cls
        metadata: DynamicMetadata

        async def arun(self) -> CallToolResult:
            """Run the tool."""
            # This will be implemented by the MCP client
            result = await session.invoke_tool(
                tool_name, arguments=self.input_schema.model_dump()
            )

            return result

    return DynamicTool


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
