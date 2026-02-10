# Shared State Parameter Implementation

## Overview

This document describes the implementation of the `shared_state` parameter in the TypeScript backend's chat streaming endpoint, matching the Python backend's `ClientRequest` schema.

## Changes Made

### 1. Type Definitions (`src/types/index.ts`)

Added centralized type definitions matching Python's `new_types.py`:

```typescript
// Shared state between backend and frontend (matches Python SharedState)
export interface SharedState {
  smc_simulation_config?: Record<string, any> | null;
}

// Client request body (matches Python ClientRequest)
export interface ClientRequest {
  content: string;
  tool_selection?: string[];
  model?: string;
  frontend_url?: string;
  shared_state?: SharedState | null;
}
```

### 2. API Route Schema (`src/app/api/qa/chat_streamed/[thread_id]/route.ts`)

Updated the request schema to accept `shared_state`:

```typescript
const SharedStateSchema = z.object({
  smc_simulation_config: z.record(z.any()).nullable().optional(),
});

const ChatStreamRequestSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
  model: z.string().optional(),
  tool_selection: z.array(z.string()).optional(),
  frontend_url: z.string().optional(),
  shared_state: SharedStateSchema.nullable().optional(),
});
```

### 3. Context Variables

Added `shared_state` to the context variables passed to tools:

```typescript
const agentConfig = {
  // ... other config
  contextVariables: {
    httpClient,
    exaApiKey: settings.tools.exaApiKey,
    entitycoreUrl: settings.tools.entitycore.url,
    entityFrontendUrl: settings.tools.frontendBaseUrl,
    vlabId: thread.vlabId || undefined,
    projectId: thread.projectId || undefined,
    obiOneUrl: settings.tools.obiOne.url,
    currentFrontendUrl: body.frontend_url || undefined,
    sharedState: body.shared_state || undefined,  // NEW
    threadId: thread_id,                          // NEW
    userId: userInfo.sub,                         // NEW
  },
};
```

### 4. Tool Updates - Vercel AI SDK Integration

Updated `GenerateSimulationsConfigTool` to use Vercel AI SDK's `generateObject` instead of direct OpenAI client:

**Before (OpenAI Client):**
```typescript
// Required openaiClient in context variables
const response = await openaiClient.chat.completions.create({
  model,
  messages: [...],
  response_format: { type: 'json_schema', ... }
});
const content = JSON.parse(response.choices[0].message.content);
```

**After (Vercel AI SDK):**
```typescript
// No openaiClient needed - uses Vercel AI SDK provider
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateObject({
  model: openai(model),
  schema: CircuitSimulationScanConfigModifiedSchema,
  system: systemPrompt,
  prompt: userMessage,
});
// result.object is already validated
```

**Benefits:**
- Native Zod schema validation (no need for zod-to-json-schema conversion)
- Automatic type inference from Zod schemas
- Consistent with Vercel AI SDK patterns used elsewhere
- Simpler error handling and response parsing
- Better integration with the agent routine

### 5. Context Variables Interface Update

```typescript
export interface GenerateSimulationsConfigContextVariables extends BaseContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: KyInstance;

  /** OBI-One API base URL */
  obiOneUrl: string;

  /** Virtual lab ID (optional) */
  vlabId?: string;

  /** Project ID (optional) */
  projectId?: string;

  /** Shared state containing existing configuration */
  sharedState?: SharedState | null;

  /** Entity frontend URL */
  entityFrontendUrl: string;

  /** Model to use for generation (optional, defaults to gpt-4o-mini) */
  model?: string;

  // Note: openaiClient removed - using Vercel AI SDK instead
}
```

## Python Backend Reference

This implementation matches the Python backend's behavior:

### Python `ClientRequest` (`backend/src/neuroagent/new_types.py`)
```python
class ClientRequest(BaseModel):
    content: str
    tool_selection: list[str] | None = None
    model: str = "auto"
    frontend_url: str | None = None
    shared_state: SharedState | None = None
```

### Python `get_context_variables` (`backend/src/neuroagent/app/dependencies.py`)
```python
async def get_context_variables(...) -> dict[str, Any]:
    body = await request.json()
    shared_state = body.get("shared_state")

    return {
        # ... other variables
        "openai_client": openai_client,  # Python uses OpenAI client
        "shared_state": shared_state,
        "thread_id": thread.thread_id,
        "user_id": user_info.sub,
        # ...
    }
```

**Note:** While Python passes `openai_client` in context variables, the TypeScript version uses Vercel AI SDK's `generateObject` which doesn't require a client instance in context variables.

## Usage

Tools can now access the shared state through context variables:

```typescript
class MyTool extends BaseTool {
  async execute(input: MyInput, contextVariables: MyContextVariables) {
    const { sharedState } = contextVariables;

    if (sharedState?.smc_simulation_config) {
      // Use the shared configuration
      const config = sharedState.smc_simulation_config;
      // ...
    }
  }
}
```

For structured output generation using Vercel AI SDK:

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: myZodSchema,
  system: 'System prompt',
  prompt: 'User prompt',
});

// result.object is already validated against the schema
const validated = result.object;
```

## Frontend Integration

The frontend can now pass state in requests:

```typescript
const response = await fetch(`/api/qa/chat_streamed/${threadId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Generate simulation config',
    shared_state: {
      smc_simulation_config: {
        // ... configuration object
      }
    }
  })
});
```

## Testing

The `GenerateSimulationsConfigTool` tests have been updated to mock Vercel AI SDK:

```typescript
// Mock Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => ({ modelId: model, provider: 'openai' })),
}));

// In test
const { generateObject } = await import('ai');
vi.mocked(generateObject).mockResolvedValue({
  object: mockGeneratedConfig,
  usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
  // ... other properties
});
```

Tests cover:
- Missing shared state (should throw error)
- Null configuration in shared state (should throw error)
- Valid shared state with configuration (should succeed)

## Related Files

- `backend-ts/src/types/index.ts` - Type definitions
- `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts` - API endpoint
- `backend-ts/src/lib/tools/obione/generate-simulations-config.ts` - Tool using Vercel AI SDK
- `backend-ts/src/lib/tools/obione/__tests__/generate-simulations-config-tools.test.ts` - Updated tests

## Python Backend References

- `backend/src/neuroagent/new_types.py` - Type definitions
- `backend/src/neuroagent/app/routers/qa.py` - API endpoint
- `backend/src/neuroagent/app/dependencies.py` - Context variables
- `backend/src/neuroagent/tools/obione_generatesimulationsconfig.py` - Tool implementation (uses OpenAI client directly)
