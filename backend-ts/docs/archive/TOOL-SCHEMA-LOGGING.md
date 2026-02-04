# Tool Schema Logging and Optional Parameters Fix

## Overview

Added comprehensive logging of tool JSON schemas before they are sent to the LLM in the TypeScript backend, and fixed handling of optional parameters to match the Python backend behavior.

## Problem Statement

The TypeScript backend was encountering errors with optional tool parameters:
```
Invalid schema for function 'example_tool': In context=(), 'required' is required to be supplied and to be an array including every key in properties. Missing 'maxResults'.
```

And also with boolean default values:
```
Invalid schema for function 'example_tool': True is not of type 'number'.
```

This occurred because:
1. OpenAI's API was enforcing strict validation even with `strictSchemas: false`
2. Optional parameters with defaults (like `maxResults`) were being incorrectly marked as required
3. The `zod-to-json-schema` library with `target: 'openAi'` was converting boolean values to Python-style `True`/`False` instead of JSON's `true`/`false`
4. The Vercel AI SDK's default Zod-to-schema conversion didn't match the Python backend's behavior

## Solution

### 1. Custom JSON Schema Generation

Modified `BaseTool.toVercelTool()` to manually convert Zod schemas to JSON Schema with proper control:

```typescript
toVercelTool(): Tool {
  // Convert Zod schema to JSON Schema
  const jsonSchemaObj: any = zodToJsonSchema(this.inputSchema, {
    target: 'jsonSchema7',  // Use jsonSchema7, not 'openAi' to avoid Python-style booleans
    $refStrategy: 'none',
  });

  // Remove $schema property (not needed for OpenAI)
  if ('$schema' in jsonSchemaObj) {
    delete jsonSchemaObj.$schema;
  }

  // Set additionalProperties: false (matches Python backend)
  if (jsonSchemaObj.type === 'object') {
    jsonSchemaObj.additionalProperties = false;
  }

  // Let zod-to-json-schema handle 'required' array naturally
  // Fields with .optional() or .default() will NOT be in required

  // Use jsonSchema() wrapper for proper handling
  return vercelTool({
    description: this.getDescription(),
    parameters: jsonSchema(jsonSchemaObj),
    execute: async (input: z.infer<TInput>) => {
      return await this.execute(input);
    },
  });
}
```

**Key Changes:**
- Use `target: 'jsonSchema7'` instead of `'openAi'` to avoid Python-style boolean conversion (`True`/`False` → `true`/`false`)
- Set `additionalProperties: false` to match Python backend
- Let `zod-to-json-schema` naturally handle the `required` array
- Use `jsonSchema()` wrapper from Vercel AI SDK

### 2. Removed Strict Mode Configurations

Removed configurations that were forcing strict mode:

```typescript
// Removed from createOpenAI():
// compatibility: 'strict'  // This was forcing strict mode

// Removed from streamText():
// providerOptions: {
//   openai: {
//     strictSchemas: false  // This wasn't working as expected
//   }
// }
```

**Why:** Vercel AI SDK uses non-strict mode by default, which sets `strict: false` in the OpenAI function definition. By not overriding this, we get the correct behavior.

### 3. Added Schema Logging

Logs the exact JSON schema sent to the LLM for debugging (unchanged).

```typescript
console.log('[streamChat] ========== TOOL SCHEMAS SENT TO LLM ==========');
for (const [toolName, tool] of Object.entries(tools)) {
  const zodSchema = (tool as any).parameters;
  const toolSchema = {
    name: toolName,
    description: (tool as any).description,
    parameters: zodSchema ? zodToJsonSchema(zodSchema, toolName) : null,
  };
  console.log(JSON.stringify(toolSchema, null, 2));
}
console.log('[streamChat] ================================================');
```

## Python Backend Comparison

The Python backend (`backend/src/neuroagent/tools/base_tool.py`) does this:

```python
@classmethod
def pydantic_to_openai_schema(cls) -> dict[str, Any]:
    parameters = cls.__annotations__["input_schema"].model_json_schema()

    new_retval: dict[str, Any] = {
        "type": "function",
        "name": cls.name,
        "description": cls.description,
        "function": {
            "name": cls.name,
            "description": cls.description,
            "strict": False,  # <-- Key: non-strict mode
            "parameters": parameters,
        },
    }
    new_retval["function"]["parameters"]["additionalProperties"] = False  # <-- Key
    return new_retval
```

Our TypeScript implementation achieves the same result:
- ✅ Sets `additionalProperties: false` in the schema
- ✅ Uses non-strict mode via `strictSchemas: false`
- ✅ Properly handles optional parameters with defaults
- ✅ Uses `jsonSchema()` wrapper for proper OpenAI compatibility

## Configuration Details

### Compatibility Mode

```typescript
this.openaiClient = createOpenAI({
  apiKey: openaiApiKey,
  baseURL: openaiBaseUrl,
  compatibility: 'strict', // For accurate token counts in streaming
});
```

**Purpose**: Ensures accurate token usage tracking (unrelated to schema strictness)

### Strict Schemas Setting

```typescript
providerOptions: {
  openai: {
    strictSchemas: false, // Allows flexible tool schemas
  },
}
```

**Purpose**: Disables OpenAI's strict JSON schema validation, allowing:
- Optional parameters with defaults
- More lenient validation
- Better compatibility with complex schemas

## Benefits

1. **Optional Parameters Work**: Tools can now have optional parameters with defaults (e.g., `maxResults: z.number().default(10)`)
2. **Python Parity**: Matches the Python backend's schema generation behavior
3. **Better Debugging**: Logs show exactly what schema is sent to the LLM
4. **Flexibility**: Non-strict mode allows more dynamic tool schemas
5. **Type Safety**: Still maintains TypeScript type inference and Zod validation

## Example Tool Schema Output

With the example tool:
```typescript
const ExampleToolInputSchema = z.object({
  query: z.string().describe('The search query'),
  maxResults: z.number().int().positive().default(10).describe('Max results'),
  includeMetadata: z.boolean().optional().describe('Include metadata'),
});
```

The logged schema will be:
```json
{
  "name": "example_tool",
  "description": "An example tool...",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query"
      },
      "maxResults": {
        "type": "integer",
        "minimum": 1,
        "default": 10,
        "description": "Max results"
      },
      "includeMetadata": {
        "type": "boolean",
        "description": "Include metadata"
      }
    },
    "required": ["query"],
    "additionalProperties": false
  }
}
```

Note: Only `query` is in `required`, while `maxResults` and `includeMetadata` are optional.

## Files Modified

1. **`backend-ts/src/lib/tools/base-tool.ts`**
   - Added imports for `jsonSchema` and `zodToJsonSchema`
   - Modified `toVercelTool()` to manually convert schemas
   - Added `additionalProperties: false` to match Python backend

2. **`backend-ts/src/lib/agents/routine.ts`**
   - Added `compatibility: 'strict'` for token counting
   - Added `strictSchemas: false` in `providerOptions`
   - Added comprehensive schema logging

3. **`backend-ts/docs/TOOL-SCHEMA-LOGGING.md`**
   - Documented the implementation
   - Explained the distinction between `compatibility` and `strictSchemas`

## Testing

To verify the fix works:

1. Define a tool with optional parameters:
```typescript
const schema = z.object({
  required: z.string(),
  optional: z.number().optional(),
  withDefault: z.boolean().default(false),
});
```

2. Check the logs for the schema sent to LLM
3. Verify only `required` is in the `required` array
4. Test that the tool can be called with or without optional parameters

## Compatibility

- **AI SDK Version**: 4.3.19
- **OpenAI Provider**: @ai-sdk/openai ^1.0.0
- **Zod to JSON Schema**: zod-to-json-schema ^3.25.1
- **Python Backend**: Matches behavior of `base_tool.py`
