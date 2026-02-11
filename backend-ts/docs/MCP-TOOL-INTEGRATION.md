# MCP Tool Integration Complete

## Summary

MCP (Model Context Protocol) tools are now fully integrated into the TypeScript backend tool system. MCP tools defined in `mcp.json` are automatically loaded and treated identically to regular tools - as classes, not instances. This provides a clean, consistent architecture where all tools work the same way.

## Changes Made

### 1. MCP Client Enhancement (`src/lib/mcp/client.ts`)

**Changed `createDynamicMCPTool` to `createDynamicMCPToolClass`:**
- Now returns a CLASS instead of an instance
- Added static properties (toolName, toolNameFrontend, toolDescription, etc.) matching regular tools
- Added static `isOnline()` method for health checks
- MCP tools now follow the exact same pattern as regular tools

**Updated `initializeMCPTools`:**
- Returns an array of tool CLASSES (not instances)
- Classes can be registered in the tool registry just like regular tools
- No special handling needed

### 2. Tool Registry Simplification (`src/lib/tools/base-tool.ts`)

**Removed instance-related methods:**
- Removed `registerInstance()` - no longer needed
- Removed `getInstance()` - no longer needed
- Removed `getAllInstances()` - no longer needed
- Removed `toolInstances` map - no longer needed

**Simplified `getAllMetadata()`:**
- Now only works with classes (both regular and MCP)
- No special case handling for instances

**Simplified `requiresHIL()`:**
- Now only checks tool classes
- Works identically for regular and MCP tools

### 3. Tool Initialization (`src/lib/tools/index.ts`)

**Simplified MCP tool loading:**
- MCP tool classes are added directly to `availableClasses`
- No instance registration needed
- No special handling in the code

### 4. Agent Routine (`src/lib/agents/routine.ts`)

**Removed instance detection:**
- Removed `isInstance` check
- All tools are now treated as classes
- Simplified instantiation logic

### 5. API Endpoints

**`/api/tools` endpoint:**
- Works automatically with MCP tools (no changes needed)
- `getAllMetadata()` returns both regular and MCP tool metadata

**`/api/tools/[name]` endpoint:**
- Simplified to only check `getClass()`
- No instance handling needed
- Works identically for regular and MCP tools

## How It Works

1. **Configuration Loading**: Settings are loaded from environment variables and `mcp.json`
2. **MCP Connection**: When `initializeTools()` is called with `mcpConfig`:
   - `initializeMCPTools()` connects to configured MCP servers
   - Each MCP tool is wrapped as a dynamic BaseTool CLASS with static properties
   - Classes are returned just like regular tool classes
3. **Registration**: MCP tool classes are registered in the tool registry using `registerClass()`
4. **Usage**: MCP tools work identically to regular tools:
   - Access metadata via static properties
   - Instantiate on-demand when LLM calls them
   - Execute via instance methods

## MCP Tool Structure

MCP tools are created as dynamic classes with static properties:

```typescript
class MCPDynamicTool extends BaseTool<typeof inputSchema> {
  // Static properties (ClassVar equivalent) - accessed without instantiation
  static readonly toolName = 'get-obi-software-docs';
  static readonly toolNameFrontend = 'Get OBI Software Docs';
  static readonly toolDescription = 'Get the latest documentation...';
  static readonly toolDescriptionFrontend = 'Get the latest documentation...';
  static readonly toolUtterances = ['Get OBI documentation', ...];
  static readonly toolHil = false;

  // Static method for health check
  static async isOnline(): Promise<boolean> {
    return mcpClient.isServerOnline(serverName);
  }

  // Instance properties
  inputSchema = z.object({}).passthrough();
  contextVariables = {};

  async execute(input: any): Promise<any> {
    return await mcpClient.callTool(serverName, tool.name, input);
  }

  async isOnline(): Promise<boolean> {
    return mcpClient.isServerOnline(serverName);
  }
}
```

## Current Configuration

The system has one MCP tool configured - Context7 for OBI software documentation:

```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp"],
    "toolMetadata": {
      "query-docs": {
        "name": "get-obi-software-docs",
        "nameFrontend": "Get OBI Software Docs",
        "description": "Get the latest documentation for OBI Python packages...",
        "descriptionFrontend": "Get the latest documentation for OBI...",
        "utterances": [...]
      }
    }
  }
}
```

## Testing

Test file: `src/lib/tools/__tests__/mcp-tool-integration.test.ts`

Tests cover:
- Loading MCP tools with configuration
- Handling missing configuration gracefully
- Registering and retrieving tool classes
- HIL validation for tool classes
- Metadata retrieval for all tools

All tests pass ✓

## Benefits

1. **Consistency**: MCP tools work exactly like regular tools - no special cases
2. **Simplicity**: Removed ~100 lines of instance-handling code
3. **Type Safety**: Full TypeScript support with proper type checking
4. **Maintainability**: Single code path for all tools
5. **Extensibility**: Easy to add new MCP servers without code changes

## Usage Example

### In API Routes

```typescript
const tools = await initializeTools({
  // Regular tool config
  entitycoreUrl: settings.tools.entitycore.url,
  exaApiKey: settings.tools.exaApiKey,

  // MCP tool config
  mcpConfig: settings.mcp,
});

const agentConfig = {
  model: selectedModelId,
  tools: tools, // Includes both regular and MCP tools
  contextVariables: { ... },
};

const routine = new AgentsRoutine(...);
const response = await routine.streamChat(agentConfig, ...);
```

### Adding New MCP Servers

1. Update `src/mcp.json`:

```json
{
  "my-server": {
    "command": "npx",
    "args": ["-y", "my-mcp-package"],
    "toolMetadata": {
      "my-tool": {
        "name": "my-custom-tool",
        "nameFrontend": "My Custom Tool",
        "description": "Description for the LLM",
        "utterances": ["example phrases"]
      }
    }
  }
}
```

2. Restart the backend - tools are automatically loaded and available

## Architecture Decision

**Why treat MCP tools as classes instead of instances?**

Initially, MCP tools were created as instances because they're dynamically generated at runtime. However, this created unnecessary complexity:
- Special handling in the tool registry
- Dual code paths in the agent routine
- Extra checks in API endpoints
- More complex tests

By creating MCP tools as dynamic classes with static properties, we achieve:
- Single code path for all tools
- Consistent API throughout the system
- Simpler, more maintainable code
- Better alignment with the Python backend pattern

The key insight: Even though MCP tools are discovered at runtime, we can still create them as classes (not instances) by dynamically generating class definitions with static properties.

## Related Files

- `backend-ts/src/lib/mcp/client.ts` - MCP client and dynamic class creation
- `backend-ts/src/lib/tools/base-tool.ts` - Simplified tool registry
- `backend-ts/src/lib/tools/index.ts` - Tool initialization
- `backend-ts/src/lib/agents/routine.ts` - Simplified agent execution
- `backend-ts/src/app/api/tools/route.ts` - Tool list endpoint
- `backend-ts/src/app/api/tools/[name]/route.ts` - Tool detail endpoint
- `backend-ts/src/mcp.json` - MCP server configuration
- `backend-ts/src/lib/config/settings.ts` - Settings loading
