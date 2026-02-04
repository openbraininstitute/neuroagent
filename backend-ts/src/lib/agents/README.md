# Agents Module

This module provides the core agent orchestration logic for the Neuroagent TypeScript backend using Vercel AI SDK.

## Overview

The agents module handles:

- LLM streaming with Vercel AI SDK's `streamText` function
- Message history conversion from database format to CoreMessage format
- Tool execution and response formatting
- Token consumption tracking
- Streaming interruption recovery

## Components

### AgentsRoutine

The main class for orchestrating LLM interactions.

```typescript
import { AgentsRoutine } from '@/lib/agents';

// Initialize with API keys
const routine = new AgentsRoutine(
  process.env.OPENAI_API_KEY,
  undefined, // openaiBaseUrl (optional)
  process.env.OPENROUTER_API_KEY
);

// Stream a chat response
const response = await routine.streamChat(
  {
    model: 'openai/gpt-4',
    temperature: 1.0,
    tools: [webSearchTool, literatureSearchTool],
    instructions: 'You are a helpful neuroscience research assistant.',
  },
  threadId,
  maxTurns,
  maxParallelToolCalls
);
```

### AgentConfig

Configuration interface for agent behavior:

```typescript
interface AgentConfig {
  model: string; // Model identifier (e.g., 'openai/gpt-4')
  temperature: number; // Temperature for generation (0-2)
  maxTokens?: number; // Maximum tokens to generate
  reasoning?: string; // Reasoning level (optional)
  tools: BaseTool<any>[]; // Available tools
  instructions: string; // System instructions
}
```

## Features

### Provider Support

The routine supports multiple LLM providers:

- **OpenAI**: Models prefixed with `openai/` or no prefix (default)
- **OpenRouter**: Models prefixed with `openrouter/`

```typescript
// OpenAI
await routine.streamChat({ model: 'openai/gpt-4', ... }, ...);
await routine.streamChat({ model: 'gpt-4', ... }, ...); // Default to OpenAI

// OpenRouter
await routine.streamChat({ model: 'openrouter/anthropic/claude-3', ... }, ...);
```

### Message Conversion

Database messages are automatically converted to Vercel AI SDK's CoreMessage format:

| Database Entity | CoreMessage Role | Notes                                       |
| --------------- | ---------------- | ------------------------------------------- |
| USER            | user             | User messages                               |
| AI_MESSAGE      | assistant        | Assistant messages (may include tool calls) |
| TOOL            | tool             | Tool execution results                      |

### Token Tracking

All LLM calls automatically track token consumption:

- **INPUT_NONCACHED**: Prompt tokens
- **COMPLETION**: Completion tokens

Token records include:

- Type (INPUT_NONCACHED, INPUT_CACHED, COMPLETION)
- Task (CHAT_COMPLETION, TOOL_SELECTION, CALL_WITHIN_TOOL)
- Count (number of tokens)
- Model (model identifier)

### Streaming Interruption Handling

If a stream is interrupted:

1. Partial content is tracked during streaming
2. On error, a partial message is saved with `isComplete=false`
3. The error is re-thrown for handling by the caller

## Database Integration

The routine integrates with Prisma for:

### Message Storage

- Creates message records with unique IDs
- Stores message content as JSON
- Tracks completion status (`isComplete`)
- Associates messages with threads

### Tool Call Storage

- Stores tool call ID, name, and arguments
- Links tool calls to messages
- Tracks validation status

### Token Consumption Storage

- Creates token consumption records
- Links to messages
- Includes type, task, count, and model

## Error Handling

### Provider Configuration Errors

```typescript
// Throws if provider not configured
throw new Error('OpenAI provider not configured');
throw new Error('OpenRouter provider not configured');
```

### Streaming Errors

- Caught and logged
- Partial messages saved (best-effort)
- Error re-thrown for caller handling

### Message Parsing Errors

- Malformed messages are skipped
- Errors logged to console
- Conversion continues with remaining messages

## Testing

The module includes comprehensive unit tests:

```bash
npm test tests/agents/routine.test.ts
```

Tests cover:

- Constructor initialization
- Message conversion (user, assistant, tool)
- Provider selection
- Token consumption record generation
- Error handling

## Usage Example

```typescript
import { AgentsRoutine } from '@/lib/agents';
import { getSettings } from '@/lib/config/settings';
import { initializeTools } from '@/lib/tools';

// Get configuration
const settings = getSettings();

// Initialize tools
const tools = await initializeTools({
  exaApiKey: settings.tools.exaApiKey,
  entitycoreUrl: settings.tools.entitycore.url,
  // ... other tool config
});

// Create routine
const routine = new AgentsRoutine(
  settings.llm.openaiToken,
  settings.llm.openaiBaseUrl,
  settings.llm.openRouterToken
);

// Stream chat
const response = await routine.streamChat(
  {
    model: settings.llm.defaultChatModel,
    temperature: settings.llm.temperature,
    maxTokens: settings.llm.maxTokens,
    tools,
    instructions: 'You are a helpful neuroscience research assistant.',
  },
  threadId,
  settings.agent.maxTurns,
  settings.agent.maxParallelToolCalls
);

// Return streaming response to client
return response;
```

## Requirements Satisfied

- ✅ 6.1: Agent Routine Implementation
- ✅ 6.2: Message History Conversion
- ✅ 6.3: Max Turn Limit
- ✅ 6.4: Tool Execution and Response Formatting
- ✅ 6.6: Streaming Interruption Handling
- ✅ 6.7: Token Consumption Tracking

## Future Enhancements

- Parallel tool execution (task 22)
- HIL tool validation (task 23)
- Custom OpenAI base URL support
- Cached token tracking
- Streaming progress callbacks
