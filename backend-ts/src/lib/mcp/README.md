# MCP (Model Context Protocol) Client

This module provides integration with MCP servers, allowing dynamic tool discovery and execution.

## Overview

The MCP client:

- Parses `mcp.json` configuration file
- Spawns and manages MCP server processes via stdio
- Discovers tools from connected servers
- Dynamically generates BaseTool instances for each MCP tool
- Handles tool metadata overrides from configuration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCPClient                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Server 1 (Client + Transport)                    │  │
│  │  - Tool A                                          │  │
│  │  - Tool B                                          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Server 2 (Client + Transport)                    │  │
│  │  - Tool C                                          │  │
│  │  - Tool D                                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              Dynamic BaseTool Instances
```

## Configuration

MCP servers are configured in `src/mcp.json`:

```json
{
  "example-server": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-example"],
    "env": {
      "EXAMPLE_API_KEY": "NEUROAGENT_MCP__SECRETS__EXAMPLE_API_KEY"
    },
    "toolMetadata": {
      "original-tool-name": {
        "name": "custom-tool-name",
        "nameFrontend": "Custom Tool Name",
        "description": "Custom description for LLM",
        "descriptionFrontend": "Custom description for frontend",
        "utterances": ["example", "sample", "test"]
      }
    }
  }
}
```

### Configuration Fields

- `command`: Command to spawn the MCP server process
- `args`: Array of command-line arguments
- `env`: Environment variables (supports secret placeholders)
- `toolMetadata`: Optional overrides for tool metadata

### Secret Management

Environment variables in `env` can reference secrets using placeholders:

```json
{
  "env": {
    "API_KEY": "NEUROAGENT_MCP__SECRETS__MY_API_KEY"
  }
}
```

The placeholder `NEUROAGENT_MCP__SECRETS__MY_API_KEY` will be replaced with the value from the environment variable of the same name.

If a server has unresolved secrets, it will be deactivated with a warning.

## Usage

### Initialize MCP Tools

```typescript
import { initializeMCPTools } from '@/lib/mcp';
import { getSettings } from '@/lib/config/settings';

const settings = getSettings();
const mcpTools = await initializeMCPTools(settings.mcp);

// mcpTools is an array of BaseTool instances
```

### Use with Tool Registry

```typescript
import { toolRegistry } from '@/lib/tools/base-tool';
import { initializeMCPTools } from '@/lib/mcp';

const mcpTools = await initializeMCPTools(settings.mcp);

// Register all MCP tools
for (const tool of mcpTools) {
  toolRegistry.register(tool);
}
```

### Direct Client Usage

```typescript
import { MCPClient } from '@/lib/mcp';

const client = new MCPClient(settings.mcp);
await client.connect();

// Get all tools
const allTools = client.getAllTools();

// Call a tool
const result = await client.callTool('server-name', 'tool-name', {
  arg1: 'value1',
  arg2: 'value2',
});

// Check server health
const isOnline = await client.isServerOnline('server-name');

// Disconnect
await client.disconnect();
```

## Tool Metadata Overrides

You can override tool metadata in the configuration:

```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp"],
    "toolMetadata": {
      "query-docs": {
        "name": "get-obi-software-docs",
        "nameFrontend": "Get OBI Software Docs",
        "description": "Get documentation for OBI packages",
        "descriptionFrontend": "Retrieves OBI package documentation",
        "utterances": ["Get OBI documentation", "Show me OBI software docs"]
      }
    }
  }
}
```

This allows you to:

- Rename tools for better LLM understanding
- Provide custom descriptions
- Add utterances for intent matching
- Customize frontend display

## Implementation Details

### Dynamic Tool Generation

Each MCP tool is converted to a `BaseTool` instance:

1. **Input Schema**: Uses a passthrough Zod schema (validation delegated to MCP server)
2. **Metadata**: Extracted from MCP tool definition with optional overrides
3. **Execution**: Proxies to the MCP server via the client
4. **Health Check**: Checks if the MCP server is responsive

### Tool Name Mapping

When tool names are overridden, the client maintains a mapping:

- Frontend/LLM sees the custom name
- Backend uses the original name when calling the MCP server

### Error Handling

- Connection failures are logged but don't crash the application
- Servers with unresolved secrets are skipped
- Tool execution errors are propagated to the caller

## Lifecycle Management

The MCP client manages server process lifecycle:

1. **Startup**: Spawns server processes via stdio transport
2. **Discovery**: Lists available tools from each server
3. **Runtime**: Maintains connections and handles tool calls
4. **Shutdown**: Gracefully closes all server connections

## Testing

See `tests/mcp/` for test examples.

## Requirements Validation

This implementation satisfies:

- **Requirement 11.1**: MCP client implemented in TypeScript
- **Requirement 11.2**: Parses mcp.json configuration file
- **Requirement 11.3**: Spawns and manages MCP server processes
- **Requirement 11.4**: Communicates via stdio protocol
- **Requirement 11.5**: Dynamically generates tool definitions
- **Requirement 11.6**: Handles MCP server lifecycle
