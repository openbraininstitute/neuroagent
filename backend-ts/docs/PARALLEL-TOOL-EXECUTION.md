# Parallel Tool Execution

## Overview

The TypeScript backend implements parallel tool execution limiting to match the Python backend behavior. This feature prevents the LLM from overwhelming the system by calling too many tools simultaneously.

## Implementation

### Configuration

The maximum number of parallel tool calls is configured via environment variable:

```bash
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=10  # Default: 10
```

This setting is loaded in `src/lib/config/settings.ts`:

```typescript
const SettingsAgentSchema = z.object({
  model: z.enum(['simple', 'multi']).default('simple'),
  maxTurns: z.number().int().default(10),
  maxParallelToolCalls: z.number().int().default(10),
});
```

### How It Works

The parallel tool execution limiting is implemented in `src/lib/agents/routine.ts` within the `streamChat` method:

1. **Tool Wrapping**: Each tool's `execute` function is wrapped to track and limit concurrent executions
2. **Step Tracking**: Tool calls are tracked per LLM step using the message count as a step identifier
3. **Limit Enforcement**: When a tool call exceeds the limit, it returns an error message instead of executing
4. **LLM Retry**: The error message instructs the LLM to retry the tool in the next step

### Code Flow

```typescript
// Track tool calls per step
const toolCallsPerStep = new Map<number, number>();

// Wrap each tool's execute function
const wrappedTool = {
  ...originalTool,
  execute: async (args, options) => {
    const { toolCallId, messages } = options;

    // Use message count as step identifier
    const stepId = messages.length;

    // Get or initialize counter for this step
    const currentCount = toolCallsPerStep.get(stepId) || 0;
    const toolPosition = currentCount + 1;

    // Update counter
    toolCallsPerStep.set(stepId, toolPosition);

    // Check if we've exceeded the limit
    if (toolPosition > maxParallelToolCalls) {
      // Return error message matching Python backend
      return `The tool ${toolName} with arguments ${JSON.stringify(args)} could not be executed due to rate limit. Call it again.`;
    }

    // Execute the tool
    return await originalExecute(args, options);
  },
};
```

### Behavior

#### Example: Limit of 3 Tools

If the LLM requests 5 tool calls in a single step with `maxParallelToolCalls=3`:

1. **Tools 1-3**: Execute normally
2. **Tools 4-5**: Return rate limit error message
3. **Next Step**: LLM sees the error messages and retries tools 4-5

#### Error Message Format

The error message matches the Python backend format:

```
The tool {tool_name} with arguments {args_json} could not be executed due to rate limit. Call it again.
```

This format:

- Clearly indicates the rate limit issue
- Includes the tool name and arguments for context
- Instructs the LLM to retry the call

### Comparison with Python Backend

The TypeScript implementation matches the Python backend behavior:

**Python Backend** (`backend/src/neuroagent/agent_routine.py`):

```python
# Execute only the first max_parallel_tool_calls tools
tool_calls_executed = await self.execute_tool_calls(
    tool_calls_to_execute[:max_parallel_tool_calls],
    active_agent.tools,
    context_variables,
)

# Add error messages for tools beyond the limit
tool_calls_executed.messages.extend([
    {
        "role": "tool",
        "tool_call_id": call.tool_call_id,
        "tool_name": call.name,
        "content": f"The tool {call.name} with arguments {call.arguments} could not be executed due to rate limit. Call it again.",
    }
    for call in tool_calls_to_execute[max_parallel_tool_calls:]
])
```

**TypeScript Backend** (`backend-ts/src/lib/agents/routine.ts`):

```typescript
// Wrap tool execution to enforce limit
if (toolPosition > maxParallelToolCalls) {
  return `The tool ${toolName} with arguments ${JSON.stringify(args)} could not be executed due to rate limit. Call it again.`;
}
```

### Key Differences

1. **Implementation Approach**:
   - **Python**: Manual agent loop with explicit control over tool execution
   - **TypeScript**: Wraps tool execute functions to intercept and limit calls

2. **Step Detection**:
   - **Python**: Explicit step management in the agent loop
   - **TypeScript**: Uses message count from Vercel AI SDK as step identifier

3. **Tool Execution**:
   - **Python**: Uses `asyncio.gather()` for parallel execution
   - **TypeScript**: Relies on Vercel AI SDK's built-in parallel execution

## Testing

Tests are located in `tests/agents/parallel-tool-execution.test.ts`:

```bash
npm test -- tests/agents/parallel-tool-execution.test.ts
```

Test coverage includes:

- Step tracking using message count
- Limit enforcement
- Error message format
- Counter reset between steps
- Edge cases (limit=1, limit=10)

## Configuration Examples

### Development (Unlimited)

```bash
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=100
```

### Production (Conservative)

```bash
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=3
```

### Sequential Execution

```bash
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=1
```

## Monitoring

The implementation includes detailed logging:

```
[streamChat] Step 5, Tool 1/3: web_search (ID: call_abc123)
[streamChat] Executing tool: web_search (ID: call_abc123)
[streamChat] Tool execution completed: web_search (ID: call_abc123)
[streamChat] Step 5, Tool 4/3: literature_search (ID: call_def456)
[streamChat] Tool call literature_search (ID: call_def456) exceeds parallel limit (3). Returning rate limit error.
```

## Requirements

This implementation satisfies:

- **Requirement 2.6**: Support parallel tool calls with configurable limits
- **Property 6**: For any set of tool calls up to the configured limit, they should execute in parallel, and calls beyond the limit should be queued or rejected

## Future Enhancements

Potential improvements:

1. **Queuing**: Instead of immediate rejection, queue tools beyond the limit
2. **Priority**: Allow certain tools to bypass the limit
3. **Dynamic Limits**: Adjust limits based on system load
4. **Metrics**: Track tool execution patterns and limit effectiveness
