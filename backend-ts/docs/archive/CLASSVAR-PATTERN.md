# Python ClassVar to TypeScript Static Properties Pattern

## Problem

In the Python backend, tools use `ClassVar` to define metadata that can be accessed directly from the class without instantiation:

```python
class BrainRegionGetAllTool(BaseTool):
    name: ClassVar[str] = "entitycore-brainregion-getall"
    name_frontend: ClassVar[str] = "Get All Brain Regions"
    description: ClassVar[str] = "..."

# Access without instantiation
tool_list: list[type[BaseTool]] = [BrainRegionGetAllTool, ...]
for tool in tool_list:
    print(tool.name)  # No instance needed!
```

This allows the `/api/tools` endpoint to return tool metadata without instantiating tools (which require user-specific context like JWT tokens).

## Solution: TypeScript Static Properties

TypeScript's equivalent to Python's `ClassVar` is **static readonly properties**:

```typescript
class BrainRegionGetAllTool extends BaseTool {
  static readonly toolName = "entitycore-brainregion-getall";
  static readonly toolNameFrontend = "Get All Brain Regions";
  static readonly toolDescription = "...";

  // Instance properties for execution
  contextVariables: EntitycoreContextVariables;
  inputSchema = BrainRegionGetAllInputSchema;
}

// Access without instantiation
const toolClasses: ToolClass[] = [BrainRegionGetAllTool, ...];
for (const ToolClass of toolClasses) {
  console.log(ToolClass.toolName);  // No instance needed!
}
```

## Implementation

### 1. ToolClass Interface

Define an interface for the static properties:

```typescript
export interface ToolClass {
  readonly toolName: string;
  readonly toolNameFrontend?: string;
  readonly toolDescription: string;
  readonly toolDescriptionFrontend?: string;
  readonly toolUtterances?: string[];
  readonly toolHil?: boolean;

  // Static health check method
  isOnline?(contextVariables: BaseContextVariables): Promise<boolean>;

  // Constructor
  new (contextVariables: any): BaseTool<any, any>;
}
```

### 2. Tool Registry

The registry stores **class references only** (not instances):

```typescript
export class ToolRegistry {
  private toolClasses: Map<string, ToolClass> = new Map();

  // Register class for metadata access
  registerClass(ToolClass: ToolClass): void {
    this.toolClasses.set(ToolClass.toolName, ToolClass);
  }

  // Get all registered classes
  getAllClasses(): ToolClass[] {
    return Array.from(this.toolClasses.values());
  }

  // Get metadata without instantiation
  getAllMetadata(): ToolMetadata[] {
    return Array.from(this.toolClasses.values()).map((ToolClass) => ({
      name: ToolClass.toolName,
      nameFrontend: ToolClass.toolNameFrontend,
      description: ToolClass.toolDescription,
      // ...
    }));
  }
}
```

**Note**: The registry does NOT store instances. Tools are instantiated on-demand when needed for execution.

### 3. Tool Registration

Register classes once at startup:

```typescript
export async function registerToolClasses() {
  const { toolRegistry } = await import('./base-tool');

  const toolClasses: ToolClass[] = [
    WebSearchTool as unknown as ToolClass,
    LiteratureSearchTool as unknown as ToolClass,
    BrainRegionGetAllTool as unknown as ToolClass,
    // ...
  ];

  for (const ToolClass of toolClasses) {
    toolRegistry.registerClass(ToolClass);
  }
}
```

### 4. API Routes

#### Metadata Endpoint (No Instantiation)

```typescript
// GET /api/tools - List all tools
export async function GET(request: NextRequest) {
  // Register classes if not already registered (lightweight operation)
  if (toolRegistry.getAllClasses().length === 0) {
    await registerToolClasses();
  }

  // Get metadata directly from classes - NO INSTANTIATION
  const toolClasses = toolRegistry.getAllClasses();
  const toolsResponse = toolClasses.map((ToolClass) => ({
    name: ToolClass.toolName,
    name_frontend: ToolClass.toolNameFrontend || ToolClass.toolName,
  }));

  return NextResponse.json(toolsResponse);
}
```

### Execution Endpoint (Instantiate on Demand)

```typescript
// POST /api/chat - Execute tools during chat
export async function POST(request: NextRequest) {
  const session = await validateAuth(request);
  const { messages } = await request.json();

  // Get available tool CLASSES based on configuration
  const toolClasses = await getAvailableToolClasses({
    exaApiKey: settings.exaApiKey,
    entitycoreUrl: settings.entitycoreUrl,
    entityFrontendUrl: settings.frontendBaseUrl,
    obiOneUrl: settings.obiOneUrl,
    // User-specific context (will be used when instantiating)
    jwtToken: session.accessToken,
    vlabId: session.user.vlabId,
    projectId: session.user.projectId,
  });

  // Create tool map: { toolName: ToolClass }
  const toolMap = Object.fromEntries(
    toolClasses.map((ToolClass) => [ToolClass.toolName, ToolClass])
  );

  // Convert to Vercel AI SDK format with lazy instantiation
  const vercelTools: Record<string, Tool> = {};
  for (const [name, ToolClass] of Object.entries(toolMap)) {
    vercelTools[name] = {
      description: ToolClass.toolDescription,
      parameters: ToolClass.inputSchema, // Static property
      execute: async (input: any) => {
        // Instantiate ONLY when LLM calls this specific tool
        const toolInstance = await createToolInstance(ToolClass, {
          exaApiKey: settings.exaApiKey,
          entitycoreUrl: settings.entitycoreUrl,
          entityFrontendUrl: settings.frontendBaseUrl,
          jwtToken: session.accessToken,
          vlabId: session.user.vlabId,
          projectId: session.user.projectId,
          obiOneUrl: settings.obiOneUrl,
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

## Critical Principle: Lazy Instantiation

**Tools are ONLY instantiated right before calling `execute()`**. Never at startup, never for metadata access.

### Why?

1. **User-specific context**: Tools need JWT tokens, vlab IDs, project IDs - all user-specific
2. **Request isolation**: Each request must have its own tool instances
3. **Memory efficiency**: Don't create objects until needed

### When to Use Classes vs Instances

| Operation | Use | Example |
|-----------|-----|---------|
| Get metadata | **Class** (static properties) | `ToolClass.toolName` |
| Check health | **Class** (static method) | `ToolClass.isOnline(context)` |
| List tools | **Class** references | `toolRegistry.getAllClasses()` |
| Execute tool | **Instance** (with user context) | `new Tool(userContext).execute(input)` |

## Benefits

1. **No Instantiation Required**: Metadata access doesn't require creating tool instances
2. **Matches Python Pattern**: Direct translation of Python's `ClassVar` approach
3. **Type Safety**: TypeScript enforces the static property contract via `ToolClass` interface
4. **Lazy Instantiation**: Tools are only created when needed for execution
5. **Separation of Concerns**:
   - Classes = metadata (static, shared, no user context)
   - Instances = execution (user-specific context, created per-request)

## Migration Checklist

For each tool class:

- [ ] Add `static readonly toolName`
- [ ] Add `static readonly toolNameFrontend` (optional)
- [ ] Add `static readonly toolDescription`
- [ ] Add `static readonly toolDescriptionFrontend` (optional)
- [ ] Add `static readonly toolUtterances` (optional)
- [ ] Add `static readonly toolHil` (optional)
- [ ] Add `static isOnline()` method if health check needed
- [ ] Keep instance properties for execution context

## Example Tool Implementation

```typescript
export class BrainRegionGetAllTool extends EntityCoreTool<typeof BrainRegionGetAllInputSchema> {
  // Static properties (ClassVar equivalent)
  static readonly toolName = 'entitycore-brainregion-getall';
  static readonly toolNameFrontend = 'Get All Brain Regions';
  static readonly toolDescription = 'Searches a neuroscience based knowledge graph...';
  static readonly toolDescriptionFrontend = 'Search and retrieve brain regions...';
  static readonly toolUtterances = [
    'Find brain regions.',
    'Show me available brain regions.',
  ];
  static readonly toolHil = false;

  // Instance properties (for execution)
  contextVariables: EntitycoreContextVariables;
  inputSchema = BrainRegionGetAllInputSchema;

  constructor(contextVariables: EntitycoreContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: BrainRegionGetAllInput): Promise<BrainRegionGetAllOutput> {
    // Implementation using this.contextVariables
  }

  // Static health check
  static async isOnline(contextVariables: EntitycoreContextVariables): Promise<boolean> {
    // Check if EntityCore is available
  }
}
```
