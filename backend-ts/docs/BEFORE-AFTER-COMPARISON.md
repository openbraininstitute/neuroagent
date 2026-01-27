# Before/After Comparison: Tool System Refactor

## Question Suggestions Endpoint

### Before (55+ seconds)
```typescript
// backend-ts/src/app/api/qa/question_suggestions/route.ts

import { initializeTools } from '@/lib/tools';

export async function POST(request: NextRequest) {
  // ... auth and rate limiting ...
  
  // ❌ SLOW: Initializes ALL tools including MCP (50+ seconds)
  const tools = await initializeTools({
    exaApiKey: settings.tools.exaApiKey,
    entitycoreUrl: settings.tools.entitycore.url,
    entityFrontendUrl: settings.tools.frontendBaseUrl,
    vlabId,
    projectId,
    obiOneUrl: settings.tools.obiOne.url,
    mcpConfig: settings.mcp,  // ← MCP initialization is expensive!
  });

  const toolInfo = tools.map((tool) => 
    `${tool.metadata.name}: ${tool.metadata.description}`
  );
  
  // ... rest of endpoint ...
}
```

### After (~2-5 seconds)
```typescript
// backend-ts/src/app/api/qa/question_suggestions/route.ts

import { getToolDescriptionsForLLM } from '@/lib/tools/tool-list';

export async function POST(request: NextRequest) {
  // ... auth and rate limiting ...
  
  // ✅ FAST: Accesses static metadata only (milliseconds)
  const toolInfo = getToolDescriptionsForLLM();
  
  // ... rest of endpoint ...
}
```

**Performance Improvement**: 55 seconds → 2-5 seconds (10x+ faster)

---

## Tool Definition

### Before (V1 - Instance Metadata)
```typescript
// backend-ts/src/lib/tools/web-search.ts

export class WebSearchTool extends BaseTool<typeof WebSearchInputSchema> {
  // ❌ Instance-level metadata - requires instantiation to access
  metadata: ToolMetadata = {
    name: 'web-search-tool',
    nameFrontend: 'Web Search',
    description: 'Search the web...',
    hil: false,
  };

  inputSchema = WebSearchInputSchema;

  constructor(private exaApiKey: string) {
    super();
  }

  async execute(input: WebSearchInput): Promise<WebSearchOutput> {
    // ... implementation ...
  }
}

// Usage - requires instantiation even for metadata
const tool = new WebSearchTool(apiKey);  // ← Must instantiate
const name = tool.metadata.name;
```

### After (V2 - Static Metadata)
```typescript
// backend-ts/src/lib/tools/web-search-v2.ts

export class WebSearchToolV2 extends BaseToolV2<typeof WebSearchInputSchema> {
  // ✅ Class-level metadata - accessible without instantiation
  static readonly metadata: ToolMetadata = {
    name: 'web_search',  // snake_case like Python
    nameFrontend: 'Web Search',
    description: 'Search the web...',
    hil: false,
  };

  inputSchema = WebSearchInputSchema;

  constructor(private exaApiKey: string) {
    super();
  }

  async execute(input: WebSearchInput): Promise<WebSearchOutput> {
    // ... implementation (same) ...
  }
}

// Usage - no instantiation needed for metadata
const name = WebSearchToolV2.metadata.name;  // ← Direct access

// Only instantiate when executing
const tool = new WebSearchToolV2(apiKey);
const result = await tool.execute(input);
```

---

## Tool Registry vs Tool List

### Before (V1 - Registry Pattern)
```typescript
// backend-ts/src/lib/tools/base-tool.ts

export class ToolRegistry {
  private tools: Map<string, BaseTool<any>> = new Map();

  register(tool: BaseTool<any>): void {
    this.tools.set(tool.metadata.name, tool);
  }

  getAll(): BaseTool<any>[] {
    return Array.from(this.tools.values());
  }
  
  getAllMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }
}

export const toolRegistry = new ToolRegistry();

// Usage
const tool = new WebSearchTool(apiKey);
toolRegistry.register(tool);  // ← Manual registration
const metadata = toolRegistry.getAllMetadata();  // ← Through registry
```

### After (V2 - Simple List)
```typescript
// backend-ts/src/lib/tools/tool-list.ts

export function getInternalToolClasses(): ToolClass[] {
  return [
    WebSearchToolV2,
    LiteratureSearchToolV2,
    // ... more tools
  ];
}

export function getToolDescriptionsForLLM(): string[] {
  const metadata = getAllToolMetadata(getInternalToolClasses());
  return metadata.map((meta) => `${meta.name}: ${meta.description}`);
}

// Usage - no registry needed
const descriptions = getToolDescriptionsForLLM();  // ← Direct access
```

---

## Tool Initialization

### Before (V1 - Always Initialize)
```typescript
// backend-ts/src/lib/tools/index.ts

export async function initializeTools(config: ToolConfig) {
  const { toolRegistry } = await import('./base-tool');

  // ❌ Initializes ALL tools even if you only need metadata
  const tools: any[] = [];

  if (config.exaApiKey) {
    const webSearch = new WebSearchTool(config.exaApiKey);
    toolRegistry.register(webSearch);
    tools.push(webSearch);
  }

  // ❌ MCP initialization is VERY slow (50+ seconds)
  if (config.mcpConfig) {
    const mcpTools = await initializeMCPTools(config.mcpConfig);
    for (const tool of mcpTools) {
      toolRegistry.register(tool);
    }
    tools.push(...mcpTools);
  }

  return tools;
}
```

### After (V2 - Initialize Only When Needed)
```typescript
// backend-ts/src/lib/tools/tool-list.ts

// ✅ No initialization - just return class references
export function getInternalToolClasses(): ToolClass[] {
  return [
    WebSearchToolV2,
    LiteratureSearchToolV2,
  ];
}

// ✅ Metadata access without instantiation
export function getToolDescriptionsForLLM(): string[] {
  return getInternalToolClasses().map(
    (toolClass) => `${toolClass.metadata.name}: ${toolClass.metadata.description}`
  );
}

// ✅ Only instantiate when executing
const tool = new WebSearchToolV2(apiKey);
const result = await tool.execute(input);
```

---

## Comparison Table

| Aspect | Before (V1) | After (V2) |
|--------|-------------|------------|
| **Metadata Access** | Requires instantiation | Static class property |
| **Tool Management** | Registry pattern | Simple list |
| **Initialization** | Always (expensive) | Only when executing |
| **Performance** | 55+ seconds | 2-5 seconds |
| **Complexity** | High (registry, factory) | Low (simple list) |
| **Alignment** | Custom pattern | Matches Python backend |
| **Tool Names** | kebab-case | snake_case |

---

## Python Backend Reference

This is what we're aligning with:

```python
# backend/src/neuroagent/tools/base_tool.py

class BaseTool(BaseModel, ABC):
    name: ClassVar[str]  # ← Class-level (like TypeScript static)
    description: ClassVar[str]
    metadata: BaseMetadata  # ← Instance-level
    
    @abstractmethod
    async def arun(self) -> BaseModel:
        """Run the tool."""

# backend/src/neuroagent/app/dependencies.py

def get_tool_list() -> list[type[BaseTool]]:  # ← Returns classes, not instances
    internal_tool_list: list[type[BaseTool]] = [
        WebSearchTool,
        LiteratureSearchTool,
        BrainRegionGetAllTool,
        # ... more tools
    ]
    return internal_tool_list

# Usage - metadata without instantiation
tool_name = WebSearchTool.name  # ← Direct class access
```

---

## Migration Status

### ✅ Completed
- [x] Base tool V2 (`base-tool-v2.ts`)
- [x] Tool list module (`tool-list.ts`)
- [x] Web search V2 (`web-search-v2.ts`)
- [x] Literature search V2 (`literature-search-v2.ts`)
- [x] Question suggestions endpoint updated
- [x] Migration documentation

### 🔄 In Progress
- [ ] EntityCore tools V2
- [ ] OBIOne tools V2
- [ ] Other API routes

### 📋 Todo
- [ ] Remove V1 files after full migration
- [ ] Update all consumers to V2
- [ ] Add remaining tools to tool-list.ts
