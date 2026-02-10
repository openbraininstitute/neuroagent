# Streaming UI Behavior with Tool Calls

## Issue Description

When the agent streams a response that includes tool calls, users may observe that the message content temporarily disappears from the UI during the transition from text streaming to tool call execution. After refreshing the page, the complete message (including both text and tool calls) is displayed correctly.

## Root Cause

This is a known behavior with the Vercel AI SDK's `useChat` hook (version 4.3.19) related to how React state updates are handled during streaming transitions:

1. **Initial Streaming**: The agent starts streaming text content
   - Message structure: `{ role: 'assistant', content: 'text...' }`
   - Frontend renders the text content

2. **Tool Call Detection**: The LLM decides to make tool calls
   - SDK restructures the message to use `parts` array
   - Message structure changes to: `{ role: 'assistant', content: '', parts: [...] }`
   - During this transition, the text content moves from `message.content` to `message.parts[0].text`

3. **React Re-render**: The frontend component re-renders with the new structure
   - If the component only checks `message.parts` for text, it may miss content during the transition
   - The text content is still present in the stream, but the React state update timing can cause a brief disappearance

4. **After Refresh**: Data is loaded from the database with complete structure
   - Backend correctly saves both text content and tool calls
   - Message is properly structured with all parts visible

## Backend Implementation

The backend (`backend-ts/src/lib/agents/routine.ts`) correctly:

1. **Enables Tool Call Streaming**: `toolCallStreaming: true` in `streamText()` configuration
2. **Saves Complete Messages**: The `saveMessagesToDatabase()` method properly extracts and saves both text content and tool calls
3. **Maintains Text Content**: When saving assistant messages with tool calls, the text content is preserved in the database

```typescript
// From routine.ts - saveMessagesToDatabase()
if (typeof message.content === 'string') {
  textContent = message.content;
} else if (Array.isArray(message.content)) {
  for (const part of message.content) {
    if (part.type === 'text') {
      textContent += part.text;
    } else if (part.type === 'tool-call') {
      toolCalls.push({...});
    }
  }
}

// Text content is saved even when tool calls are present
const messageContent = {
  role: 'assistant',
  content: textContent,  // ← Text is preserved
  tool_calls: toolCalls.length > 0 ? [...] : undefined
};
```

## Frontend Workaround

The issue needs to be addressed in the frontend component that renders messages. The component should handle both the `message.content` string and `message.parts` array to ensure content remains visible during transitions.

**Current Frontend Logic** (`frontend/src/components/chat/chat-messages-inside-thread.tsx`):
```tsx
{message.parts?.map((part, partId) => {
  if (part.type === "text" && part.text !== "") {
    return <ChatMessageAI content={part.text} />
  }
  // ...
})}
```

**Recommended Fix** (to be applied in frontend):
```tsx
{message.parts?.map((part, partId) => {
  if (part.type === "text" && part.text !== "") {
    return <ChatMessageAI content={part.text} />
  }
  // ...
})}

{/* Fallback: render message.content if parts array has no text */}
{message.content &&
 typeof message.content === "string" &&
 message.content.trim() !== "" &&
 !message.parts?.some((part) => part.type === "text") && (
  <ChatMessageAI content={message.content} />
)}
```

This ensures that:
- During initial streaming, `message.content` is rendered
- During transition, the fallback keeps content visible
- After restructuring, `message.parts` takes over
- No content disappears at any point

## Verification

To verify the backend is working correctly:

1. **Check Database**: After a message with tool calls is sent, query the database:
   ```sql
   SELECT content FROM "Message" WHERE "threadId" = '<thread-id>' ORDER BY "creationDate" DESC LIMIT 1;
   ```
   The `content` field should contain both the text and tool_calls.

2. **Check Stream Format**: Enable debug logging in the browser's Network tab to see the streaming response. The stream should include both text deltas and tool call parts.

3. **Refresh Test**: After refresh, if the message displays correctly, it confirms the backend is saving data properly and the issue is frontend state management.

## Related Documentation

- [Vercel AI SDK - Tool Call Streaming](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-tool-usage)
- [Vercel AI SDK - Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
- [useChat Hook Documentation](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)

## Backend Configuration

The backend has been configured with optimal settings for streaming:

```typescript
const result = streamText({
  model,
  messages: [...],
  tools,
  maxSteps: maxTurns,
  toolCallStreaming: true,  // ← Enables progressive tool call streaming
  // ...
});

return result.toDataStreamResponse();  // ← Correct format for useChat
```

## Conclusion

The backend streaming implementation is correct and follows Vercel AI SDK best practices. The message disappearance is a frontend React state management issue that occurs during the transition from text streaming to tool call execution. The recommended fix should be applied to the frontend component to maintain content visibility throughout the streaming process.
