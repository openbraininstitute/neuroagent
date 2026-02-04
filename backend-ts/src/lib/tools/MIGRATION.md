# Tool System Migration Guide

## Overview

The TypeScript backend tool system has been refactored to align with the Python backend's simpler pattern. This eliminates the registry pattern and makes tool metadata accessible without instantiation.

## Key Changes

### Before (V1 - Registry Pattern)

```typescript
// Tools had instance-level metadata
class WebSearchTool extends BaseTool<typeof WebSearchInputSchema> {
  metadata: ToolMetadata = { name: 'web-search', ... };

  constructor(private exaApiKey: string) {
    super();
  }
}

// Required registry and initialization
const tools = await initializeTools(config);
toolRegistry.register(tool);
const metadata = toolRegistry.getAllMetadata();
```

### After (V2 - Python-Style Pattern)

```typescript
// Tools have static class-level metadata
class WebSearchToolV2 extends BaseToolV2<typeof WebSearchInputSchema> {
  static readonly metadata: ToolMetadata = { name: 'web_search', ... };

  constructor(private exaApiKey: string) {
    super();
  }
}

// No registry needed - access metadata directly
const metadata = WebSearchToolV2.metadata;
const allMetadata = getAllToolMetadata([WebSearchToolV2, LiteratureSearchToolV2]);
```

## Benefits

1. **Simpler**: No registry pattern, no initialization overhead
2. **Faster**: Metadata access without instantiation (critical for suggestions endpoint)
3. **Aligned**: Matches Python backend's `ClassVar` pattern
4. **Cleaner**: Tools are only instantiated when needed for execution

## Migration Steps

### For Tool Developers

1. **Extend BaseToolV2** instead of BaseTool
2. **Make metadata static**:
   ```typescript
   static readonly metadata: ToolMetadata = { ... };
   ```
3. **Use snake_case** for tool names (matching Python backend)
4. **Keep instance-level** inputSchema and execute method

### For Tool Consumers

1. **Access metadata statically**:

   ```typescript
   // Before
   const tool = new WebSearchTool(apiKey);
   const name = tool.metadata.name;

   // After
   const name = WebSearchToolV2.metadata.name;
   ```

2. **Use tool-list module** for getting all tools:

   ```typescript
   import { getInternalToolClasses, getToolDescriptionsForLLM } from '@/lib/tools/tool-list';

   // Get all tool classes
   const toolClasses = getInternalToolClasses();

   // Get descriptions for LLM (no instantiation!)
   const descriptions = getToolDescriptionsForLLM();
   ```

3. **Instantiate only for execution**:
   ```typescript
   // Only create instance when you need to execute
   const tool = new WebSearchToolV2(apiKey);
   const result = await tool.execute(input);
   ```

## Coexistence

Both V1 and V2 can coexist during migration:

- V1 tools: `base-tool.ts`, `web-search.ts`, etc.
- V2 tools: `base-tool-v2.ts`, `web-search-v2.ts`, etc.

Once all tools are migrated, V1 files can be removed.

## Example: Migrating a Tool

### Before (V1)

```typescript
export class MyTool extends BaseTool<typeof MyInputSchema> {
  metadata: ToolMetadata = {
    name: 'my-tool',
    description: 'Does something',
  };

  inputSchema = MyInputSchema;

  constructor(private config: string) {
    super();
  }

  async execute(input: MyInput): Promise<MyOutput> {
    // implementation
  }
}

// Usage
const tool = new MyTool(config);
toolRegistry.register(tool);
```

### After (V2)

```typescript
export class MyToolV2 extends BaseToolV2<typeof MyInputSchema> {
  static readonly metadata: ToolMetadata = {
    name: 'my_tool', // snake_case
    description: 'Does something',
  };

  inputSchema = MyInputSchema;

  constructor(private config: string) {
    super();
  }

  async execute(input: MyInput): Promise<MyOutput> {
    // implementation (same)
  }
}

// Usage - no registry needed
const description = MyToolV2.metadata.description; // Static access
const tool = new MyToolV2(config); // Only when executing
```

## Checklist for New Tools

- [ ] Extend `BaseToolV2`
- [ ] Define `static readonly metadata`
- [ ] Use snake_case for tool name
- [ ] Add to `getInternalToolClasses()` in `tool-list.ts`
- [ ] Keep inputSchema and execute as instance members
- [ ] Test metadata access without instantiation
- [ ] Test execution with instantiation

## Questions?

See the Python backend's `tools/base_tool.py` for reference on the pattern we're following.
