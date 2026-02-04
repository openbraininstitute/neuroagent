# API Compatibility Tests - Cost Safety

## Overview

The API compatibility test suite has been designed to **avoid making actual LLM API calls** that would incur costs. This document explains which tests are skipped and why.

## Skipped Tests

### 1. Streaming Chat Endpoint (`/qa/chat_streamed/{thread_id}`)

**Test**: `should have compatible streaming response headers`
**Status**: ⏭️ SKIPPED
**Reason**: This endpoint makes actual LLM API calls via `streamText()` which incurs costs

**What it would test**:

- Content-Type headers (text/event-stream)
- Vercel AI SDK headers (x-vercel-ai-data-stream)
- Streaming response format

**Manual testing**:

```bash
# Create a thread
curl -X POST http://localhost:3000/threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Thread"}'

# Send a chat message (THIS WILL MAKE AN LLM CALL)
curl -X POST http://localhost:3000/qa/chat_streamed/{thread_id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello","model":"gpt-4"}'
```

**Automated testing alternative**:
See `tests/e2e/conversation-flow.test.ts` which uses mocked AI SDK responses.

### 2. Question Suggestions Endpoint (`/qa/question_suggestions`)

**Test**: `should have compatible POST /qa/question_suggestions endpoint`
**Status**: ⏭️ SKIPPED
**Reason**: This endpoint uses `generateObject()` which makes actual LLM API calls

**What it would test**:

- Response schema: `{ suggestions: string[3] }`
- Out-of-chat suggestions (with frontend_url)
- In-chat suggestions (with thread_id)

**Manual testing**:

```bash
# Out-of-chat suggestions (THIS WILL MAKE AN LLM CALL)
curl -X POST http://localhost:3000/qa/question_suggestions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"thread_id":null,"frontend_url":"https://example.com"}'

# In-chat suggestions (THIS WILL MAKE AN LLM CALL)
curl -X POST http://localhost:3000/qa/question_suggestions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"thread_id":"<uuid>","frontend_url":null}'
```

**Automated testing alternative**:
Mock the `generateObject()` function in unit tests.

## Safe Tests

The following tests are **safe to run** and do NOT make LLM API calls:

### ✅ Health Check Endpoints

- `/healthz` - Simple health check
- `/` - Readiness check
- `/settings` - Configuration endpoint

### ✅ Thread Endpoints

- `POST /threads` - Create thread (database only)
- `GET /threads` - List threads (database only)
- `GET /threads/{thread_id}` - Get thread (database only)
- `PATCH /threads/{thread_id}` - Update thread (database only)
- `DELETE /threads/{thread_id}` - Delete thread (database only)
- `GET /threads/{thread_id}/messages` - Get messages (database only)
- `GET /threads/search` - Search threads (database only)

### ✅ Tools Endpoints

- `GET /tools` - List tools (metadata only)
- `GET /tools/{name}` - Get tool metadata (no execution)

### ✅ Storage Endpoints

- `GET /storage/{file}/presigned-url` - Generate URL (no LLM)

### ✅ Error Response Tests

- 401 Unauthorized
- 404 Not Found
- Error format validation

### ✅ Authentication Tests

- Missing token
- Invalid token
- Project access validation

### ✅ Models Endpoint

- `GET /qa/models` - List available models (no LLM call)

## Running Safe Tests Only

The compatibility test suite will automatically skip the expensive tests:

```bash
cd backend-ts
./scripts/run-compatibility-tests.sh
```

Output will show:

```
✓ API Compatibility - Health Checks (3)
✓ API Compatibility - Threads (8)
✓ API Compatibility - QA (1)
  ⏭ should have compatible POST /qa/question_suggestions endpoint
  ⏭ should have compatible POST /qa/question_suggestions with thread_id
✓ API Compatibility - Tools (2)
✓ API Compatibility - Storage (1)
✓ API Compatibility - Error Responses (4)
✓ API Compatibility - Streaming (0)
  ⏭ should have compatible streaming response headers
✓ API Compatibility - Authentication (3)
```

## Cost Estimation

### If Skipped Tests Were Enabled

Running the full compatibility test suite with LLM calls would cost approximately:

- **Question Suggestions**: 2 tests × 2 backends = 4 LLM calls
- **Streaming Chat**: 1 test × 2 backends = 2 LLM calls
- **Total**: ~6 LLM calls per test run

**Estimated cost** (using GPT-4):

- Input tokens: ~500 tokens per call × 6 = 3,000 tokens
- Output tokens: ~100 tokens per call × 6 = 600 tokens
- **Cost**: ~$0.10 - $0.20 per test run

**With CI/CD** (running on every commit):

- 10 commits/day × $0.15 = **$1.50/day**
- **$45/month** just for compatibility tests

### With Skipped Tests (Current)

**Cost**: $0.00 - No LLM calls are made

## Alternative Testing Strategies

### 1. Mocked LLM Responses

Use mocked AI SDK in unit/integration tests:

```typescript
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
}));

// Mock the response
vi.mocked(generateObject).mockResolvedValue({
  object: { suggestions: ['Q1', 'Q2', 'Q3'] },
});
```

See `tests/e2e/conversation-flow.test.ts` for examples.

### 2. Dedicated Test Environment

Set up a test environment with:

- Mocked LLM provider that returns canned responses
- No actual API calls to OpenAI/OpenRouter
- Fast, deterministic responses

### 3. Manual Testing

For critical releases, manually test LLM endpoints:

1. Create a test thread
2. Send a few test messages
3. Verify streaming works
4. Check question suggestions
5. Total cost: ~$0.05 per manual test session

### 4. Staging Environment Tests

Run LLM tests only in staging:

- Scheduled nightly runs (not on every commit)
- Use cheaper models (gpt-3.5-turbo instead of gpt-4)
- Limit to critical paths only

## Best Practices

### ✅ DO

- Run the safe compatibility tests on every commit
- Use mocked LLM responses in automated tests
- Manually test LLM endpoints before major releases
- Monitor LLM API costs in production

### ❌ DON'T

- Enable LLM tests in CI/CD without cost controls
- Make actual LLM calls in unit tests
- Run expensive tests on every commit
- Forget to skip tests that make external API calls

## Monitoring Costs

To monitor actual LLM usage:

1. **OpenAI Dashboard**: https://platform.openai.com/usage
2. **OpenRouter Dashboard**: https://openrouter.ai/activity
3. **Application Logs**: Check token consumption in database

```sql
-- Check token consumption
SELECT
  model,
  task,
  SUM(count) as total_tokens,
  COUNT(*) as num_calls
FROM token_consumption
WHERE creation_date > NOW() - INTERVAL '1 day'
GROUP BY model, task
ORDER BY total_tokens DESC;
```

## Updating This Document

When adding new endpoints that make LLM calls:

1. Add the endpoint to the "Skipped Tests" section
2. Mark the test with `.skip()` in the test file
3. Add a comment explaining why it's skipped
4. Provide manual testing instructions
5. Update cost estimation if needed

## Related Documentation

- [API Compatibility Testing Guide](./API-COMPATIBILITY-TESTING.md)
- [E2E Tests with Mocked LLM](../tests/e2e/README.md)
- [Testing Strategy](../../.kiro/specs/typescript-backend-migration/design.md#testing-strategy)

## Questions?

If you need to test LLM endpoints:

1. **For development**: Use mocked responses (see e2e tests)
2. **For staging**: Enable tests temporarily with cost monitoring
3. **For production**: Manual testing before releases
4. **For CI/CD**: Keep LLM tests skipped to avoid costs
