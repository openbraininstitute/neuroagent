# Tool Call Display Fix

## Problem

Tool calls were disappearing from the chat interface or reverting to "calling" state after being executed. The frontend would show the tool being called, but after the result came back or on page refresh, the tool call would either vanish or show as still calling.

## Root Cause

The TypeScript backend's message formatting logic didn't match the Python backend's implementation. Key differences:

### 1. Processing Order

- **Python**: Processes messages in REVERSE order (oldest to newest), then reverses back
- **TypeScript (wrong)**: Processed in descending order (newest to oldest)

### 2. Buffering Logic

- **Python**: Buffers `parts` and `annotations` across multiple messages, flushing on AI_MESSAGE or USER
- **TypeScript (wrong)**: Simple one-pass processing without proper buffering

### 3. Missing Annotations

- **Python**: Creates annotations for each tool call with validation status and isComplete
- **TypeScript (wrong)**: No annotations, causing frontend to not know tool call state

### 4. Entity Handling

- **Python**: Treats AI_MESSAGE and AI_TOOL differently - AI_MESSAGE flushes buffer, AI_TOOL adds to buffer
- **TypeScript (wrong)**: Treated them the same way

### 5. Dummy Messages

- **Python**: Creates dummy AI messages when buffer has parts but no AI_MESSAGE to attach to
- **TypeScript (wrong)**: Didn't create dummy messages

## Solution

Rewrote the Vercel format message processing to exactly match Python's `format_messages_to_vercel()` function:

### 1. Process in Reverse Order

```typescript
// Reverse to process oldest to newest
const reversedMessages = [...dbMessages].reverse();

for (const msg of reversedMessages) {
  // Process messages...
}

// Reverse back to descending order (newest first)
const orderedMessages = messages.reverse();
```

### 2. Buffer Parts and Annotations

```typescript
let parts: Array<any> = [];
let annotations: Array<any> = [];

// Buffer accumulates across messages until flushed
```

### 3. Handle AI_MESSAGE (Flush Buffer)

```typescript
if (msg.entity === entity.AI_MESSAGE) {
  if (textContent) {
    parts.push({ type: 'text', text: textContent });
  }

  annotations.push({
    messageId: msg.id,
    isComplete: msg.isComplete,
  });

  messageData.parts = parts;
  messageData.annotations = annotations;

  // Reset buffer after flushing
  parts = [];
  annotations = [];
  messages.push(messageData);
}
```

### 4. Handle AI_TOOL (Add to Buffer)

```typescript
else if (msg.entity === entity.AI_TOOL) {
  // Add text and reasoning to buffer
  if (textContent) {
    parts.push({ type: 'text', text: textContent });
  }

  // Add tool calls to buffer
  for (const tc of msg.toolCalls) {
    const requiresValidation = toolHilMapping[tc.name] || false;
    let status: 'accepted' | 'rejected' | 'pending' | 'not_required';

    if (tc.validated === true) {
      status = 'accepted';
    } else if (tc.validated === false) {
      status = 'rejected';
    } else if (!requiresValidation) {
      status = 'not_required';
    } else {
      status = 'pending';
    }

    parts.push({
      type: 'tool-invocation',
      toolInvocation: {
        toolCallId: tc.id,
        toolName: tc.name,
        args: JSON.parse(tc.arguments),
        state: 'call',
      },
    });

    annotations.push({
      toolCallId: tc.id,
      validated: status,
      isComplete: msg.isComplete,
    });
  }
}
```

### 5. Handle TOOL (Merge Results)

```typescript
else if (msg.entity === entity.TOOL) {
  const toolCallId = content.tool_call_id || content.toolCallId;
  const toolResult = content.content || content.result || '';

  // Find the buffered tool call
  const toolCallPart = parts.find(
    (part) =>
      part.type === 'tool-invocation' &&
      part.toolInvocation?.toolCallId === toolCallId
  );

  if (toolCallPart) {
    toolCallPart.toolInvocation.result = toolResult;
    toolCallPart.toolInvocation.state = 'result';
  }

  // Update annotation isComplete
  const annotation = annotations.find(
    (ann) => ann.toolCallId === toolCallId
  );
  if (annotation) {
    annotation.isComplete = msg.isComplete;
  }
}
```

### 6. Create Dummy Messages

```typescript
// If we encounter a user message with a non-empty buffer, add a dummy AI message
if (msg.entity === entity.USER && parts.length > 0) {
  messages.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    createdAt: msg.creationDate.toISOString(),
    content: '',
    parts,
    annotations,
  });
}

// If the tool call buffer is not empty at the end, add a dummy AI message
if (parts.length > 0) {
  messages.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    createdAt: reversedMessages[reversedMessages.length - 1].creationDate.toISOString(),
    content: '',
    parts,
    annotations,
  });
}
```

## How It Works

### Message Flow Example

**Database Messages (descending order):**

1. USER: "What's the weather in Paris?"
2. AI_TOOL: "I'll check the weather" + tool_calls=[{id: "call_123", name: "get_weather"}]
3. TOOL: {tool_call_id: "call_123", content: "{temp: 20}"}
4. AI_MESSAGE: "The weather in Paris is 20°C"

**Processing (reversed to ascending):**

1. USER message → Add to messages, reset buffer
2. AI_TOOL message → Add text to parts buffer, add tool call to parts buffer, add annotation
3. TOOL message → Find tool call in buffer, update result and state to "result"
4. AI_MESSAGE → Add text to parts buffer, add message annotation, flush buffer to message

**Result (reversed back to descending):**

```json
[
  {
    "role": "assistant",
    "content": "The weather in Paris is 20°C",
    "parts": [...],
    "annotations": [{...}]
  },
  {
    "role": "assistant",
    "content": "I'll check the weather",
    "parts": [
      {
        "type": "tool-invocation",
        "toolInvocation": {
          "state": "result",
          "toolCallId": "call_123",
          "toolName": "get_weather",
          "args": {...},
          "result": "{temp: 20}"
        }
      }
    ],
    "annotations": [
      {
        "toolCallId": "call_123",
        "validated": "not_required",
        "isComplete": true
      }
    ]
  },
  {
    "role": "user",
    "content": "What's the weather in Paris?"
  }
]
```

## Key Differences from Previous Implementation

| Aspect                | Previous (Wrong)          | Current (Correct)                         |
| --------------------- | ------------------------- | ----------------------------------------- |
| Processing order      | Descending (newest first) | Reverse to ascending, then back           |
| Buffering             | Simple map                | Proper buffer with flush logic            |
| Annotations           | None                      | Full annotation support                   |
| AI_MESSAGE vs AI_TOOL | Same handling             | Different - MESSAGE flushes, TOOL buffers |
| Dummy messages        | Not created               | Created when needed                       |
| Tool call state       | Always 'call' initially   | Properly updated to 'result'              |
| Validation status     | Not included              | Included in annotations                   |

## Why This Matters

### Annotations Tell Frontend the State

The frontend uses annotations to determine:

- **validated**: Whether tool needs human approval (pending/accepted/rejected/not_required)
- **isComplete**: Whether the tool execution is finished
- **toolCallId**: Links annotation to specific tool call

Without annotations, the frontend doesn't know:

- If a tool call is complete
- If it needs validation
- What the validation status is

This causes the "calling" state issue - the frontend thinks the tool is still executing because there's no annotation saying it's complete.

### Buffering Ensures Correct Grouping

Tool calls and their results come as separate messages in the database:

- AI_TOOL message has the tool call
- TOOL message has the result

The buffer accumulates these until an AI_MESSAGE flushes them, ensuring they're grouped correctly in the response.

## Testing

To verify the fix:

1. **Tool Call Execution**:
   - Ask: "What's the weather in Paris?"
   - Tool should show "calling" → "result" transition
   - Result should persist after page refresh

2. **Multiple Tool Calls**:
   - Ask: "What time is it in Tokyo and what's the weather there?"
   - Both tools should show results
   - Both should persist

3. **Page Refresh**:
   - Execute a tool call
   - Refresh the page
   - Tool call should still show "result" state, not revert to "calling"

## Files Modified

- `backend-ts/src/app/api/threads/[thread_id]/messages/route.ts`
  - Complete rewrite of Vercel format processing
  - Now matches Python's `format_messages_to_vercel()` exactly

## Comparison with Python Backend

This implementation now **exactly matches** the Python backend:

- `backend/src/neuroagent/app/app_utils.py` - `format_messages_to_vercel()` function
- Same processing order (reverse, process, reverse back)
- Same buffering logic
- Same annotation creation
- Same dummy message creation
- Same entity handling (AI_MESSAGE vs AI_TOOL)

The TypeScript version is now a line-by-line translation of the Python logic.
