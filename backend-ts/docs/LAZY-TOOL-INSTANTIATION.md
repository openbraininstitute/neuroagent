# Lazy Tool Instantiation Pattern

## Core Principle

**Tools are instantiated INDIVIDUALLY and ONLY when the LLM calls them.**

This matches Python's pattern exactly:
1. Start with `list[type[BaseTool]]` (list of classes)
2. Create a tool map: `{tool.name: tool for tool in tools}` (still classes!)
3. When LLM calls a tool → instantiate that specific tool
4. Execute and discard the instance

## The Flow

```
Request Start
    ↓
Get available tool CLASSES based on config
    ↓
Create tool map: { toolName: ToolClass }
    ↓
Pass tool metadata to LLM (from static properties)
    ↓
LLM decides to call "web-search" tool
    ↓
Instantiate ONLY WebSearchTool with user context
    ↓
Execute tool
    ↓
Discard instance
    ↓
LLM decides to call "entitycore-brainregion-getall"
    ↓
Instantiate ONLY BrainRegionGetAllTool with user context
    ↓
Execute tool
    ↓
Discard instance
    ↓
Request End
```

## Implementation

### Step 1: Get Available Tool Classes

```typescript
// Returns list of tool CLASSES (not instances)
const toolClasses = await getAvailableToolClasses({
  exaApiKey: settings.exaApiKey,
  entitycoreUrl: settings.entitycoreUrl,
  entityFrontendUrl: settings.frontendBaseUrl,
  obiOneUrl: settings.obiOneUrl,
  // Note: User context is NOT needed here - just checking availability
});

// toolClasses = [WebSearchTool, LiteratureSearchTool, BrainRegionGetAllTool, ...]
```

### Step 2: Create Tool Map

```typescript
// Map tool names to classes (still no instantiation!)
const toolMap: Record<string, ToolClass> = Object.fromEntries(
  toolClasses.map((ToolClass) => [ToolClass.toolName, ToolClass])
);

// toolMap = {
//   'web-search': WebSearchTool,
//   'literature-search': LiteratureSearchTool,
//   'entitycore-brainregion-getall': BrainRegionGetAllTool,
//   ...
// }
```

### Step 3: Provide Tool Metadata to LLM

```typescript
// Extract metadata from static properties (no instantiation!)
const toolsForLLM = toolClasses.map((ToolClass) => ({
  name: ToolClass.toolName,
  description: ToolClass.toolDescription,
  parameters: ToolClass.inputSchema, // Zod schema
}));

// Pass to LLM so it can decide which tools to call
```

### Step 4: Handle Tool Calls (Lazy Instantiation)

```typescript
async function handleToolCall(toolName: string, input: any) {
  // Get the tool CLASS from map
  const ToolClass = toolMap[toolName];
  if (!ToolClass) {
    throw new Error(`Tool ${toolName} not found`);
  }

  // Instantiate ONLY this specific tool with user context
  const toolInstance = await createToolInstance(ToolClass, {
    exaApiKey: settings.exaApiKey,
    entitycoreUrl: settings.entitycoreUrl,
    entityFrontendUrl: settings.frontendBaseUrl,
    jwtToken: session.accessToken,    // User-specific!
    vlabId: session.user.vlabId,      // User-specific!
    projectId: session.user.projectId, // User-specific!
    obiOneUrl: settings.obiOneUrl,
  });

  // Execute and return result
  const result = await toolInstance.execute(input);
  
  // Instance is discarded after execution
  return result;
}
```

## Complete Example

```typescript
// POST /api/chat
export async function POST(request: NextRequest) {
  const session = await validateAuth(request);
  const { messages } = await request.json();
  const settings = getSettings();

  // Step 1: Get available tool classes
  const toolClasses = await getAvailableToolClasses({
    exaApiKey: settings.tools.exaApiKey,
    entitycoreUrl: settings.tools.entitycore.url,
    entityFrontendUrl: settings.tools.frontendBaseUrl,
    obiOneUrl: settings.tools.obiOne.url,
  });

  // Step 2: Create tool map
  const toolMap = Object.fromEntries(
    toolClasses.map((ToolClass) => [ToolClass.toolName, ToolClass])
  );

  // Step 3: Convert to Vercel AI SDK format with lazy instantiation
  const vercelTools: Record<string, Tool> = {};
  
  for (const [name, ToolClass] of Object.entries(toolMap)) {
    vercelTools[name] = {
      description: ToolClass.toolDescription,
      parameters: ToolClass.inputSchema, // Static Zod schema
      execute: async (input: any) => {
        // Step 4: Instantiate ONLY when LLM calls this tool
        const toolInstance = await createToolInstance(ToolClass, {
          exaApiKey: settings.tools.exaApiKey,
          entitycoreUrl: settings.tools.entitycore.url,
          entityFrontendUrl: settings.tools.frontendBaseUrl,
          jwtToken: session.accessToken,
          vlabId: session.user.vlabId,
          projectId: session.user.projectId,
          obiOneUrl: settings.tools.obiOne.url,
        });
        
        return await toolInstance.execute(input);
      },
    };
  }

  // Stream response with tools
  const result = streamText({
    model: openai('gpt-4'),
    messages,
    tools: vercelTools,
  });

  return result.toDataStreamResponse();
}
```

## Why This Pattern?

### 1. Memory Efficiency
Only create instances for tools that are actually called. If LLM only uses 2 out of 10 tools, you only instantiate 2.

### 2. User Context Isolation
Each tool call gets fresh user context (JWT token, vlab ID, project ID) at the moment of execution.

### 3. No Stale State
Tools don't hold state between calls. Each execution is independent.

### 4. Matches Python Pattern
Python's `handle_tool_call` does exactly this:
```python
tool_map = {tool.name: tool for tool in tools}  # Classes, not instances
tool = tool_map[name]  # Still a class
tool_instance = tool(input_schema=input_schema, metadata=tool_metadata)  # Instantiate here!
result = await tool_instance.arun()
```

## Common Mistakes to Avoid

❌ **DON'T** instantiate all tools at once:
```typescript
// BAD - creates all tool instances upfront
const tools = await createAllToolInstances(config);
```

❌ **DON'T** cache tool instances:
```typescript
// BAD - reuses instances across calls
const toolInstances = new Map();
if (!toolInstances.has(toolName)) {
  toolInstances.set(toolName, new Tool(context));
}
```

✅ **DO** work with classes until execution:
```typescript
// GOOD - classes until LLM calls the tool
const toolClasses = await getAvailableToolClasses(config);
const toolMap = Object.fromEntries(
  toolClasses.map((ToolClass) => [ToolClass.toolName, ToolClass])
);
```

✅ **DO** instantiate individually on-demand:
```typescript
// GOOD - instantiate only when called
const ToolClass = toolMap[toolName];
const instance = await createToolInstance(ToolClass, userContext);
const result = await instance.execute(input);
```

## Summary Table

| Phase | What | When | Why |
|-------|------|------|-----|
| Startup | Register tool classes | Once | Enable metadata access |
| Request Start | Get available tool classes | Per request | Check which tools are available |
| LLM Planning | Access static properties | Per request | LLM decides which tools to call |
| Tool Call | Instantiate specific tool | Per tool call | Execute with user context |
| After Execution | Discard instance | Per tool call | No state retention |

## Key Functions

- `registerToolClasses()` - Register classes at startup (metadata access)
- `getAvailableToolClasses(config)` - Get classes available for this request
- `createToolInstance(ToolClass, config)` - Instantiate ONE tool when LLM calls it
