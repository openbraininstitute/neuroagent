# Multi-Turn Agent Loop Implementation

## Overview

This document describes the implementation of the multi-turn agentic conversation loop in the TypeScript backend using Vercel AI SDK's built-in `maxSteps` feature.

## Key Insight

Vercel AI SDK provides **automatic multi-step tool execution** out of the box. We don't need to implement a manual loop - we just need to:

1. Define tools with `execute` functions
2. Set `maxSteps` parameter in `streamText()`
3. Let Vercel AI SDK handle the rest

## Implementation

### Simple Approach with `maxSteps`

```typescript
const result = streamText({
  model,
  messages: [...messageHistory],
  tools: {
    myTool: tool({
      description: 'My tool description',
      parameters: z.object({ input: z.string() }),
      execute: async ({ input }) => {
        // Tool logic here
        return result;
      },
    }),
  },
  maxSteps: 10, // Allow up to 10 steps (LLM calls + tool executions)
});

return result.toDataStreamResponse();
```

That's it! Vercel AI SDK automatically:

- Calls the LLM
- Detects tool calls
- Executes tools using the `execute` function
- Adds results to message history
- Calls the LLM again with updated history
- Repeats until completion or `maxSteps` reached

### Our Implementation

```typescript
async streamChat(agent: AgentConfig, threadId: string, maxTurns: number = 10) {
  // 1. Load message history from database
  const dbMessages = await prisma.message.findMany({ where: { threadId } });
  const coreMessages = this.convertToCoreMessages(dbMessages);

  // 2. Convert tool classes to Vercel format (WITH execute functions)
  const tools: Record<string, Tool> = {};
  for (const ToolClass of agent.tools) {
    const tempInstance = new ToolClass(agent.contextVariables || {});
    tools[ToolClass.toolName] = tempInstance.toVercelTool(); // Includes execute
  }

  // 3. Stream with automatic multi-step execution
  const result = streamText({
    model: this.getProviderAndModel(agent.model),
    messages: [
      { role: 'system', content: agent.instructions },
      ...coreMessages,
    ],
    tools,
    maxSteps: maxTurns, // Enable automatic multi-step execution
    onFinish: async ({ response, usage }) => {
      // Save all generated messages to database
      await this.saveMessagesToDatabase(threadId, response.messages, usage, agent.model);
    },
  });

  // 4. Return standard Vercel AI SDK response
  return result.toDataStreamResponse();
}
```

## Benefits of This Approach

### 1. Simplicity

- **~100 lines** instead of ~400 lines
- No manual loop management
- No custom stream handling
- No manual tool execution

### 2. Vercel AI SDK Compatibility

- Uses standard `toDataStreamResponse()`
- Works with Vercel's `useChat()` hook on frontend
- Automatic streaming format
- Built-in error handling

### 3. Maintainability

- Follows Vercel AI SDK best practices
- Less custom code = fewer bugs
- Easier to understand and modify
- Future SDK improvements automatically benefit us

### 4. Feature Parity

- ✅ Multi-turn conversations
- ✅ Automatic tool execution
- ✅ Max turns limit
- ✅ Streaming responses
- ✅ Database persistence
- ✅ Token tracking

## How It Works

### Step-by-Step Flow

1. **Initial Call**: LLM receives user message and system instructions
2. **Tool Detection**: LLM decides to call a tool
3. **Automatic Execution**: Vercel AI SDK calls the tool's `execute` function
4. **History Update**: Tool result is added to message history
5. **Next Call**: LLM receives updated history with tool result
6. **Repeat**: Steps 2-5 repeat until:
   - LLM provides final answer (no more tool calls)
   - `maxSteps` limit is reached

### Example Conversation

```
User: "What's the weather in NYC and what's 2+2?"

Step 1: LLM → "I'll check the weather and do the calculation"
        Tool calls: [getWeather(city: "NYC"), calculator(expr: "2+2")]

Step 2: Tools execute → ["Sunny, 72°F", "4"]

Step 3: LLM receives results → "The weather in NYC is sunny and 72°F. 2+2 equals 4."

Done!
```

## Stream Format

Vercel AI SDK uses a standard data stream format that's automatically handled:

```
0:"text chunk"           # Text delta
9:{toolCall}             # Tool call notification
a:{toolResult}           # Tool result
e:{finish}               # Step finish
d:{done}                 # Conversation complete
3:"error"                # Error message
```

The frontend can consume this using Vercel's `useChat()` hook:

```typescript
const { messages, isLoading } = useChat({
  api: '/api/qa/chat_streamed/[thread_id]',
});
```

## Database Integration

The `onFinish` callback receives all messages generated during the multi-step execution:

```typescript
onFinish: async ({ response, usage }) => {
  // response.messages contains:
  // - Assistant messages (with tool calls)
  // - Tool result messages

  for (const message of response.messages) {
    if (message.role === 'assistant') {
      // Save assistant message with tool calls
    } else if (message.role === 'tool') {
      // Save tool results
    }
  }
};
```

## Comparison: Manual vs Automatic

### Manual Loop (Old Approach)

```typescript
while (turns < maxTurns) {
  const result = streamText({ messages, tools });

  // Manually stream chunks
  for await (const chunk of result.fullStream) {
    await writer.write(chunk);
  }

  // Manually check for tool calls
  if (finishReason !== 'tool-calls') break;

  // Manually execute tools
  const toolResults = await executeToolCalls(...);

  // Manually add to history
  messageHistory.push(...toolResults);

  turns++;
}
```

### Automatic with `maxSteps` (New Approach)

```typescript
const result = streamText({
  messages,
  tools,
  maxSteps: maxTurns, // That's it!
});

return result.toDataStreamResponse();
```

## Configuration

### Max Steps

```typescript
maxSteps: 10; // Allow up to 10 steps total
```

Each "step" is one generation that results in either:

- Text output (final answer)
- Tool calls (intermediate step)

### Alternative: `stopWhen`

For more complex stopping conditions:

```typescript
import { stepCountIs } from 'ai';

const result = streamText({
  messages,
  tools,
  stopWhen: stepCountIs(10), // Same as maxSteps: 10
});
```

## Error Handling

Vercel AI SDK handles errors automatically:

```typescript
const response = result.toDataStreamResponse({
  getErrorMessage: (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An error occurred';
  },
});
```

Tool execution errors are caught and returned as tool results, allowing the LLM to handle them gracefully.

## Testing

### Unit Tests

```typescript
it('should execute multiple steps with tools', async () => {
  const mockTool = {
    toolName: 'testTool',
    toVercelTool: () => ({
      description: 'Test tool',
      parameters: z.object({}),
      execute: async () => 'result',
    }),
  };

  const response = await routine.streamChat(
    {
      model: 'openai/gpt-4',
      tools: [mockTool],
      instructions: 'Test',
      temperature: 1.0,
    },
    'thread-123',
    5 // maxSteps
  );

  expect(response.status).toBe(200);
});
```

### Integration Tests

Test with real LLM and tools to verify multi-step execution works end-to-end.

## Future Enhancements

### 1. Parallel Tool Execution

Vercel AI SDK supports parallel tool calls by default when the LLM requests multiple tools simultaneously.

### 2. HIL (Human-in-the-Loop)

For tools requiring user confirmation, we can:

- Pause execution after tool call
- Request user confirmation
- Resume with confirmed/denied result

### 3. Progress Callbacks

```typescript
const result = streamText({
  messages,
  tools,
  maxSteps: 10,
  onStepFinish: async ({ stepType, toolCalls }) => {
    console.log('Step completed:', stepType);
    // Send progress updates to client
  },
});
```

## References

- [Vercel AI SDK - Multi-Step Tool Calls](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls)
- [Vercel AI SDK - maxSteps](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text#max-steps)
- [Vercel AI SDK - ToolLoopAgent](https://sdk.vercel.ai/docs/reference/ai-sdk-core/tool-loop-agent)

## Conclusion

By leveraging Vercel AI SDK's built-in `maxSteps` feature, we achieve the same multi-turn agentic behavior as the Python implementation with significantly less code and better maintainability. The SDK handles all the complexity of:

- Loop management
- Tool execution
- Message history updates
- Streaming format
- Error handling

This allows us to focus on our domain logic (tools, database, business rules) rather than reinventing agent orchestration.
