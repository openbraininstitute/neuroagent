# Message Persistence Fix

## Problem

Assistant messages and tool calls were disappearing from the database after being saved. The issue was caused by incorrect message format and entity type handling when saving messages to the database.

## Root Causes

1. **Incorrect Entity Type**: The TypeScript code was using `Entity.AI_MESSAGE` for all assistant messages, but the Python backend uses:
   - `Entity.AI_MESSAGE` for assistant messages WITHOUT tool calls
   - `Entity.AI_TOOL` for assistant messages WITH tool calls

2. **Incorrect Message Content Format**: The message content was not matching the Python backend format. The Python backend stores messages with this structure:
   ```json
   {
     "role": "assistant",
     "content": "text content",
     "sender": "Agent",
     "function_call": null,
     "tool_calls": [
       {
         "id": "call_123",
         "function": {
           "name": "tool_name",
           "arguments": "{\"param\": \"value\"}"
         },
         "type": "function"
       }
     ]
   }
   ```

3. **Missing Tool Call Information in Content**: Tool calls were being saved as separate records but not included in the message content itself, breaking the relationship.

## Solution

### 1. Fixed `saveMessagesToDatabase` Method

Updated to:
- Use `Entity.AI_TOOL` for assistant messages with tool calls
- Use `Entity.AI_MESSAGE` for assistant messages without tool calls
- Store message content in Python-compatible format with `tool_calls` array
- Include proper message structure with `role`, `content`, `sender`, `function_call`, and `tool_calls` fields

### 2. Fixed `convertToCoreMessages` Method

Updated to:
- Handle both `Entity.AI_MESSAGE` and `Entity.AI_TOOL` entity types
- Parse tool calls from message content (Python format) instead of relying only on the toolCalls relation
- Support both formats for backward compatibility

## Message Flow

### Saving Messages (Vercel AI SDK → Database)

1. Vercel AI SDK returns messages with tool calls in `CoreMessage` format
2. `saveMessagesToDatabase` extracts tool calls and text content
3. Determines entity type based on presence of tool calls
4. Builds message content matching Python format
5. Saves message with nested tool call records

### Loading Messages (Database → Vercel AI SDK)

1. Load messages from database with `toolCalls` relation
2. Parse message content JSON
3. Extract tool calls from content (Python format)
4. Convert to Vercel AI SDK `CoreMessage` format
5. Return for LLM consumption

## Testing

To verify the fix:

1. Send a message that triggers tool calls
2. Check database for messages with `entity = 'AI_TOOL'`
3. Verify message content includes `tool_calls` array
4. Verify tool call records exist in `tool_calls` table
5. Reload the thread and verify messages appear correctly

## Related Files

- `backend-ts/src/lib/agents/routine.ts` - Main fix
- `backend/src/neuroagent/agent_routine.py` - Python reference implementation
- `backend-ts/prisma/schema.prisma` - Database schema
