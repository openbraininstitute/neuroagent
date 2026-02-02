# Stream Cancellation Handling Implementation

## Overview

This document describes the implementation of native stream cancellation handling in the TypeScript backend, following Vercel AI SDK patterns and translating the Python backend's `asyncio.CancelledError` handling.

## Python Backend Reference

The Python backend (`backend/src/neuroagent/agent_routine.py`) handles stream cancellation using:

```python
except asyncio.exceptions.CancelledError:
    # Save partial messages when user interrupts streaming
    if message["tool_calls"]:
        tool_calls = [ToolCalls(...) for tool_call in message["tool_calls"]]

    messages.append(
        Messages(
            entity=get_entity(message),
            content=json.dumps(message),
            tool_calls=tool_calls,
            is_complete=False,  # Mark as incomplete
        )
    )

    # Append default tool message to partial tool calls
    if messages[-1].entity == Entity.AI_TOOL:
        messages.extend([
            Messages(
                entity=Entity.TOOL,
                content=json.dumps({
                    "content": "Tool execution aborted by the user."
                }),
                is_complete=False,
            )
        ])
```

## TypeScript Implementation

### Key Components

1. **AbortSignal Forwarding** (`routine.ts`)
   - Accept `abortSignal?: AbortSignal` parameter in `streamChat()`
   - Forward to `streamText()` configuration
   - Pass `request.signal` from Next.js API route

2. **Stream Consumption** (`routine.ts`)
   - Call `result.consumeStream()` to ensure stream runs to completion
   - Triggers `onFinish` callback even when client disconnects
   - Removes backpressure from LLM provider

3. **Abort Detection** (`routine.ts`)
   - Check `abortSignal?.aborted` in `onFinish` callback
   - Distinguish between normal completion and abort
   - Route to appropriate save method

4. **Partial Message Persistence** (`routine.ts`)
   - `savePartialMessagesToDatabase()` method for aborted streams
   - Marks messages as `isComplete: false`
   - Adds default abort messages for pending tool calls

### Code Flow

```typescript
// 1. API Route receives request with abort signal
export async function POST(request: NextRequest, { params }) {
  const response = await routine.streamChat(
    agentConfig,
    thread_id,
    maxTurns,
    maxParallelToolCalls,
    request.signal  // Forward abort signal
  );
}

// 2. Agent routine configures stream with abort handling
const result = streamText({
  model,
  messages,
  tools,
  abortSignal,  // Enable cancellation
  onFinish: async ({ response, usage, finishReason }) => {
    const isAborted = finishReason === 'stop' && abortSignal?.aborted;

    if (isAborted) {
      // Save partial results
      await savePartialMessagesToDatabase(threadId, response.messages, usage, model);
    } else {
      // Save complete results
      await saveMessagesToDatabase(threadId, response.messages, usage, model);
    }
  },
});

// 3. Consume stream to ensure completion
result.consumeStream();  // Runs in background

// 4. Return streaming response
return result.toDataStreamResponse();
```

### Partial Message Handling

When a stream is aborted, `savePartialMessagesToDatabase()`:

1. **Marks messages as incomplete**
   ```typescript
   isComplete: false  // Indicates partial/aborted message
   ```

2. **Saves partial assistant messages**
   - Includes any text content generated before abort
   - Includes any tool calls initiated before abort

3. **Adds abort messages for tool calls**
   ```typescript
   {
     role: 'tool',
     tool_call_id: tc.toolCallId,
     tool_name: tc.toolName,
     content: 'Tool execution aborted by the user.',
   }
   ```

## Differences from Python Implementation

| Aspect | Python | TypeScript |
|--------|--------|------------|
| **Cancellation Detection** | `asyncio.CancelledError` exception | `abortSignal?.aborted` check |
| **Stream Handling** | Manual chunk iteration with try/catch | `result.consumeStream()` + `onFinish` |
| **Partial JSON Fixing** | `complete_partial_json()` utility | Not needed - Vercel SDK handles |
| **Message Appending** | Manual list manipulation | Database transactions |
| **Tool Call Tracking** | `defaultdict` for partial calls | Vercel SDK manages state |

## Benefits

1. **Native Integration**: Uses Vercel AI SDK's built-in abort handling
2. **Automatic Cleanup**: `consumeStream()` ensures proper resource cleanup
3. **Type Safety**: TypeScript ensures correct abort signal handling
4. **Consistent Behavior**: Matches Python backend's partial message persistence
5. **Client Disconnect Handling**: Works even when client disconnects unexpectedly

## Testing

To test stream cancellation:

1. **Start a streaming request**
   ```bash
   curl -X POST http://localhost:3000/api/qa/chat_streamed/[thread_id] \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content": "Tell me a long story about neuroscience"}' &
   ```

2. **Cancel the request** (Ctrl+C or close browser tab)

3. **Verify database**
   ```sql
   SELECT entity, is_complete, content
   FROM messages
   WHERE thread_id = '[thread_id]'
   ORDER BY creation_date DESC;
   ```

4. **Expected results**
   - Partial assistant message with `is_complete = false`
   - Tool abort messages if tools were called
   - Token consumption recorded for partial generation

## References

- [Vercel AI SDK - Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams)
- [Vercel AI SDK - Error Handling](https://ai-sdk.dev/docs/ai-sdk-core/error-handling)
- [Python Backend - agent_routine.py](../../backend/src/neuroagent/agent_routine.py)

## Related Files

- `backend-ts/src/lib/agents/routine.ts` - Core implementation
- `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts` - API route
- `backend/src/neuroagent/agent_routine.py` - Python reference implementation
