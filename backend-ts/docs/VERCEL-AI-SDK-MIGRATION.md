# Vercel AI SDK Migration for GenerateSimulationsConfigTool

## Overview

Migrated the `GenerateSimulationsConfigTool` from using the OpenAI client directly to using Vercel AI SDK's `generateObject` function. This aligns with the project's architecture where Vercel AI SDK is the primary integration layer for LLM interactions.

## Changes Made

### 1. Tool Implementation (`src/lib/tools/obione/generate-simulations-config.ts`)

**Before:**
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

// Required openaiClient in context variables
const response = await openaiClient.chat.completions.create({
  model,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'CircuitSimulationScanConfig',
      schema: jsonSchema,
      strict: true,
    },
  },
});

const content = response.choices[0]?.message?.content;
const generatedConfig = JSON.parse(content);
const validatedConfig = CircuitSimulationScanConfigModifiedSchema.parse(generatedConfig);
```

**After:**
```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

// No openaiClient needed - uses Vercel AI SDK provider
const result = await generateObject({
  model: openai(model),
  schema: CircuitSimulationScanConfigModifiedSchema,
  system: systemPrompt,
  prompt: userMessage,
});

// result.object is already validated by the SDK
const validatedConfig = result.object;
```

**Benefits:**
- ✅ Native Zod schema validation (no manual JSON parsing or zod-to-json-schema conversion)
- ✅ Automatic type inference from Zod schemas
- ✅ Consistent with Vercel AI SDK patterns used in agent routine
- ✅ Simpler error handling and response parsing
- ✅ Better integration with the streaming architecture
- ✅ Reduced dependencies (removed `zod-to-json-schema`)

### 2. Context Variables Interface

**Removed:**
```typescript
export interface GenerateSimulationsConfigContextVariables extends BaseContextVariables {
  openaiClient: any; // Type from OpenAI SDK
  // ...
}
```

**Updated:**
```typescript
export interface GenerateSimulationsConfigContextVariables extends BaseContextVariables {
  // openaiClient removed - Vercel AI SDK handles model instantiation
  httpClient: KyInstance;
  obiOneUrl: string;
  vlabId?: string;
  projectId?: string;
  sharedState?: SharedState | null;
  entityFrontendUrl: string;
  model?: string;
}
```

### 3. Tool Initialization (`src/lib/tools/index.ts`)

**Removed:**
```typescript
return new GenerateSimulationsConfigTool({
  // ...
  openaiClient: config.openaiClient, // ❌ No longer needed
  // ...
});
```

**Updated:**
```typescript
return new GenerateSimulationsConfigTool({
  httpClient: config.httpClient,
  obiOneUrl: config.obiOneUrl,
  vlabId: config.vlabId,
  projectId: config.projectId,
  sharedState: config.sharedState,
  entityFrontendUrl: config.entityFrontendUrl || '',
  model: config.model,
  tokenConsumption: config.tokenConsumption,
});
```

### 4. API Route (`src/app/api/qa/chat_streamed/[thread_id]/route.ts`)

**Removed:**
```typescript
// Create OpenAI client for tools that need it
const { OpenAI } = await import('openai');
const openaiClient = new OpenAI({
  apiKey: settings.llm.openaiToken,
  baseURL: settings.llm.openaiBaseUrl,
});

contextVariables: {
  openaiClient, // ❌ No longer needed
  // ...
}
```

**Updated:**
```typescript
// No OpenAI client creation needed
contextVariables: {
  httpClient,
  exaApiKey: settings.tools.exaApiKey,
  // ... other variables
  // Vercel AI SDK handles model instantiation internally
}
```

### 5. Test Updates (`src/lib/tools/obione/__tests__/generate-simulations-config-tools.test.ts`)

**Before:**
```typescript
let mockOpenAIClient: any;

beforeEach(() => {
  mockOpenAIClient = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };
});

mockOpenAIClient.chat.completions.create.mockResolvedValue({
  choices: [{ message: { content: JSON.stringify(config) } }],
  usage: { /* ... */ }
});
```

**After:**
```typescript
// Mock Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => ({ modelId: model, provider: 'openai' })),
}));

const { generateObject } = await import('ai');
vi.mocked(generateObject).mockResolvedValue({
  object: mockGeneratedConfig,
  usage: {
    promptTokens: 500,
    completionTokens: 300,
    totalTokens: 800,
  },
  finishReason: 'stop',
  warnings: undefined,
  request: {} as any,
  response: {} as any,
  toJsonResponse: vi.fn(),
});
```

## Token Consumption Tracking

Updated to use Vercel AI SDK's usage format:

**Before:**
```typescript
if (response.usage) {
  this.contextVariables.tokenConsumption = {
    model,
    input_tokens: response.usage.prompt_tokens || 0,
    output_tokens: response.usage.completion_tokens || 0,
    total_tokens: response.usage.total_tokens || 0,
  };
}
```

**After:**
```typescript
if (result.usage) {
  this.contextVariables.tokenConsumption = {
    model,
    input_tokens: result.usage.promptTokens || 0,
    output_tokens: result.usage.completionTokens || 0,
    total_tokens: result.usage.totalTokens || 0,
  };
}
```

## Architecture Alignment

This change aligns with the project's architecture principles:

1. **Vercel AI SDK First**: All LLM interactions use Vercel AI SDK as the primary integration layer
2. **Consistent Patterns**: Same patterns used in agent routine for streaming and tool execution
3. **Type Safety**: Better type inference from Zod schemas
4. **Simplified Code**: Less boilerplate for structured output generation

## Python Backend Comparison

While the Python backend uses OpenAI client directly:

```python
# Python approach
response = await openai_client.chat.completions.create(
    model=model,
    messages=[...],
    response_format={"type": "json_schema", ...}
)
```

The TypeScript backend uses Vercel AI SDK for consistency:

```typescript
// TypeScript approach (Vercel AI SDK)
const result = await generateObject({
  model: openai(model),
  schema: zodSchema,
  system: systemPrompt,
  prompt: userMessage,
});
```

Both approaches achieve the same result, but the TypeScript version benefits from:
- Native Zod integration
- Consistent patterns across the codebase
- Better TypeScript type inference
- Simplified error handling

## Testing

All tests have been updated and pass:
- ✅ Successful execution with valid input
- ✅ Token consumption tracking
- ✅ Error handling for missing shared state
- ✅ Error handling for null configuration
- ✅ Error handling for network failures
- ✅ UUID validation
- ✅ Default model usage

## Related Documentation

- [Shared State Parameter Implementation](./SHARED-STATE-PARAMETER.md)
- [TypeScript Translation Guide](../.kiro/steering/typescript-translation.md)

## Files Modified

- `backend-ts/src/lib/tools/obione/generate-simulations-config.ts` - Tool implementation
- `backend-ts/src/lib/tools/index.ts` - Tool initialization
- `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts` - API route
- `backend-ts/src/lib/tools/obione/__tests__/generate-simulations-config-tools.test.ts` - Tests
- `backend-ts/docs/SHARED-STATE-PARAMETER.md` - Updated documentation
