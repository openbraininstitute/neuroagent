# Tool Result Pagination Fix

## Problem

After calling ~30 tools in parallel during streaming, about 70% of tool results showed as "loading" after page refresh when using pagination (scrolling up to load more messages). When fetching all messages at once (no pagination), all results displayed correctly.

## Root Cause

The pagination logic for Vercel format was incorrectly including `AI_TOOL` and `TOOL` entities in the **cursor query**, which broke the pagination boundaries.

### How Pagination Works

The Python backend uses a two-phase approach for Vercel format:

1. **Phase 1 (Cursor Query):** Fetch only `USER` and `AI_MESSAGE` entities to determine pagination boundaries
2. **Phase 2 (Full Query):** Fetch ALL messages (including `AI_TOOL` and `TOOL`) within the date range determined by the cursor

This is critical because:
- `AI_TOOL` messages contain tool calls
- `TOOL` messages contain tool results
- These have **different timestamps** than their corresponding `AI_MESSAGE`
- Including them in the cursor query throws off pagination boundaries

### The Bug

The TypeScript backend was including `AI_TOOL` and `TOOL` in the entity filter for BOTH queries:

```typescript
// ❌ WRONG - Including AI_TOOL and TOOL in cursor query
if (vercelFormat) {
  entityFilter = [entity.USER, entity.AI_MESSAGE, entity.AI_TOOL, entity.TOOL];
}

// This caused pagination boundaries to be calculated incorrectly
const messageCursor = await prisma.message.findMany({
  where: {
    threadId: thread_id,
    entity: { in: entityFilter }, // ← Wrong entities!
  },
  // ... pagination logic
});
```

When paginating, the cursor would land on a `TOOL` message instead of a `USER` or `AI_MESSAGE`, causing the date range calculation to exclude the corresponding tool calls and results.

## Solution

The fix implements the same two-phase pagination approach as the Python backend:

### Phase 1: Cursor Query (Only USER and AI_MESSAGE)

```typescript
// ✅ FIXED - Only USER and AI_MESSAGE for pagination cursor
let entityFilter: entity[] | null = null;
if (vercelFormat) {
  entityFilter = [entity.USER, entity.AI_MESSAGE]; // ← Correct!
} else if (entityFilterParam) {
  entityFilter = entityFilterParam.split(',').map((e) => e as entity);
}

// Use this filter for the cursor query
const messageCursor = await prisma.message.findMany({
  where: {
    threadId: thread_id,
    entity: { in: entityFilter }, // ← Only USER and AI_MESSAGE
  },
  select: {
    id: true,
    creationDate: true,
    entity: true,
  },
  orderBy: { creationDate: 'desc' },
  take: pageSize + 1,
});
```

### Phase 2: Full Query (ALL Messages in Date Range)

```typescript
if (vercelFormat) {
  // Build date conditions based on cursor results
  const dateConditions: any = {
    threadId: thread_id,
    // NO entity filter here - fetch ALL message types!
  };

  // Set date boundaries based on cursor
  if (cursor) {
    dateConditions.creationDate = { lt: new Date(cursor) };
  }

  if (hasMore && dbCursor.length >= 2) {
    const secondToLast = dbCursor[dbCursor.length - 2];
    const last = dbCursor[dbCursor.length - 1];

    if (secondToLast && secondToLast.entity === entity.USER) {
      dateConditions.creationDate = {
        ...dateConditions.creationDate,
        gte: secondToLast.creationDate,
      };
    } else if (last) {
      dateConditions.creationDate = {
        ...dateConditions.creationDate,
        gt: last.creationDate,
      };
    }
  }

  // Fetch ALL messages (USER, AI_MESSAGE, AI_TOOL, TOOL) in date range
  dbMessages = await prisma.message.findMany({
    where: dateConditions, // ← No entity filter!
    include: { toolCalls: true },
    orderBy: { creationDate: 'desc' },
  });
}
```

This ensures:
1. Pagination boundaries are calculated based on USER/AI_MESSAGE only
2. All related AI_TOOL and TOOL messages within those boundaries are fetched
3. Tool results are properly merged with their tool calls

## Why It Worked During Streaming

During streaming, the Vercel AI SDK format code path (lines 268-389) correctly handles TOOL entities:

```typescript
else if (msg.entity === entity.TOOL) {
  // Merge tool result back into buffered part
  const toolCallId = content.tool_call_id || content.toolCallId;
  const toolResult = content.content || content.result || '';

  const toolCallPart = parts.find(
    (part) => part.toolInvocation?.toolCallId === toolCallId
  );

  if (toolCallPart) {
    toolCallPart.toolInvocation.result = toolResult;
    toolCallPart.toolInvocation.state = 'result';
  }
}
```

This code path processes TOOL entity messages and merges results into the buffered tool invocations, which is why results appeared correctly during streaming.

## Impact

- ✅ Tool results now display correctly with pagination (fixes the 70% loading issue)
- ✅ Matches Python backend pagination logic exactly
- ✅ No schema changes required
- ✅ Works correctly when scrolling up to load more messages
- ✅ All tool results are properly saved and retrieved

## Files Modified

- `backend-ts/src/app/api/threads/[thread_id]/messages/route.ts`
  - Line ~124: Changed entity filter to only include USER and AI_MESSAGE for Vercel format cursor query
  - Line ~189: Removed entity filter from Vercel format full query (fetches ALL messages in date range)
  - Lines 232-268: Added tool result retrieval for standard format (secondary fix)

## Testing

1. Call multiple tools in parallel (e.g., 30 EntityCore tools)
2. Wait for all results to stream in
3. Refresh the page
4. Scroll up to trigger pagination
5. Verify all tool results display correctly (not stuck in "loading" state)

## Python Backend Reference

This fix implements the same logic as Python backend (`backend/src/neuroagent/app/routers/threads.py`):
- Lines 408-410: Sets `entity = ["USER", "AI_MESSAGE"]` for Vercel format cursor
- Lines 432-445: Fetches all messages in date range without entity filter

## Testing

To verify the fix:

1. Call multiple tools in parallel (e.g., 30 EntityCore tools)
2. Wait for all results to stream in
3. Refresh the page
4. Verify all tool results display correctly (not stuck in "loading" state)

## Related

- Python implementation: `backend/src/neuroagent/app/app_utils.py` (format_messages_vercel function)
- Database schema: `backend-ts/prisma/schema.prisma`
- Python schema: `backend/src/neuroagent/app/database/sql_schemas.py`
