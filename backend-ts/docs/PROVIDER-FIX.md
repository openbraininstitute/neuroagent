# Provider Initialization Fix

## Issue
The application was throwing "provider is not a function" error when trying to stream chat responses in production.

## Root Cause
The code was using `openai` from `@ai-sdk/openai` instead of `createOpenAI`. The correct pattern for Vercel AI SDK is:

**Incorrect:**
```typescript
import { openai } from '@ai-sdk/openai';

// This doesn't work for custom configuration
this.openaiClient = openai({ apiKey, baseURL });
```

**Correct:**
```typescript
import { createOpenAI } from '@ai-sdk/openai';

// createOpenAI returns a provider function
this.openaiClient = createOpenAI({ apiKey, baseURL });
```

## Solution

### 1. Updated Imports
Changed from `openai` to `createOpenAI`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
```

### 2. Updated Type Definitions
```typescript
private openaiClient: ReturnType<typeof createOpenAI> | null = null;
```

### 3. Updated Constructor
```typescript
if (openaiApiKey) {
  this.openaiClient = createOpenAI({
    apiKey: openaiApiKey,
    baseURL: openaiBaseUrl,
  });
}
```

### 4. Provider Usage Pattern
The `getProviderAndModel` method calls the provider function with the model name:

```typescript
private getProviderAndModel(modelIdentifier: string): any {
  if (modelIdentifier.startsWith('openai/')) {
    if (!this.openaiClient) {
      throw new Error('OpenAI provider not configured');
    }
    const modelName = modelIdentifier.replace('openai/', '');
    return this.openaiClient(modelName);  // Call provider function
  }
  // ... similar for OpenRouter
}
```

### 5. Updated Tests
All test files updated to mock `createOpenAI` instead of `openai`:

```typescript
const mockOpenAIProvider = vi.fn(() => ({ type: 'openai-model' }));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockOpenAIProvider),
}));
```

## Test Results
All 45 agent tests passing:
- ✓ routine.test.ts (18 tests)
- ✓ error-handling.test.ts (7 tests)
- ✓ provider-selection.test.ts (20 tests)

## Vercel AI SDK Pattern
The correct pattern from Vercel AI SDK documentation:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// createOpenAI returns a provider function
const provider = createOpenAI({ 
  apiKey: 'sk-...', 
  baseURL: 'https://api.openai.com/v1' 
});

// Call provider function with model name to get model instance
const model = provider('gpt-4');

// Use model instance in streamText
const result = streamText({
  model,
  prompt: 'Hello',
});
```

## Key Difference
- `openai()` - Used when relying on environment variables (OPENAI_API_KEY)
- `createOpenAI()` - Used when providing custom configuration (API key, base URL)

## Related Files
- `backend-ts/src/lib/agents/routine.ts` - Provider initialization and usage
- `backend-ts/tests/agents/routine.test.ts` - Basic routine tests
- `backend-ts/tests/agents/provider-selection.test.ts` - Provider selection tests
- `backend-ts/tests/agents/error-handling.test.ts` - Error handling tests
