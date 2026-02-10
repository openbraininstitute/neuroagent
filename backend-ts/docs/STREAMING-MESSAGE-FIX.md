# Streaming Message Disappearance Fix

## Problem

Messages were disappearing mid-stream when using the TypeScript backend with the frontend. The issue manifested as:
- Messages disappearing at random points during streaming (beginning, after tool calls, or before final response)
- After page refresh, all messages appeared correctly from the database
- Python backend worked fine with the same frontend

## Root Cause

The `ChatPage` component in `frontend/src/app/threads/[threadId]/page.tsx` was using an unstable `key` prop:

```typescript
const key = messages.at(-1) ? md5(JSON.stringify(messages.at(-1))) : null;

return <ChatPage key={key} ... />;
```

This key was based on the MD5 hash of the last message. When messages were saved to the database during streaming (via the `onFinish` callback), the server component would re-render with the updated messages, generating a new key. This caused React to **unmount and remount** the entire `ChatPage` component, destroying all streaming state in the `useChat` hook.

### Why This Happened

1. Backend saves messages to database via `onFinish` callback after each streaming step
2. Server component (`page.tsx`) re-renders when data changes
3. New last message → new MD5 hash → new `key` prop
4. React sees different `key` → unmounts old component → mounts new component
5. `useChat` hook loses all streaming state → messages disappear

### Evidence from Logs

```
[chat-page] Messages changed: {count: 2, status: 'streaming'...}
server-fetches.ts:20  Server  [next-auth][debug][CHUNKING_SESSION_COOKIE]
[chat-page] Messages changed: {count: 0, status: 'ready'...}
[chat-page] Messages changed: {count: 1, status: 'ready'...}
```

The session cookie warnings indicated server-side re-renders, which triggered the key change and component remounting.

## Solution

### Frontend Changes

**File: `frontend/src/app/threads/[threadId]/page.tsx`**

Changed the `key` prop from message-based hash to stable `threadId`:

```typescript
// Before (WRONG - causes remounting)
const key = messages.at(-1) ? md5(JSON.stringify(messages.at(-1))) : null;
return <ChatPage key={key} ... />;

// After (CORRECT - stable key)
return <ChatPage key={threadId} ... />;
```

Using `threadId` as the key ensures the component only remounts when navigating to a different thread, not when messages are added during streaming.

### Why This Works

- `threadId` is stable throughout the conversation
- Component persists across server re-renders
- `useChat` hook maintains streaming state
- Messages accumulate correctly in the UI
- Database saves happen in background without affecting UI

## Key Insights

1. **Server Components and Keys**: Be careful with `key` props on client components rendered by server components. Keys based on frequently changing data cause unnecessary remounting.

2. **Streaming State is Fragile**: The `useChat` hook's streaming state is lost when the component unmounts. Always use stable keys for components that manage streaming state.

3. **Server Re-renders During Streaming**: Server components can re-render during streaming when data changes (e.g., database updates, session updates). This is normal but must not cause client component remounting.

4. **The Real Issue Wasn't Database Saves**: The `onFinish` callback saving messages was correct. The issue was the server component reacting to those saves by generating a new key.

## Testing

To verify the fix:
1. Start a chat and send a message that triggers tool calls
2. Observe that messages remain visible throughout streaming
3. Verify that tool calls execute and responses stream correctly
4. Confirm that after streaming completes, messages are persisted to database
5. Refresh the page and confirm all messages load correctly

## Related Files

- `frontend/src/app/threads/[threadId]/page.tsx` - **Main fix location** (changed key prop)
- `frontend/src/components/chat/chat-page.tsx` - Client component with useChat hook
- `backend-ts/src/lib/agents/routine.ts` - Streaming implementation with `onFinish`
- `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts` - API endpoint

## Comparison with Python Backend

Both backends work identically:
- Stream messages to client using Vercel AI SDK format
- Save messages to database after streaming completes
- Frontend `useChat` hook manages streaming state

The Python backend worked because it was tested with a version of the frontend that didn't have the unstable key prop issue, or the issue wasn't noticed during testing.

## Prevention

To prevent similar issues:
- Use stable identifiers (IDs, slugs) for `key` props on stateful components
- Avoid keys based on frequently changing data (message content, timestamps, hashes)
- Be aware that server components can re-render during client-side operations
- Test streaming scenarios thoroughly, especially with database persistence enabled
