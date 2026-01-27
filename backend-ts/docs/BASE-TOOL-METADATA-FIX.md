# Base Tool Metadata vs Context Variables Fix

## Problem

The TypeScript `BaseTool` implementation incorrectly used `metadata` for tool descriptive information (name, description, utterances), when it should have been used for runtime context variables (HTTP clients, API URLs, configuration) passed from the app to the tool.

In the Python implementation:
- **Class variables** (`name`, `description`, `utterances`, etc.) = Tool metadata for LLM
- **Instance field `metadata`** = Context variables from app (like `httpx_client`, `entitycore_url`, `vlab_id`)

## Solution

### 1. Renamed Instance Field

Changed `metadata` → `contextVariables` to accurately reflect its purpose:

```typescript
// Before (incorrect)
abstract metadata: ToolMetadata;

// After (correct)
abstract contextVariables: TContext extends BaseContextVariables;
```

### 2. Static Properties for Tool Metadata

Tool descriptive information is now defined as static readonly properties:

```typescript
export class ExampleTool extends BaseTool<...> {
  // Static properties (tool metadata) - equivalent to Python ClassVar
  static readonly toolName = 'example_tool';
  static readonly toolNameFrontend = 'Example Tool';
  static readonly toolDescription = '...';
  static readonly toolDescriptionFrontend = '...';
  static readonly toolUtterances = ['example', 'demo'];
  static readonly toolHil = false;
  
  // Instance field (runtime dependencies)
  override contextVariables: ExampleToolContextVariables;
  
  constructor(contextVariables: ExampleToolContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }
}
```

### 3. Property Naming Convention

We use prefixed names (`toolName`, `toolDescription`, etc.) instead of plain names to avoid conflicts with built-in class properties:

- `name` → `toolName` (avoids conflict with `Function.name`)
- `description` → `toolDescription`
- `utterances` → `toolUtterances`
- `hil` → `toolHil`
- `nameFrontend` → `toolNameFrontend`
- `descriptionFrontend` → `toolDescriptionFrontend`

### 4. Context Variables Interface

Created proper interfaces for context variables:

```typescript
// Base interface
export interface BaseContextVariables {
  // Base interface - subclasses define specific context variables
}

// EntityCore-specific context
export interface EntitycoreContextVariables extends BaseContextVariables {
  httpxClient: any;
  entitycoreUrl: string;
  vlabId?: string;
  projectId?: string;
  entityFrontendUrl: string;
}
```

## Key Concepts

### Tool Metadata (Static Properties)
- Defined once per tool class
- Used by LLM to understand tool capabilities
- Includes: name, description, utterances, HIL flag
- Accessed via helper methods: `getName()`, `getDescription()`, etc.

### Context Variables (Instance Field)
- Passed from app to tool at runtime
- Contains dependencies: HTTP clients, API URLs, auth tokens
- Different for each tool instance
- Accessed via `this.contextVariables` in tool methods

## Python to TypeScript Mapping

| Python | TypeScript |
|--------|-----------|
| `name: ClassVar[str]` | `static readonly toolName: string` |
| `description: ClassVar[str]` | `static readonly toolDescription: string` |
| `utterances: ClassVar[list[str]]` | `static readonly toolUtterances: string[]` |
| `hil: ClassVar[bool]` | `static readonly toolHil: boolean` |
| `metadata: EntitycoreMetadata` | `contextVariables: EntitycoreContextVariables` |

## Migration Guide

For existing tools, update as follows:

```typescript
// Before
export class MyTool extends BaseTool<typeof MyInputSchema> {
  metadata: ToolMetadata = {
    name: 'my-tool',
    description: '...',
  };
  
  inputSchema = MyInputSchema;
  
  async execute(input) {
    // No access to runtime dependencies
  }
}

// After
interface MyToolContextVariables extends BaseContextVariables {
  apiUrl: string;
  apiKey?: string;
}

export class MyTool extends BaseTool<
  typeof MyInputSchema,
  MyToolContextVariables
> {
  static readonly toolName = 'my-tool';
  static readonly toolDescription = '...';
  
  override contextVariables: MyToolContextVariables;
  override inputSchema = MyInputSchema;
  
  constructor(contextVariables: MyToolContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }
  
  async execute(input) {
    // Access runtime dependencies
    const { apiUrl, apiKey } = this.contextVariables;
  }
}
```

## Files Changed

- `backend-ts/src/lib/tools/base-tool.ts` - Core base class
- `backend-ts/src/lib/tools/example-tool.ts` - Reference implementation

## Next Steps

1. Update all existing tool implementations to use new pattern
2. Update EntityCore and OBIOne base tools
3. Update tool registry and instantiation code
4. Update tests to pass context variables to tool constructors
