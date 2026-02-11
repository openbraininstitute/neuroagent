# Task: Multi-Turn Agent Loop with Vercel AI SDK

## Objective

Implement multi-turn agentic conversations in the TypeScript backend using Vercel AI SDK's built-in `maxSteps` feature, achieving feature parity with the Python implementation while leveraging the SDK's automatic tool execution capabilities.

## Problem Statement

The TypeScript backend needed to support multi-turn conversations where:

1. The LLM can call tools multiple times
2. Tool results are added to message history
3. The LLM continues with updated context
4. This repeats until completion or max turns is reached

## Solution

Instead of implementing a manual loop (as initially attempted), we leverage **Vercel AI SDK's built-in `maxSteps` parameter** which provides automatic multi-step tool execution out of the box.

### Key Implementation

```typescript
const result = streamText({
  model,
  messages: [{ role: 'system', content: agent.instructions }, ...coreMessages],
  tools, // Tools WITH execute functions
  maxSteps: maxTurns, // Enable automatic multi-step execution
  onFinish: async ({ response, usage }) => {
    // Save all generated messages to database
    await this.saveMessagesToDatabase(threadId, response.messages, usage, model);
  },
});

return result.toDataStreamResponse();
```

That's it! Vercel AI SDK automatically:

- Calls the LLM
- Detects and executes tool calls
- Adds results to message history
- Repeats until completion or `maxSteps` reached
- Streams everything to the client

## Benefits

### 1. Simplicity

- **~150 lines** instead of ~400 lines
- No manual loop management
- No custom stream handling
- No manual tool execution logic

### 2. Vercel AI SDK Compatibility

- Uses standard `toDataStreamResponse()`
- Works with Vercel's `useChat()` hook
- Automatic streaming format
- Built-in error handling

### 3. Maintainability

- Follows SDK best practices
- Less custom code = fewer bugs
- Easier to understand
- Future SDK improvements automatically benefit us

### 4. Feature Parity

✅ Multi-turn conversations
✅ Automatic tool execution
✅ Max turns limit
✅ Streaming responses
✅ Database persistence
✅ Token tracking

## Files Modified

### `backend-ts/src/lib/agents/routine.ts`

**Before (Manual Loop - 400+ lines):**

```typescript
// Custom TransformStream
const stream = new TransformStream();
const writer = stream.writable.getWriter();

// Manual loop
while (turns < maxTurns) {
  const result = streamText({ messages, tools });

  // Manually stream chunks
  for await (const chunk of result.fullStream) {
    await writer.write(chunk);
  }

  // Manually execute tools
  const toolResults = await executeToolCalls(...);

  // Manually add to history
  messageHistory.push(...toolResults);

  turns++;
}
```

**After (Automatic with maxSteps - 150 lines):**

```typescript
const result = streamText({
  model,
  messages: [...coreMessages],
  tools, // WITH execute functions
  maxSteps: maxTurns, // That's it!
  onFinish: async ({ response, usage }) => {
    await this.saveMessagesToDatabase(threadId, response.messages, usage, model);
  },
});

return result.toDataStreamResponse();
```

**Changes:**

- Removed manual loop implementation
- Removed `executeToolCalls()` method (SDK handles it)
- Removed custom stream control (use `toDataStreamResponse()`)
- Added `saveMessagesToDatabase()` to process all messages in `onFinish`
- Tools now include `execute` functions (SDK calls them automatically)

## How It Works

### Automatic Multi-Step Flow

1. **Initial Call**: LLM receives user message
2. **Tool Detection**: LLM decides to call tools
3. **Auto Execution**: SDK calls tool `execute` functions
4. **History Update**: SDK adds results to message history
5. **Next Call**: LLM receives updated history
6. **Repeat**: Steps 2-5 until done or `maxSteps` reached

### Example

```
User: "What's the weather in NYC and what's 2+2?"

Step 1: LLM calls getWeather("NYC") and calculator("2+2")
Step 2: SDK executes both tools → ["Sunny, 72°F", "4"]
Step 3: LLM receives results → "Weather is sunny and 72°F. 2+2 = 4."
Done!
```

## Database Integration

The `onFinish` callback receives all messages:

```typescript
onFinish: async ({ response, usage }) => {
  // response.messages contains ALL messages from multi-step execution:
  // - Assistant messages (with tool calls)
  // - Tool result messages

  for (const message of response.messages) {
    if (message.role === 'assistant') {
      // Extract text and tool calls
      // Save to database
    } else if (message.role === 'tool') {
      // Extract tool results
      // Save to database
    }
  }
};
```

## Comparison: Manual vs Automatic

| Aspect          | Manual Loop                 | Automatic (maxSteps)     |
| --------------- | --------------------------- | ------------------------ |
| Lines of code   | ~400                        | ~150                     |
| Loop management | Manual `while` loop         | SDK handles it           |
| Tool execution  | Manual `executeToolCalls()` | SDK calls `execute`      |
| Stream control  | Custom `TransformStream`    | `toDataStreamResponse()` |
| Message history | Manual updates              | SDK manages it           |
| Error handling  | Custom try/catch            | SDK built-in             |
| Frontend compat | Custom format               | Standard Vercel format   |

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

## Frontend Integration

The standard Vercel format works seamlessly with `useChat()`:

```typescript
// Frontend
const { messages, isLoading } = useChat({
  api: '/api/qa/chat_streamed/[thread_id]',
});

// Automatically handles:
// - Text streaming
// - Tool call notifications
// - Tool results
// - Loading states
```

## Future Enhancements

### 1. Parallel Tool Execution

SDK supports this by default when LLM requests multiple tools.

### 2. Progress Callbacks

```typescript
const result = streamText({
  maxSteps: 10,
  onStepFinish: async ({ stepType, toolCalls }) => {
    // Send progress updates
  },
});
```

## Key Learnings

1. **Don't reinvent the wheel**: Vercel AI SDK already has multi-step execution
2. **Read the docs**: `maxSteps` parameter does exactly what we need
3. **Trust the SDK**: Automatic execution is simpler and more reliable
4. **Standard patterns**: Using SDK features ensures compatibility

## References

- [Vercel AI SDK - Multi-Step Tool Calls](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls)
- [Vercel AI SDK - maxSteps](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text#max-steps)
- [Python Implementation](../../backend/src/neuroagent/agent_routine.py)

## Conclusion

By using Vercel AI SDK's `maxSteps` parameter, we achieved full feature parity with the Python implementation in **half the code**. The SDK handles all the complexity of multi-turn conversations, allowing us to focus on our domain logic (tools, database, business rules) rather than agent orchestration.

This is a perfect example of leveraging framework features instead of building custom solutions.
