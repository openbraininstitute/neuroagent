# Test Mocking Strategy

## Problem

Tests were making real API calls to OpenAI's API (`https://api.openai.com/v1/chat/completions`), which:
- Costs money
- Makes tests slow and unreliable
- Violates test isolation principles
- Can fail due to network issues or rate limits

## Root Cause

The Vercel AI SDK uses `@ai-sdk/openai` and `@openrouter/ai-sdk-provider` packages to create provider instances. When tests called route handlers that used these providers (like `question_suggestions` and `generate_title`), the real providers were being instantiated and making actual API calls.

## Solution

### Global Mocks in Setup File

Added global mocks in `tests/setup.ts` to prevent ANY test from making real API calls:

```typescript
// CRITICAL: Mock OpenAI SDK globally to prevent ANY real API calls
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mocked-openai-model')),
}));

// Mock OpenRouter SDK globally
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mocked-openrouter-model')),
}));
```

### Test-Specific Mocks

Individual tests also mock the `ai` module functions (`streamText`, `generateObject`) to control their behavior:

```typescript
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((config) => config),
}));
```

## Affected Routes

Routes that use LLM providers and are now properly mocked:

1. **`/api/qa/question_suggestions`** - Uses `generateObject` with OpenAI
2. **`/api/threads/[thread_id]/generate_title`** - Uses `generateObject` with OpenAI
3. **`/api/qa/chat`** - Uses `streamText` with OpenAI or OpenRouter

## Verification

To verify no real API calls are being made:

1. Run tests with proxy interception:
   ```bash
   NODE_USE_ENV_PROXY=1 HTTP_PROXY=http://localhost:8080 \
   HTTPS_PROXY=http://localhost:8080 \
   NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem \
   npm test
   ```

2. Check mitmweb at `http://localhost:8081` - you should only see:
   - Requests to `httpbin.org` (from proxy verification tests)
   - NO requests to `api.openai.com`
   - NO requests to `openrouter.ai`

## Best Practices

1. **Always mock external APIs** - Never make real API calls in tests
2. **Use global mocks for providers** - Mock at the provider level in setup.ts
3. **Use test-specific mocks for behavior** - Mock SDK functions in individual tests
4. **Verify with proxy** - Use mitmproxy to confirm no external calls
5. **Document mocking strategy** - Keep this document updated

## Testing LLM Integration

To test LLM integration without making real API calls:

1. Mock the provider creation functions
2. Mock the SDK functions (`streamText`, `generateObject`)
3. Return controlled mock responses
4. Assert on the mock function calls and parameters

Example:
```typescript
vi.mocked(generateObject).mockResolvedValue({
  object: { suggestions: [{ question: 'Test question' }] },
});

// Call route that uses generateObject
const response = await POST(request);

// Verify mock was called correctly
expect(generateObject).toHaveBeenCalledWith(
  expect.objectContaining({
    model: expect.anything(),
    schema: expect.anything(),
  })
);
```

## Related Files

- `tests/setup.ts` - Global mocks
- `tests/api/question-suggestions.test.ts` - Example of proper mocking
- `tests/integration/llm-providers.test.ts` - Provider integration tests
- `tests/e2e/conversation-flow.test.ts` - E2E tests with mocked LLM calls
