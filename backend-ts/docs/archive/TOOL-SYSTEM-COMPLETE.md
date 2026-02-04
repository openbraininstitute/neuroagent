# Tool System - Complete Implementation

## Overview

The TypeScript tool system now perfectly matches Python's ClassVar pattern with lazy instantiation. We have two example tools demonstrating the complete pattern.

## File Structure

```
backend-ts/src/lib/tools/
├── base-tool.ts           # Base class and interfaces
├── example-tool.ts        # Example tool with external dependencies
├── calculator-tool.ts     # Simple calculator tool
├── index.ts              # Tool registration and factory functions
└── demo.ts               # Demonstration script
```

## The Pattern

### 1. Tool Definition (Static Properties)

Each tool defines static properties (equivalent to Python's ClassVar):

```typescript
export class CalculatorTool extends BaseTool<...> {
  // Static properties - accessible without instantiation
  static readonly toolName = 'calculator';
  static readonly toolNameFrontend = 'Calculator';
  static readonly toolDescription = 'Performs basic arithmetic...';
  static readonly toolUtterances = ['calculate', 'add', ...];
  static readonly toolHil = false;

  // Instance properties - only available after instantiation
  override contextVariables: CalculatorToolContextVariables;
  override inputSchema = CalculatorToolInputSchema;

  constructor(contextVariables: CalculatorToolContextVariables = {}) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: ...) {
    // Tool logic using both input and contextVariables
  }
}
```

### 2. Tool Registration (Startup)

Register tool classes once at startup:

```typescript
await registerToolClasses();

// Now you can access metadata without instantiation
const ToolClass = toolRegistry.getClass('calculator');
console.log(ToolClass.toolName);        // 'calculator'
console.log(ToolClass.toolDescription); // 'Performs basic arithmetic...'
```

### 3. Get Available Tools (Per-Request)

Determine which tools are available based on configuration:

```typescript
const toolClasses = await getAvailableToolClasses({
  exampleApiUrl: 'https://api.example.com',
  calculatorMaxValue: 1000000,
});

// toolClasses = [ExampleTool, CalculatorTool]
// Still just classes - no instances created!
```

### 4. Lazy Instantiation (When LLM Calls)

Instantiate tools individually when the LLM calls them:

```typescript
// LLM decides to call 'calculator'
const ToolClass = toolClasses.find(cls => cls.toolName === 'calculator');

// Instantiate ONLY this tool with user context
const toolInstance = await createToolInstance(ToolClass, {
  calculatorMaxValue: 1000000,
});

// Execute
const result = await toolInstance.execute({
  operation: 'add',
  a: 5,
  b: 3,
});

// Instance is discarded after execution
```

## Example Tools

### Calculator Tool

- **Purpose**: Simple arithmetic operations
- **Dependencies**: None (always available)
- **Context Variables**: Optional maxValue for safety
- **Operations**: add, subtract, multiply, divide

### Example Tool

- **Purpose**: Demonstrates external API integration
- **Dependencies**: Requires apiUrl configuration
- **Context Variables**: apiUrl, apiKey, httpClient
- **Operations**: Query with configurable results

## Running the Demo

```bash
cd backend-ts
npx tsx src/lib/tools/demo.ts
```

This will demonstrate:
1. Registering tool classes
2. Accessing metadata without instantiation
3. Getting available tools based on config
4. Lazy instantiation when "LLM calls" tools
5. Multiple calls creating fresh instances

## Key Functions

### `registerToolClasses()`

- **When**: Once at startup
- **What**: Stores class references in registry
- **Result**: Metadata accessible via static properties

### `getAvailableToolClasses(config)`

- **When**: Per-request
- **What**: Returns list of tool classes based on config
- **Result**: Array of classes (not instances!)

### `createToolInstance(ToolClass, config)`

- **When**: When LLM calls a specific tool
- **What**: Instantiates ONE tool with user context
- **Result**: Tool instance ready for execution

### `toolRegistry.getClass(name)`

- **When**: Anytime
- **What**: Get tool class by name
- **Result**: Tool class for metadata access or instantiation

## Comparison with Python

| Python | TypeScript |
|--------|-----------|
| `ClassVar[str]` | `static readonly toolName` |
| `tool_list: list[type[BaseTool]]` | `toolClasses: any[]` |
| `tool.name` (class property) | `ToolClass.toolName` |
| `tool(metadata=..., input_schema=...)` | `new ToolClass(contextVariables)` |
| `await tool_instance.arun()` | `await toolInstance.execute(input)` |

## Benefits

1. **Memory Efficient**: Only instantiate tools that are actually called
2. **User Context Isolation**: Each tool call gets fresh user context
3. **No Stale State**: Tools don't hold state between calls
4. **Type Safe**: TypeScript enforces the contract via interfaces
5. **Matches Python**: Direct translation of Python's pattern

## Next Steps

To add a new tool:

1. Create a new file in `src/lib/tools/`
2. Define static properties (toolName, toolDescription, etc.)
3. Define context variables interface
4. Define input schema with Zod
5. Implement execute() method
6. Add to `registerToolClasses()` in index.ts
7. Add to `getAvailableToolClasses()` with availability logic
8. Add to `createToolInstance()` with instantiation logic

See `example-tool.ts` and `calculator-tool.ts` for complete examples.
