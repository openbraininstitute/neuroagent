# Tool Instantiation Pattern

## Core Principle

**Tools are ONLY instantiated right before calling `execute()`**. Never at startup, never for metadata access.

## Two-Phase Approach

### Phase 1: Class Registration (Startup)

Register tool **classes** (not instances) for metadata access:

```typescript
// Called once at startup or on-demand
await registerToolClasses();

// Now you can access metadata without instantiation
const toolClasses = toolRegistry.getAllClasses();
for (const ToolClass of toolClasses) {
  console.log(ToolClass.toolName);        // Static property
  console.log(ToolClass.toolDescription); // Static property
}
```

### Phase 2: Instance Creation (Per-Request)

Create tool **instances** only when needed for execution:

```typescript
// Called for EACH REQUEST with user-specific context
const tools = await createToolInstances({
  exaApiKey: settings.exaApiKey,
  entitycoreUrl: settings.entitycoreUrl,
  jwtToken: userJwtToken,      // User-specific!
  vlabId: userVlabId,           // User-specific!
  projectId: userProjectId,     // User-specific!
});

// Now you can execute tools
const result = await tools[0].execute(input);
```

## API Endpoint Patterns

### Metadata Endpoint (No Instantiation)

```typescript
// GET /api/tools
export async function GET(request: NextRequest) {
  await validateAuth(request);

  // Register classes if needed (lightweight)
  if (toolRegistry.getAllClasses().length === 0) {
    await registerToolClasses();
  }

  // Access metadata from classes - NO INSTANTIATION
  const toolClasses = toolRegistry.getAllClasses();
  return NextResponse.json(
    toolClasses.map((ToolClass) => ({
      name: ToolClass.toolName,
      name_frontend: ToolClass.toolNameFrontend || ToolClass.toolName,
    }))
  );
}
```

### Detailed Metadata Endpoint (No Instantiation)

```typescript
// GET /api/tools/:name
export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  await validateAuth(request);

  // Get class from registry
  const ToolClass = toolRegistry.getClass(params.name);
  if (!ToolClass) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }

  // Access all metadata from static properties - NO INSTANTIATION
  return NextResponse.json({
    name: ToolClass.toolName,
    name_frontend: ToolClass.toolNameFrontend,
    description: ToolClass.toolDescription,
    description_frontend: ToolClass.toolDescriptionFrontend,
    utterances: ToolClass.toolUtterances,
    hil: ToolClass.toolHil,
    // Health check using static method
    is_online: ToolClass.isOnline
      ? await ToolClass.isOnline(contextVariables)
      : true,
  });
}
```

### Execution Endpoint (Instantiate on Demand)

```typescript
// POST /api/chat
export async function POST(request: NextRequest) {
  const session = await validateAuth(request);
  const { messages } = await request.json();

  // Get available tool CLASSES (not instances!)
  const toolClasses = await getAvailableToolClasses({
    exaApiKey: settings.exaApiKey,
    entitycoreUrl: settings.entitycoreUrl,
    // ... other config
  });

  // Create tool map from classes
  const toolMap = Object.fromEntries(
    toolClasses.map((ToolClass) => [ToolClass.toolName, ToolClass])
  );

  // When LLM calls a tool, instantiate it individually
  const handleToolCall = async (toolName: string, input: any) => {
    const ToolClass = toolMap[toolName];
    if (!ToolClass) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Instantiate ONLY this specific tool with user context
    const toolInstance = await createToolInstance(ToolClass, {
      jwtToken: session.accessToken,
      vlabId: session.user.vlabId,
      projectId: session.user.projectId,
      // ... other user-specific context
    });

    return await toolInstance.execute(input);
  };

  // Use with Vercel AI SDK or your agent framework
  // ...
}
```

## Why This Pattern?

### 1. User-Specific Context

Tools need user-specific data that's only available at request time:
- JWT tokens for authentication
- Virtual lab IDs
- Project IDs
- User preferences

### 2. Request Isolation

Each request must have its own tool instances to prevent:
- Data leakage between users
- Race conditions
- Stale authentication tokens

### 3. Memory Efficiency

Don't create objects until needed:
- Metadata endpoints don't need instances
- Health checks can use static methods
- Only execution requires instances

### 4. Matches Python Pattern

Python's FastAPI backend follows the same pattern:

```python
# Dependency injection provides list[type[BaseTool]]
def get_tool_list() -> list[type[BaseTool]]:
    return [BrainRegionGetAllTool, WebSearchTool, ...]

# Metadata endpoint - no instantiation
@router.get("/tools")
def get_tools(tool_list: list[type[BaseTool]] = Depends(get_tool_list)):
    return [ToolMetadata(name=tool.name, ...) for tool in tool_list]

# Execution - instantiate with user context
async def execute_tool(tool_class: type[BaseTool], context: dict):
    tool = tool_class(metadata=context)  # Instantiate here!
    return await tool.arun()
```

## Common Mistakes to Avoid

❌ **DON'T** instantiate tools at startup:
```typescript
// BAD - creates instances with no user context
const tools = await createToolInstances(config);
app.set('tools', tools);
```

❌ **DON'T** cache tool instances across requests:
```typescript
// BAD - shares instances between users
let cachedTools: BaseTool[] = [];
if (cachedTools.length === 0) {
  cachedTools = await createToolInstances(config);
}
```

❌ **DON'T** instantiate tools for metadata access:
```typescript
// BAD - unnecessary instantiation
const tool = new BrainRegionGetAllTool(context);
console.log(tool.getName()); // Use ToolClass.toolName instead!
```

✅ **DO** register classes once:
```typescript
// GOOD - lightweight class registration
await registerToolClasses();
```

✅ **DO** create instances per-request:
```typescript
// GOOD - fresh instances with user context
const tools = await createToolInstances({
  jwtToken: session.accessToken,
  vlabId: session.user.vlabId,
  // ...
});
```

✅ **DO** access metadata from classes:
```typescript
// GOOD - no instantiation needed
const ToolClass = toolRegistry.getClass('web-search');
console.log(ToolClass.toolName);
```

## Summary

| Operation | Use | When |
|-----------|-----|------|
| Register classes | `registerToolClasses()` | Once at startup |
| Get metadata | `toolRegistry.getAllClasses()` | Anytime (no instantiation) |
| Check health | `ToolClass.isOnline(context)` | Anytime (static method) |
| Execute tools | `createToolInstances(userContext)` | Per-request only |
