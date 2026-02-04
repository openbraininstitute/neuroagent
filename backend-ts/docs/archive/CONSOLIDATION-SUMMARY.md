# Tool System Consolidation Summary

## Decision: Keep V1, Remove V2

After fixing the root causes of the performance and validation issues, we consolidated back to a single tool system (V1).

## Why V2 Was Created

During troubleshooting, V2 was created to:

1. Align with Python backend's static metadata pattern
2. Eliminate the registry pattern (thought to be causing slowness)
3. Provide faster metadata access

## Why V2 Is No Longer Needed

The **real issues** were:

1. ❌ Missing `.optional()` before `.default()` in Zod schemas → **Fixed in V1**
2. ❌ Tools not passed to LLM call → **Fixed in V1**
3. ❌ Using deprecated `CoreTool` instead of `Tool` → **Fixed in V1**

**None of these issues required a new architecture.**

## What Was Removed

- `base-tool-v2.ts`
- `web-search-v2.ts`
- `literature-search-v2.ts`
- `tool-list.ts`
- `__tests__/tool-system-v2.test.ts`
- V2 references in `index.ts`

## What Remains (V1)

- `base-tool.ts` - Base class with instance-level metadata
- `web-search.ts` - Web search tool
- `literature-search.ts` - Literature search tool
- `entitycore/` - EntityCore tools
- `obione/` - OBIOne tools
- `index.ts` - Tool factory and initialization

## Key Fixes Applied to V1

### 1. Zod Schema Fix

```typescript
// ❌ Before (caused OpenAI validation error)
z.number().default(5);

// ✅ After (works with all providers)
z.number().optional().default(5);
```

### 2. Tool Integration Fix

```typescript
// ❌ Before (tools not available to LLM)
const result = streamText({
  model,
  messages,
  // tools missing!
});

// ✅ After (tools available)
const result = streamText({
  model,
  messages,
  tools, // ← Added
});
```

### 3. Deprecated API Fix

```typescript
// ❌ Before (deprecated)
import { CoreTool } from 'ai';

// ✅ After (modern)
import { Tool } from 'ai';
```

## Performance Results

### Question Suggestions Endpoint

- **Before**: 55+ seconds (initializing all tools including MCP)
- **After**: 2-5 seconds (using static tool descriptions)

### Solution

Instead of initializing tools, we use a simple function that returns hardcoded descriptions:

```typescript
function getToolDescriptions(): string[] {
  return [
    'web_search: Search the web...',
    'literature_search: Search papers...',
    // ... more tools
  ];
}
```

This avoids the expensive MCP tool initialization while still providing LLM context.

## Architecture

### V1 Pattern (Current)

```typescript
// Tool with instance-level metadata
class WebSearchTool extends BaseTool<typeof WebSearchInputSchema> {
  metadata: ToolMetadata = { name: 'web_search', ... };
  inputSchema = WebSearchInputSchema;

  constructor(private exaApiKey: string) {
    super();
  }

  async execute(input: WebSearchInput): Promise<WebSearchOutput> {
    // Implementation
  }
}

// Usage
const tool = new WebSearchTool(apiKey);
const result = await tool.execute({ query: 'test', num_results: 5 });
```

### Vercel AI SDK Integration

```typescript
// Convert to Vercel AI SDK format
const vercelTool = tool.toVercelTool();

// The tool() function ensures compatibility with ALL providers
const result = streamText({
  model,
  messages,
  tools: {
    web_search: vercelTool,
  },
});
```

## Benefits of Consolidation

1. **Simpler**: One tool system instead of two
2. **Less confusion**: No V1 vs V2 decision
3. **Easier maintenance**: Single codebase to maintain
4. **Same performance**: V1 with fixes is just as fast
5. **Provider-agnostic**: Vercel AI SDK's `tool()` handles all providers

## Lessons Learned

1. **Fix root causes first** before architectural changes
2. **Vercel AI SDK's `tool()` function** is the single source of truth for schema validation
3. **Performance issues** often have simple solutions (static descriptions vs initialization)
4. **Deprecation warnings** matter - use modern APIs

## Conclusion

V1 with the fixes applied is the right solution. No need for V2.
