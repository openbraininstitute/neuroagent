# Tool Filtering and Model Selection Implementation

## Overview

This document describes the implementation of tool filtering and model selection in the TypeScript backend, matching the Python backend's `filter_tools_and_model_by_conversation` functionality.

## Implementation Date

February 3, 2026

## Files Created/Modified

### New Files

- `backend-ts/src/lib/utils/tool-filtering.ts` - Core tool filtering and model selection logic

### Modified Files

- `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts` - Integrated filtering before agent execution

## Functionality

### Purpose

The tool filtering and model selection system analyzes conversation history to:

1. **Filter Tools**: When the number of available tools exceeds a threshold, select only the most relevant tools for the current query
2. **Select Model**: When no model is pre-selected, analyze query complexity and choose an appropriate model with reasoning level

### How It Works

#### 1. Tool Selection

When `toolList.length > settings.tools.minToolSelection`:

- Loads conversation history from database
- Converts messages to OpenAI format
- Calls LLM (gemini-2.5-flash via OpenRouter) with structured output
- LLM analyzes conversation and selects relevant tools
- Biases toward inclusion (better to have too many than too few)
- Saves selected tools to `tool_selection` table

#### 2. Model Selection

When no model is explicitly selected (or model is "auto"):

- LLM ranks query complexity on scale of 0-10
- Maps complexity to appropriate model and reasoning level:
  - 0-1: `gpt-5-nano` with `minimal` reasoning
  - 2-5: `gpt-5-mini` with `low` reasoning
  - 6-8: `gpt-5-mini` with `medium` reasoning
  - 9-10: `gpt-5.1` with `medium` reasoning
- Saves complexity estimation to `complexity_estimation` table

#### 3. Token Tracking

- Tracks token consumption for the filtering operation
- Saves to `token_consumption` table with task type `TOOL_SELECTION`

## Database Schema

The implementation uses existing Prisma schema tables:

```prisma
model ToolSelection {
  id        String  @id @db.Uuid
  toolName  String  @map("tool_name") @db.VarChar
  messageId String  @map("message_id") @db.Uuid
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
}

model ComplexityEstimation {
  id         String           @id @db.Uuid
  complexity Int?
  model      String           @db.VarChar
  reasoning  reasoninglevels?
  messageId  String           @map("message_id") @db.Uuid
  message    Message          @relation(fields: [messageId], references: [id], onDelete: Cascade)
}

model TokenConsumption {
  id        String    @id @db.Uuid
  messageId String    @map("message_id") @db.Uuid
  type      tokentype
  task      task
  count     Int
  model     String    @db.VarChar
  message   Message   @relation(fields: [messageId], references: [id], onDelete: Cascade)
}
```

## API Integration

### Chat Streaming Route

The filtering is integrated into the chat streaming route at:
`/api/qa/chat_streamed/[thread_id]`

**Flow:**

1. User sends message with optional `model` parameter
2. Message is saved to database
3. Tool filtering runs (if needed)
4. Model selection runs (if needed)
5. Filtered tools and selected model are used for agent execution
6. Agent streams response back to client

**Request Body:**

```typescript
{
  content: string;      // User message
  model?: string;       // Optional: model ID or "auto"
}
```

**Model Selection Logic:**

- If `model` is omitted or `"auto"`: Automatic model selection based on complexity
- If `model` is a valid model ID: Use that model, skip complexity analysis
- If OpenRouter token is not configured: Use default model from settings

## Configuration

### Environment Variables

```bash
# Required for tool filtering and model selection
NEUROAGENT_LLM__OPENROUTER_TOKEN=your_token_here

# Configuration
NEUROAGENT_TOOLS__MIN_TOOL_SELECTION=5  # Minimum tools to select
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=openai/gpt-5-mini
NEUROAGENT_LLM__DEFAULT_CHAT_REASONING=low
```

### Settings

Configured in `backend-ts/src/lib/config/settings.ts`:

```typescript
{
  tools: {
    minToolSelection: 5,  // Threshold for tool filtering
  },
  llm: {
    openRouterToken: string,
    defaultChatModel: 'openai/gpt-5-mini',
    defaultChatReasoning: 'low',
  }
}
```

## System Prompt

The filtering uses a carefully crafted system prompt that:

1. Instructs the LLM to analyze conversation context
2. Provides tool descriptions and example utterances
3. Defines complexity ranking criteria
4. Specifies output format (structured JSON via Zod schema)

**Key Instructions:**

- **Tool Selection**: "BIAS TOWARD INCLUSION: If uncertain about a tool's relevance, include it"
- **Complexity Ranking**: Considers both query complexity and tool availability
- **Output Format**: Structured JSON with `selected_tools` and/or `complexity` fields

## Vercel AI SDK Integration

Uses Vercel AI SDK v4.3.19 with:

- `generateObject()` for structured output generation
- OpenRouter provider via `@openrouter/ai-sdk-provider`
- Zod schemas for type-safe output validation

**Note:** Type assertion (`as any`) is used for OpenRouter provider due to version mismatch between AI SDK v4.3.19 and OpenRouter provider v0.0.5.

## Error Handling

### Fallback Behavior

If filtering fails:

- **Tool Selection**: Returns empty array (no tools) or all tools depending on context
- **Model Selection**: Uses default model and reasoning from settings
- **Database**: Still saves model selection record with null complexity

### Logging

Comprehensive logging at each step:

```typescript
console.log('[filterToolsAndModelByConversation] Starting:', { ... });
console.log('[filterToolsAndModelByConversation] Loaded N messages');
console.log('[filterToolsAndModelByConversation] Calling LLM for filtering...');
console.log('[filterToolsAndModelByConversation] Query complexity: X / 10, ...');
```

## Performance Considerations

### Token Optimization

- Tool responses are truncated to "..." in filtering context
- Only essential message content is sent to LLM
- Uses fast model (gemini-2.5-flash) for filtering

### Caching

- No caching implemented yet
- Future: Could cache tool selections for similar queries

### Timing

Typical filtering operation: 1-3 seconds

## Comparison with Python Backend

### Similarities

✅ Same system prompt and instructions
✅ Same complexity-to-model mapping
✅ Same database schema and relationships
✅ Same token tracking approach
✅ Same fallback behavior on errors

### Differences

⚠️ **LLM Client**: Python uses OpenAI client directly, TypeScript uses Vercel AI SDK
⚠️ **Type System**: Python uses Pydantic dynamic models, TypeScript uses Zod dynamic schemas
⚠️ **Async Patterns**: Python uses `async/await` with SQLAlchemy, TypeScript uses Prisma

### Feature Parity

✅ Tool filtering based on conversation context
✅ Model selection based on query complexity
✅ Token consumption tracking
✅ Database persistence of selections
✅ Configurable thresholds and defaults
✅ Error handling and fallbacks

## Testing

### Manual Testing

1. Send query with `model: "auto"` - should trigger model selection
2. Send query with many tools available - should trigger tool filtering
3. Send query with specific model - should skip model selection
4. Check database for `tool_selection`, `complexity_estimation`, and `token_consumption` records

### Database Verification

```sql
-- Check tool selection
SELECT * FROM tool_selection WHERE message_id = 'your_message_id';

-- Check complexity estimation
SELECT * FROM complexity_estimation WHERE message_id = 'your_message_id';

-- Check token consumption
SELECT * FROM token_consumption WHERE message_id = 'your_message_id' AND task = 'TOOL_SELECTION';
```

## Future Improvements

1. **Caching**: Cache tool selections for similar queries
2. **Provider Upgrade**: Update OpenRouter provider to match AI SDK version
3. **Metrics**: Track filtering accuracy and performance
4. **A/B Testing**: Compare filtered vs. unfiltered tool performance
5. **User Feedback**: Allow users to override tool/model selection

## References

- Python implementation: `backend/src/neuroagent/app/app_utils.py`
- Python dependencies: `backend/src/neuroagent/app/dependencies.py`
- Vercel AI SDK docs: https://sdk.vercel.ai/docs
- OpenRouter provider: https://github.com/openrouterteam/ai-sdk-provider
