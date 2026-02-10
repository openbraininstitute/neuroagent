# Streaming Interruption Handling

## Overview

The TypeScript backend implements streaming interruption handling using the Vercel AI SDK's `abortSignal` parameter. This ensures that when a client disconnects or stops streaming (e.g., user clicks stop button), the partial message is immediately saved to the database with `is_complete=false`, matching the Python backend's behavior.

## Python Backend Behavior

In the Python backend (`backend/src/neuroagent/agent_routine.py`), streaming interruption is handled using a try/except block:

```python
async def astream(...):
    try:
        # Stream processing logic
        async for chunk in completion:
            # Process and yield chunks
            ...
    except asyncio.exceptions.CancelledError:
        # Handle client disconnect
        # Save partial messages to database
        messages.append(
            Messages(
                thread_id=messages[-1].thread_id,
                entity=get_entity(message),
                content=json.dumps(message),
                tool_calls=tool_calls,
                is_complete=False,  # Mark as incomplete
            )
        )
```

When a client disconnects, the `CancelledError` is caught and partial messages are saved with `is_complete=False`.

## TypeScript Backend Implementation

The TypeScript backend uses Vercel AI SDK v4.3.19's `onAbort` callback to handle client disconnection:

```typescript
const result = streamText({
  model,
  messages,
  tools,
  abortSignal: request.signal, // Forward abort signal from request
  onAbort: async ({ response, usage }) => {
    // Called when stream is aborted - save partial messages
    await this.saveMessagesToDatabase(
      threadId,
      response.messages,
      usage,
      model,
      true // Mark as aborted (is_complete=false)
    );
  },
  onFinish: async ({ response, usage }) => {
    // Called when stream completes normally
    await this.saveMessagesToDatabase(
      threadId,
      response.messages,
      usage,
      model,
      false // Mark as complete (is_complete=true)
    );
  },
});

return result.toDataStreamResponse();
```

### How It Works

1. **Request Signal**: The Next.js request object provides an `AbortSignal` via `request.signal`
2. **Forward to SDK**: Pass the signal to `streamText()` via the `abortSignal` parameter
3. **Client Disconnect**: When user clicks stop, the browser aborts the request
4. **Immediate Stop**: The SDK stops streaming immediately (no background continuation)
5. **onAbort Callback**: The SDK calls `onAbort` with the partial response
6. **Save Partial Message**: Messages are saved with `is_complete=false`
7. **onFinish for Complete**: When stream completes normally, `onFinish` is called instead

### Key Benefits

- **Immediate Stop**: Stream stops when user clicks stop (no background processing)
- **Partial Message Visible**: User sees the partial message immediately
- **No Disappearing Messages**: Message doesn't disappear and reappear on refresh
- **Consistent UX**: Matches expected behavior - stop button → partial message displayed
- **Database Consistency**: Partial messages marked with `is_complete=false`

## User Experience

### Expected Behavior (Current Implementation)
1. User clicks "Stop" button
2. Stream stops immediately
3. Partial message is displayed in the UI
4. Partial message is saved to database with `is_complete=false`
5. On refresh, the same partial message is shown

### Previous Behavior (consumeStream approach)
1. User clicks "Stop" button
2. Stream continues in background
3. Message disappears from UI
4. Complete message is saved to database
5. On refresh, the complete message appears (confusing UX)

## Database Schema

Messages saved during interruption:

```typescript
{
  id: string;
  threadId: string;
  entity: Entity; // AI_MESSAGE, AI_TOOL, or TOOL
  content: string; // JSON-serialized message
  isComplete: boolean; // false when stream is aborted
  toolCalls: ToolCall[]; // Associated tool calls if any
  tokenConsumption: TokenConsumption[]; // Token usage tracking
}
```

The `isComplete` field indicates whether the message was fully generated or interrupted.

## Testing

The streaming interruption behavior is tested in `tests/agents/streaming-interruption.test.ts`:

```bash
npm test -- streaming-interruption.test.ts
```

Tests verify:
- Abort signal is forwarded to streamText
- onFinish callback is triggered on abort
- Partial messages are saved with is_complete=false
- Token consumption is tracked
- Tool call messages are preserved
- Errors in onFinish are handled gracefully

## Comparison with Python Backend

| Aspect | Python Backend | TypeScript Backend |
|--------|---------------|-------------------|
| **Mechanism** | try/except CancelledError | abortSignal parameter |
| **Partial Message Saving** | Manual in except block | Automatic via onFinish |
| **is_complete Flag** | Set to False | Set to False (same) |
| **Stream Behavior** | Stops immediately | Stops immediately (same) |
| **User Experience** | Partial message visible | Partial message visible (same) |
| **Code Complexity** | Higher (manual handling) | Lower (SDK handles it) |

## API Route Integration

The chat streaming route passes the abort signal:

```typescript
export async function POST(request: NextRequest, { params }) {
  // ... authentication, validation, etc.

  const response = await routine.streamChat(
    agentConfig,
    thread_id,
    maxTurns,
    maxParallelToolCalls,
    request.signal // Pass abort signal from request
  );

  return response;
}
```

The `request.signal` is automatically managed by Next.js and triggers when:
- Client closes the connection
- User clicks stop button
- Browser navigates away
- Network error occurs

## References

- [Vercel AI SDK Documentation - Stopping Streams](https://github.com/vercel/ai/blob/ai@4.3.19/content/docs/06-advanced/02-stopping-streams.mdx)
- [Vercel AI SDK Documentation - Stream Abort Handling](https://github.com/vercel/ai/blob/ai@4.3.19/content/docs/09-troubleshooting/14-stream-abort-handling.mdx)
- Python Backend: `backend/src/neuroagent/agent_routine.py`
- TypeScript Backend: `backend-ts/src/lib/agents/routine.ts`
- API Route: `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts`

## SDK Version

This implementation uses **Vercel AI SDK v4.3.19**. The `abortSignal` parameter is available in this version and provides the necessary functionality for handling stream interruptions without continuing in the background.
