# Human-in-the-Loop (HIL) Tool Validation

## Overview

Human-in-the-Loop (HIL) validation is a safety mechanism that requires explicit user approval before executing certain tools. This is essential for tools that:

- Perform destructive operations (delete, modify data)
- Access sensitive information
- Make external API calls with side effects
- Execute code or system commands
- Incur costs or resource usage

## How It Works

### 1. Tool Declaration

Tools that require HIL validation must set the `toolHil` static property to `true`:

```typescript
export class DangerousTool extends BaseTool<...> {
  static readonly toolName = 'dangerous_tool';
  static readonly toolDescription = 'Performs a dangerous operation...';
  static readonly toolHil = true; // Requires HIL validation

  // ... rest of implementation
}
```

### 2. Execution Flow

When the LLM requests to use a HIL tool:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LLM decides to use a HIL tool                            │
│    - Generates tool call with parameters                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 2. Agent Routine detects HIL requirement                    │
│    - Checks tool's requiresHIL() method                     │
│    - Blocks automatic execution                             │
│    - Returns HIL marker instead of executing                │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 3. Stream wrapper detects HIL marker                        │
│    - Saves tool call with validated: null                   │
│    - Sends annotation data to frontend                      │
│    - Format: 8:[{"toolCallId":"...","validated":"pending"}] │
│    - Ends stream and waits for validation                   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 4. Frontend displays validation prompt                      │
│    - Shows tool name and parameters                         │
│    - User can approve or reject                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 5. User validates (approve/reject)                          │
│    - Frontend sends POST to /api/qa/validate_tool           │
│    - Includes toolCallId, validatedInputs, isValidated      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 6. Validation endpoint processes request                    │
│    - Updates tool call: validated = true/false              │
│    - If approved: executes tool with validated inputs       │
│    - If rejected: saves rejection message                   │
│    - Saves tool result to database                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 7. Conversation continues                                   │
│    - Tool result is now in message history                  │
│    - User can continue the conversation                     │
│    - LLM sees the tool result in next turn                  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Database Schema

Tool calls are stored with a `validated` field:

```sql
CREATE TABLE tool_calls (
  tool_call_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  arguments TEXT NOT NULL,
  validated BOOLEAN NULL,  -- null = pending, true = approved, false = rejected
  message_id UUID NOT NULL REFERENCES messages(id)
);
```

- `validated: null` - Pending user validation
- `validated: true` - User approved, tool executed
- `validated: false` - User rejected, tool not executed

## Implementation Details

### Agent Routine (routine.ts)

The `AgentsRoutine.streamChat()` method wraps tool execution to detect HIL requirements:

```typescript
// Wrap tool execution
const wrappedTool = {
  ...originalTool,
  execute: async (args, options) => {
    // Check if this tool requires HIL validation
    if (hilToolNames.has(toolName)) {
      // Return HIL marker instead of executing
      return {
        __hil_required: true,
        toolName,
        toolCallId: options.toolCallId,
        args,
        message: `Tool "${toolName}" requires human validation.`,
      };
    }

    // Normal execution for non-HIL tools
    return await originalExecute(args, options);
  },
};
```

### Stream Wrapper (wrapStreamForHIL)

After the stream completes, the wrapper checks for pending tool calls:

```typescript
// Query database for tool calls with validated: null
const pendingToolCalls = await prisma.toolCall.findMany({
  where: {
    message: { threadId },
    validated: null,
  },
});

if (pendingToolCalls.length > 0) {
  // Send annotation data to frontend
  const annotationData = pendingToolCalls.map((tc) => ({
    toolCallId: tc.id,
    validated: 'pending',
  }));

  // Format: 8:[{"toolCallId":"...","validated":"pending"}]
  controller.enqueue(`8:${JSON.stringify(annotationData)}\n`);
}
```

### Validation Endpoint (validate_tool/route.ts)

The validation endpoint handles user approval/rejection:

```typescript
POST /api/qa/validate_tool
{
  "toolCallId": "call_abc123",
  "validatedInputs": { "action": "delete", "target": "file.txt" },
  "isValidated": true
}

// Response
{
  "success": true,
  "result": "Tool execution result..."
}
```

## Frontend Integration

The frontend must:

1. **Listen for annotation events** in the stream (event type `8`)
2. **Display validation UI** showing tool name and parameters
3. **Send validation request** to `/api/qa/validate_tool`
4. **Handle validation response** and update UI accordingly

Example frontend code:

```typescript
// Listen for annotation events
stream.on('annotation', (data) => {
  if (data.validated === 'pending') {
    // Show validation prompt
    showValidationPrompt({
      toolCallId: data.toolCallId,
      toolName: data.toolName,
      parameters: data.parameters,
    });
  }
});

// User approves
async function approveToolCall(toolCallId, validatedInputs) {
  const response = await fetch('/api/qa/validate_tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolCallId,
      validatedInputs,
      isValidated: true,
    }),
  });

  const result = await response.json();
  // Display result and allow conversation to continue
}

// User rejects
async function rejectToolCall(toolCallId) {
  await fetch('/api/qa/validate_tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolCallId,
      validatedInputs: {},
      isValidated: false,
    }),
  });
}
```

## Example: Dangerous Tool

See `src/lib/tools/test/DangerousTool.ts` for a complete example:

```typescript
export class DangerousTool extends BaseTool<...> {
  static readonly toolName = 'dangerous_tool';
  static readonly toolHil = true; // Requires validation

  async execute(input) {
    // This only runs after user approval
    return `Performed ${input.action} on ${input.target}`;
  }
}
```

## Testing HIL Validation

To test the HIL validation flow:

1. **Register a HIL tool** (e.g., DangerousTool)
2. **Start a conversation** that triggers the tool
3. **Verify stream pauses** with annotation data
4. **Approve/reject** via validation endpoint
5. **Verify tool executes** (if approved) or is rejected

Example test conversation:

```
User: "Perform a dangerous operation on test.txt"
Agent: [Requests dangerous_tool]
System: [Pauses, sends annotation with validated: "pending"]
Frontend: [Shows validation prompt]
User: [Approves]
System: [Executes tool, saves result]
Agent: [Continues with tool result]
```

## Security Considerations

1. **Authentication**: Validation endpoint should verify user owns the thread
2. **Authorization**: Check user has permission to execute the tool
3. **Input validation**: Re-validate inputs even after user approval
4. **Audit logging**: Log all HIL validations for security audits
5. **Timeout**: Consider adding timeout for pending validations

## Python Backend Compatibility

This implementation matches the Python backend behavior:

- Tool calls with `hil: true` are blocked from execution
- Annotation data format: `8:[{"toolCallId":"...","validated":"pending"}]`
- Database schema: `validated` field on `tool_calls` table
- Validation flow: separate endpoint for user approval

## Future Enhancements

1. **Validation timeout**: Auto-reject after X minutes
2. **Validation history**: Track who validated what and when
3. **Batch validation**: Validate multiple tool calls at once
4. **Validation policies**: Role-based validation requirements
5. **Audit trail**: Comprehensive logging of all validations
