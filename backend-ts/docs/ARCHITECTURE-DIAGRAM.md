# Tool System Architecture

## Before (V1 - Registry Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│                   Question Suggestions API                   │
│                                                              │
│  1. Call initializeTools(config)                            │
│     ↓                                                        │
│  2. Initialize ALL tools (50+ seconds for MCP)              │
│     ↓                                                        │
│  3. Register in toolRegistry                                │
│     ↓                                                        │
│  4. Get metadata from instances                             │
│     ↓                                                        │
│  5. Format for LLM                                          │
│                                                              │
│  Total: 55+ seconds ❌                                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      Tool Architecture                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ BaseTool (Abstract)                                  │    │
│  │ - metadata: ToolMetadata (instance-level)           │    │
│  │ - inputSchema: ZodType                              │    │
│  │ - execute(): Promise<unknown>                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ▲                                    │
│                          │                                    │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐          │
│  │WebSearchTool│  │LiteratureTool│  │EntityCore │          │
│  │             │  │              │  │Tools      │          │
│  │metadata: {} │  │metadata: {}  │  │metadata: {}│          │
│  └─────────────┘  └──────────────┘  └────────────┘          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ToolRegistry (Singleton)                             │    │
│  │ - tools: Map<string, BaseTool>                      │    │
│  │ - register(tool)                                     │    │
│  │ - getAll()                                           │    │
│  │ - getAllMetadata()                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Problem: Must instantiate to access metadata ❌             │
└──────────────────────────────────────────────────────────────┘
```

## After (V2 - Python-Style Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│                   Question Suggestions API                   │
│                                                              │
│  1. Call getToolDescriptionsForLLM()                        │
│     ↓                                                        │
│  2. Access static metadata (no instantiation)               │
│     ↓                                                        │
│  3. Format for LLM                                          │
│                                                              │
│  Total: 2-5 seconds ✅                                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      Tool Architecture                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ BaseToolV2 (Abstract)                                │    │
│  │ + static metadata: ToolMetadata (class-level) ✅    │    │
│  │ - inputSchema: ZodType                              │    │
│  │ - execute(): Promise<unknown>                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ▲                                    │
│                          │                                    │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼────────┐  ┌───▼────────┐  ┌───▼────────┐        │
│  │WebSearchToolV2│  │LiteratureV2│  │EntityCoreV2│        │
│  │               │  │            │  │Tools       │        │
│  │static metadata│  │static meta │  │static meta │        │
│  └───────────────┘  └────────────┘  └────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ tool-list.ts (Simple Functions)                      │    │
│  │                                                       │    │
│  │ getInternalToolClasses(): ToolClass[]                │    │
│  │   return [WebSearchToolV2, LiteratureToolV2, ...]   │    │
│  │                                                       │    │
│  │ getToolDescriptionsForLLM(): string[]                │    │
│  │   return classes.map(c => c.metadata.description)   │    │
│  │                                                       │    │
│  │ getToolClassByName(name): ToolClass | undefined     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Benefit: Access metadata without instantiation ✅           │
└──────────────────────────────────────────────────────────────┘
```

## Comparison: Metadata Access

### V1 (Slow)

```
User Request
    ↓
initializeTools(config)
    ↓
new WebSearchTool(apiKey)          ← Instantiation
    ↓
new LiteratureSearchTool(apiKey)   ← Instantiation
    ↓
initializeMCPTools(mcpConfig)      ← 50+ seconds!
    ↓
toolRegistry.register(...)
    ↓
toolRegistry.getAllMetadata()
    ↓
tool.metadata.name                 ← Finally get metadata
    ↓
Response (55+ seconds)
```

### V2 (Fast)

```
User Request
    ↓
getToolDescriptionsForLLM()
    ↓
WebSearchToolV2.metadata.name      ← Direct static access
    ↓
LiteratureToolV2.metadata.name     ← Direct static access
    ↓
Response (2-5 seconds)
```

## Comparison: Tool Execution

### V1 (Same)

```
Execution Request
    ↓
const tool = new WebSearchTool(apiKey)
    ↓
await tool.execute(input)
    ↓
Response
```

### V2 (Same)

```
Execution Request
    ↓
const tool = new WebSearchToolV2(apiKey)
    ↓
await tool.execute(input)
    ↓
Response
```

**Note**: Execution flow is identical. The difference is only in metadata access.

## Python Backend Reference

```python
# Python backend pattern (what we're matching)

class BaseTool(BaseModel, ABC):
    name: ClassVar[str]          # ← Class-level (static)
    description: ClassVar[str]   # ← Class-level (static)
    metadata: BaseMetadata       # ← Instance-level

    @abstractmethod
    async def arun(self) -> BaseModel:
        pass

# Usage
tool_name = WebSearchTool.name   # ← Direct class access
tool_list = [WebSearchTool, LiteratureSearchTool, ...]
```

## Key Insight

The registry pattern was solving a problem that doesn't exist when using static metadata:

- **V1**: Need registry because metadata is instance-level
- **V2**: No registry needed because metadata is class-level

This is exactly how the Python backend works with `ClassVar`.

## File Organization

```
backend-ts/src/lib/tools/
├── base-tool.ts              # V1 (legacy)
├── base-tool-v2.ts           # V2 (new) ✅
├── tool-list.ts              # V2 tool registry ✅
├── web-search.ts             # V1 (legacy)
├── web-search-v2.ts          # V2 (new) ✅
├── literature-search.ts      # V1 (legacy)
├── literature-search-v2.ts   # V2 (new) ✅
├── entitycore/
│   ├── base.ts               # V1 (to be migrated)
│   └── ...
├── obione/
│   └── ...                   # V1 (to be migrated)
└── __tests__/
    └── tool-system-v2.test.ts ✅
```

## Migration Strategy

```
Phase 1: Coexistence (Current)
├── V1 tools continue working
├── V2 tools available
└── Question suggestions uses V2 ✅

Phase 2: Gradual Migration
├── Refactor EntityCore tools → V2
├── Refactor OBIOne tools → V2
└── Update consumers → V2

Phase 3: Cleanup
├── Remove V1 files
├── Remove registry pattern
└── Single consistent pattern ✅
```
