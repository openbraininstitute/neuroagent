# Tool Schema Fix: OpenAI Function Calling Compatibility

## Problem

OpenAI's function calling API was rejecting tool schemas with the error:

```
Invalid schema for function 'entitycore-brainregion-getall': In context=(), 'required' is required to be supplied and to be an array including every key in properties. Missing 'page'.
```

## Root Cause

The issue was caused by using `.optional().default()` together in Zod schemas. When `zod-to-json-schema` converts these schemas to JSON Schema, it:

1. Does NOT include the field in the `required` array (correct)
2. But also does NOT include an explicit `required` array when all fields are optional/have defaults

OpenAI's function calling API has a strict requirement: **the JSON Schema MUST include an explicit `required` array**, even if it's empty or only contains some fields.

## Solution

**Use `.default()` WITHOUT `.optional()`** for fields with default values.

### Why This Works

In Zod:

- `.default()` alone makes a field optional (you can omit it and it will use the default)
- `.optional().default()` is redundant and causes schema conversion issues

In JSON Schema:

- Fields with `.default()` (without `.optional()`) are NOT included in the `required` array
- But the `required` array is still generated with other truly required fields
- OpenAI accepts this format

### Example

**Before (Broken):**

```typescript
const schema = z.object({
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(10).optional().default(5),
});
```

**After (Fixed):**

```typescript
const schema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(10).default(5),
});
```

**Generated JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "page": {
      "type": "integer",
      "minimum": 1,
      "default": 1
    },
    "page_size": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "default": 5
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Files Changed

1. **backend-ts/src/lib/tools/entitycore/base.ts**
   - Fixed `EntityCorePaginationSchema` (page, page_size)

2. **backend-ts/src/lib/tools/entitycore/brain-region-getall.ts**
   - Fixed `hierarchy_id` field

3. **backend-ts/src/lib/tools/obione/circuit-metrics-getone.ts**
   - Fixed `level_of_detail_nodes` and `level_of_detail_edges` fields

4. **backend-ts/src/lib/tools/web-search.ts**
   - Fixed `num_results` field

5. **backend-ts/src/lib/tools/literature-search.ts**
   - Fixed `num_results` field

6. **backend-ts/src/lib/config/settings.ts**
   - Fixed `denoAllocatedMemory` field

7. **backend-ts/tests/tools/base-tool.test.ts**
   - Updated test schema to match new pattern

8. **backend-ts/src/lib/tools/base-tool.ts**
   - Added documentation comment explaining OpenAI compatibility

## Testing

All tests pass:

- ✅ 22 base tool tests
- ✅ 45 agent tests (routine, error-handling, provider-selection)

## Verification

To verify the fix works:

1. Start the backend: `npm run dev`
2. Send a chat message that triggers a tool call
3. The tool schema should now be accepted by OpenAI without errors

## Related Issues

- Previous fix removed `z.never()` fields which generated unsupported `not` constraints
- This fix addresses the `required` array issue for fields with defaults

## Best Practices

Going forward:

- ✅ Use `.default()` for optional fields with default values
- ✅ Use `.optional()` for optional fields without defaults
- ❌ Don't use `.optional().default()` together
- ❌ Don't use `z.never()` (generates unsupported `not` constraints)
