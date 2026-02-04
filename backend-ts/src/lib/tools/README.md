# Tool System

The tool system provides a framework for creating and managing tools that can be called by the LLM agent. All tools extend the `BaseTool` abstract class and are automatically compatible with Vercel AI SDK.

## Architecture

### BaseTool Abstract Class

The `BaseTool` class is the foundation of the tool system. Every tool must:

1. Define metadata (name, description, utterances, etc.)
2. Define an input schema using Zod
3. Implement the `execute` method with the tool's logic
4. Optionally override `isOnline` for health checks

### ToolRegistry

The `ToolRegistry` manages all registered tools and provides:

- Tool registration and lookup
- Conversion to Vercel AI SDK format
- Health check aggregation
- Metadata collection

## Creating a New Tool

### Step 1: Define Input Schema

```typescript
import { z } from 'zod';

const MyToolInputSchema = z.object({
  query: z.string().describe('The search query'),
  maxResults: z.number().int().positive().optional().default(10),
});
```

### Step 2: Extend BaseTool

```typescript
import { BaseTool, ToolMetadata } from '@/lib/tools/base-tool';

export class MyTool extends BaseTool<typeof MyToolInputSchema> {
  metadata: ToolMetadata = {
    name: 'my_tool',
    nameFrontend: 'My Tool',
    description: 'Description for LLM context',
    descriptionFrontend: 'User-friendly description',
    utterances: ['search', 'find', 'lookup'],
    hil: false, // Set to true if requires human validation
  };

  inputSchema = MyToolInputSchema;

  async execute(input: z.infer<typeof MyToolInputSchema>): Promise<unknown> {
    // Implement your tool logic here
    const { query, maxResults } = input;

    // Return any JSON-serializable value
    return {
      results: [],
      count: 0,
    };
  }

  // Optional: Override for custom health checks
  override async isOnline(): Promise<boolean> {
    // Check if external services are available
    return true;
  }
}
```

### Step 3: Register the Tool

```typescript
import { toolRegistry } from '@/lib/tools';
import { MyTool } from './my-tool';

const myTool = new MyTool();
toolRegistry.register(myTool);
```

## Tool Metadata

### Required Fields

- `name`: Unique identifier (used in backend)
- `description`: What the tool does (used for LLM context)

### Optional Fields

- `nameFrontend`: Display name for UI (defaults to `name`)
- `descriptionFrontend`: User-friendly description (defaults to `description`)
- `utterances`: Example phrases that might trigger this tool
- `hil`: Whether tool requires Human-in-the-Loop validation

## Input Validation

Tools use Zod schemas for input validation. The schema:

- Defines the structure of tool inputs
- Provides type safety
- Generates automatic validation
- Includes descriptions for LLM context

### Best Practices

1. **Use descriptive field names**: `query` instead of `q`
2. **Add descriptions**: Help the LLM understand parameters
3. **Set sensible defaults**: Make optional parameters easy to use
4. **Validate constraints**: Use Zod's validation methods

```typescript
const schema = z.object({
  // Good: descriptive name and description
  searchQuery: z.string().describe('The text to search for'),

  // Good: sensible default
  maxResults: z.number().int().positive().default(10),

  // Good: validation constraints
  pageSize: z.number().int().min(1).max(100).default(20),
});
```

## Health Checks

Tools can implement health checks to verify external service availability:

```typescript
override async isOnline(): Promise<boolean> {
  try {
    // Check API endpoint
    const response = await fetch('https://api.example.com/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

The registry's `checkAllHealth()` method aggregates health status for all tools.

## Using Tools with Vercel AI SDK

Tools are automatically converted to Vercel AI SDK format:

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { toolRegistry } from '@/lib/tools';

const result = streamText({
  model: openai('gpt-4'),
  messages: [...],
  tools: toolRegistry.getAllAsVercelTools(),
});
```

## Human-in-the-Loop (HIL) Tools

Tools requiring human validation should set `hil: true` in metadata:

```typescript
metadata: ToolMetadata = {
  name: 'sensitive_operation',
  description: 'Performs a sensitive operation',
  hil: true, // Requires human approval
};
```

The agent routine will pause execution and wait for explicit validation before proceeding.

## Testing Tools

### Unit Tests

Test specific functionality with known inputs:

```typescript
import { describe, it, expect } from 'vitest';
import { MyTool } from './my-tool';

describe('MyTool', () => {
  it('should execute with valid input', async () => {
    const tool = new MyTool();
    const result = await tool.execute({
      query: 'test',
      maxResults: 5,
    });

    expect(result).toBeDefined();
  });

  it('should validate input schema', () => {
    const tool = new MyTool();

    // Valid input
    expect(() =>
      tool.inputSchema.parse({
        query: 'test',
      })
    ).not.toThrow();

    // Invalid input
    expect(() =>
      tool.inputSchema.parse({
        query: 123, // Should be string
      })
    ).toThrow();
  });
});
```

### Property-Based Tests

Test universal properties across many inputs:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.string(), fc.integer({ min: 1, max: 100 })])(
  'should handle any valid input',
  async (query, maxResults) => {
    const tool = new MyTool();
    const result = await tool.execute({ query, maxResults });

    expect(result).toBeDefined();
  }
);
```

## Example Tools

See `example-tool.ts` for a complete reference implementation demonstrating:

- Metadata definition
- Input schema with descriptions
- Execute method implementation
- Health check override
- Proper TypeScript typing

## Tool Registry API

### Registration

```typescript
toolRegistry.register(tool); // Register a tool
```

### Lookup

```typescript
const tool = toolRegistry.get('tool_name'); // Get by name
const allTools = toolRegistry.getAll(); // Get all tools
```

### Conversion

```typescript
const vercelTools = toolRegistry.getAllAsVercelTools(); // For Vercel AI SDK
const metadata = toolRegistry.getAllMetadata(); // For API endpoints
```

### Health Checks

```typescript
const healthMap = await toolRegistry.checkAllHealth();
// Map<string, boolean> of tool names to health status
```

### Utility

```typescript
toolRegistry.clear(); // Clear all tools (useful for testing)
```

## Migration from Python

When migrating tools from the Python backend:

1. Convert Pydantic models to Zod schemas
2. Convert async methods to TypeScript async/await
3. Update imports to use TypeScript modules
4. Ensure proper error handling
5. Add TypeScript type annotations

### Python to TypeScript Mapping

| Python               | TypeScript         |
| -------------------- | ------------------ |
| `pydantic.BaseModel` | `z.object()`       |
| `str`                | `z.string()`       |
| `int`                | `z.number().int()` |
| `float`              | `z.number()`       |
| `bool`               | `z.boolean()`      |
| `Optional[T]`        | `z.optional()`     |
| `List[T]`            | `z.array()`        |
| `Dict[K, V]`         | `z.record()`       |

## Best Practices

1. **Keep tools focused**: Each tool should do one thing well
2. **Validate inputs**: Use Zod's full validation capabilities
3. **Handle errors**: Catch and return meaningful error messages
4. **Document thoroughly**: Add descriptions to all schema fields
5. **Test comprehensively**: Write both unit and property tests
6. **Check health**: Implement health checks for external dependencies
7. **Use TypeScript**: Leverage type safety throughout
8. **Follow naming conventions**: Use snake_case for tool names

## Troubleshooting

### Tool not found by LLM

- Check that `description` is clear and detailed
- Add relevant `utterances` to metadata
- Ensure tool is registered in the registry

### Input validation fails

- Verify Zod schema matches expected input
- Check that all required fields are present
- Use `.optional()` or `.default()` for optional fields

### Health check fails

- Verify external service is accessible
- Check network connectivity
- Implement retry logic if needed
- Return `false` instead of throwing errors

### Type errors

- Ensure `inputSchema` type matches `execute` parameter
- Use `z.infer<typeof schema>` for type inference
- Add explicit type annotations where needed
