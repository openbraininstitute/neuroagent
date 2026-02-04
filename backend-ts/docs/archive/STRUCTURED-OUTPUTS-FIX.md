# Structured Outputs Configuration Fix

## Problem

The TypeScript backend was encountering errors with optional tool parameters:

```
Invalid schema for function 'example_tool': In context=(), 'required' is required to be supplied and to be an array including every key in properties. Missing 'maxResults'.
```

This occurred because OpenAI's strict mode requires all properties to be in the `required` array, but we want to support optional parameters like the Python backend does.

## Solution

Set `structuredOutputs: false` at the **model level** when creating OpenAI model instances. This is the correct and cleanest approach according to Vercel AI SDK v4.3.19 documentation.

### Changes Made

#### Model-Level Configuration (`backend-ts/src/lib/agents/routine.ts`)

Modified `getProviderAndModel()` to pass `structuredOutputs: false` when creating OpenAI models:

```typescript
private getProviderAndModel(modelIdentifier: string): any {
  if (modelIdentifier.startsWith('openai/')) {
    const modelName = modelIdentifier.replace('openai/', '');
    // Set structuredOutputs: false to allow optional parameters in tool schemas
    return this.openaiClient(modelName, { structuredOutputs: false });
  }
  // ... other providers
}
```

#### Simplified Tool Schema Generation (`backend-ts/src/lib/tools/base-tool.ts`)

The tool schema generation is now clean and simple - just pass the Zod schema directly:

```typescript
toVercelTool(): Tool {
  return vercelTool({
    description: this.getDescription(),
    parameters: this.inputSchema,
    execute: async (input: z.infer<TInput>) => {
      return await this.execute(input);
    },
  });
}
```

No manual schema manipulation needed! The Vercel AI SDK handles everything correctly when `structuredOutputs: false` is set at the model level.

## How It Works

When `structuredOutputs: false` is set:

- Vercel AI SDK automatically converts Zod schemas to JSON Schema
- Optional parameters (`.optional()` or `.default()`) are NOT added to the `required` array
- OpenAI accepts the schema without strict mode validation
- Everything works exactly like the Python backend

## Final Tool Schema Structure

The generated tool schemas automatically match the Python backend format:

```json
{
  "name": "tool_name",
  "description": "Tool description",
  "parameters": {
    "type": "object",
    "properties": {
      "requiredParam": { "type": "string" },
      "optionalParam": { "type": "number" }
    },
    "required": ["requiredParam"]
  }
}
```

Key points:

- `required` array only contains truly required fields (not optional ones)
- No manual schema manipulation needed
- Clean, maintainable code that follows Vercel AI SDK best practices

## Verification

Tool schemas are logged before being sent to the LLM in `routine.ts`:

```typescript
console.log('[streamChat] ========== TOOL SCHEMAS SENT TO LLM ==========');
for (const [toolName, tool] of Object.entries(tools)) {
  console.log(`Tool: ${toolName}`);
  console.log(`Description: ${(tool as any).description}`);
  console.log(`Parameters schema:`, (tool as any).parameters);
}
```

## References

- Python backend implementation: `backend/src/neuroagent/tools/base_tool.py`
- Vercel AI SDK v4.3.19 documentation on structured outputs
- OpenAI function calling documentation

## Related Documentation

- [TOOL-SCHEMA-LOGGING.md](./TOOL-SCHEMA-LOGGING.md) - Tool schema logging implementation
- [BASE-TOOL-METADATA-FIX.md](./BASE-TOOL-METADATA-FIX.md) - Tool metadata system
