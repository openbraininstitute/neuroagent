# Error Handling Test Fix

## Issue

After fixing the OpenAI provider initialization in `routine.ts` to properly call `openai({ apiKey, baseURL })` instead of just assigning `openai`, two tests in `routine.test.ts` were failing:

- "should select OpenAI provider for openai/ prefix"
- "should default to OpenAI for no prefix"

## Root Cause

The tests were mocking `openai` as a simple function (`vi.fn()`), but the actual implementation now calls `openai()` which returns a configured provider instance. The mocks needed to return a function that could be used as a provider.

## Solution

Updated the mock setup in `routine.test.ts`:

**Before:**

```typescript
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(),
}));
```

**After:**

```typescript
const mockOpenAIProvider = vi.fn();
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => mockOpenAIProvider),
}));
```

This ensures that when `openai({ apiKey, baseURL })` is called in the constructor, it returns a mock provider function that can be used by the agent.

## Test Results

All 45 agent tests now pass:

- ✓ routine.test.ts (18 tests)
- ✓ error-handling.test.ts (7 tests)
- ✓ provider-selection.test.ts (20 tests)

## Related Files

- `backend-ts/src/lib/agents/routine.ts` - OpenAI provider initialization
- `backend-ts/tests/agents/routine.test.ts` - Updated mocks
- `backend-ts/docs/ERROR-HANDLING-FIX.md` - Original error handling implementation
