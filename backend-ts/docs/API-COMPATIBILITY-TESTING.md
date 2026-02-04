# API Compatibility Testing

This document describes the API compatibility test suite that validates the TypeScript backend maintains full compatibility with the Python backend.

## Overview

The compatibility test suite ensures that:

1. **Response Schemas Match**: Both backends return data in the same format
2. **Equivalent Functionality**: All endpoints behave identically
3. **Error Handling Consistency**: Error responses match in format and status codes
4. **Streaming Compatibility**: Streaming responses use the same format
5. **Authentication Behavior**: Auth and authorization work identically

**⚠️ IMPORTANT - Cost Safety**: Some tests that would make actual LLM API calls are skipped to avoid incurring costs. See [Cost Safety Documentation](./COMPATIBILITY-TESTS-COST-SAFETY.md) for details.

## Requirements Validated

- **Requirement 14.1**: Maintain all existing API endpoint paths
- **Requirement 14.2**: Maintain request/response schemas
- **Requirement 14.4**: Maintain error response format

## Test Structure

### Test Categories

1. **Health Check Endpoints**
   - `/healthz` - Health check endpoint
   - `/` - Readiness check endpoint
   - `/settings` - Settings endpoint

2. **Thread Endpoints**
   - `POST /threads` - Create thread
   - `GET /threads` - List threads with pagination
   - `GET /threads/{thread_id}` - Get specific thread
   - `PATCH /threads/{thread_id}` - Update thread
   - `DELETE /threads/{thread_id}` - Delete thread
   - `GET /threads/{thread_id}/messages` - Get thread messages
   - `GET /threads/search` - Search threads
   - `PATCH /threads/{thread_id}/generate_title` - Generate title

3. **QA Endpoints**
   - `GET /qa/models` - Get available models
   - `POST /qa/question_suggestions` - Generate suggestions
   - `POST /qa/chat_streamed/{thread_id}` - Stream chat responses

4. **Tools Endpoints**
   - `GET /tools` - List available tools
   - `GET /tools/{name}` - Get tool metadata
   - `PATCH /tools/{thread_id}/execute/{tool_call_id}` - Execute tool call

5. **Storage Endpoints**
   - `GET /storage/{file_identifier}/presigned-url` - Generate presigned URL

6. **Error Response Compatibility**
   - 401 Unauthorized responses
   - 404 Not Found responses
   - 403 Forbidden responses
   - Error message format consistency

7. **Rate Limiting Compatibility**
   - Rate limit headers
   - 429 Too Many Requests responses

8. **Streaming Response Compatibility**
   - Content-Type headers
   - Vercel AI SDK headers
   - Stream format

9. **Authentication & Authorization**
   - Token validation
   - Project access control

## Running the Tests

### Prerequisites

1. **Both backends must be running**:

   ```bash
   # Terminal 1: Python backend
   cd backend
   neuroagent-api
   # Runs on http://localhost:8078

   # Terminal 2: TypeScript backend
   cd backend-ts
   npm run dev
   # Runs on http://localhost:3000
   ```

2. **Set environment variables** (optional):
   ```bash
   export PYTHON_BACKEND_URL="http://localhost:8078"
   export TS_BACKEND_URL="http://localhost:3000"
   export TEST_AUTH_TOKEN="your-valid-jwt-token"
   ```

### Run Tests

**Using the helper script** (recommended):

```bash
cd backend-ts
./scripts/run-compatibility-tests.sh
```

**Using npm directly**:

```bash
cd backend-ts
npm run test:compatibility
```

**Using vitest directly**:

```bash
cd backend-ts
npx vitest tests/api/compatibility.test.ts
```

### Docker Environment

If running backends in Docker:

```bash
# Start both backends
docker compose up backend backend-ts

# In another terminal, run tests
cd backend-ts
PYTHON_BACKEND_URL="http://localhost:8078" \
TS_BACKEND_URL="http://localhost:3000" \
./scripts/run-compatibility-tests.sh
```

## Test Methodology

### Schema Comparison

The test suite uses Zod schemas to validate that both backends return data matching the expected structure:

```typescript
const ThreadSchema = z.object({
  thread_id: z.string().uuid(),
  vlab_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  title: z.string(),
  creation_date: z.string().datetime(),
  update_date: z.string().datetime(),
  user_id: z.string().uuid(),
});

// Both responses must validate
expect(() => ThreadSchema.parse(pythonResponse)).not.toThrow();
expect(() => ThreadSchema.parse(tsResponse)).not.toThrow();
```

### Response Comparison

For each endpoint, the test suite:

1. Makes identical requests to both backends
2. Compares HTTP status codes
3. Validates response schemas
4. Compares response structure (keys)
5. Checks header compatibility

### Error Handling

Tests verify that both backends:

- Return the same status codes for errors
- Include error information in responses
- Handle authentication failures identically
- Validate authorization consistently

## Test Configuration

### Environment Variables

| Variable             | Default                 | Description                                |
| -------------------- | ----------------------- | ------------------------------------------ |
| `PYTHON_BACKEND_URL` | `http://localhost:8078` | Python backend URL                         |
| `TS_BACKEND_URL`     | `http://localhost:3000` | TypeScript backend URL                     |
| `TEST_AUTH_TOKEN`    | (empty)                 | Valid JWT token for authenticated requests |

### Test Data

The test suite creates minimal test data:

- Test threads (cleaned up after tests)
- Test messages (as needed)
- No persistent data is created

## Interpreting Results

### Success Criteria

All tests should pass, indicating:

- ✅ Status codes match between backends
- ✅ Response schemas are identical
- ✅ Error handling is consistent
- ✅ Headers are compatible

### Common Failures

1. **Backend Not Running**

   ```
   Error: fetch failed
   ```

   **Solution**: Ensure both backends are running

2. **Authentication Failures**

   ```
   Expected: 200, Received: 401
   ```

   **Solution**: Set valid `TEST_AUTH_TOKEN`

3. **Schema Mismatch**

   ```
   ZodError: Invalid type
   ```

   **Solution**: Check response format differences

4. **Status Code Mismatch**
   ```
   Expected: 200, Received: 500
   ```
   **Solution**: Check backend logs for errors

## Continuous Integration

### CI Pipeline Integration

Add to your CI pipeline:

```yaml
# .github/workflows/compatibility-tests.yml
name: API Compatibility Tests

on: [push, pull_request]

jobs:
  compatibility:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Python dependencies
        run: |
          cd backend
          pip install -e .

      - name: Install TypeScript dependencies
        run: |
          cd backend-ts
          npm ci

      - name: Start Python backend
        run: |
          cd backend
          neuroagent-api &
          sleep 10

      - name: Start TypeScript backend
        run: |
          cd backend-ts
          npm run dev &
          sleep 10

      - name: Run compatibility tests
        run: |
          cd backend-ts
          ./scripts/run-compatibility-tests.sh
```

## Maintenance

### Adding New Endpoints

When adding new endpoints to the TypeScript backend:

1. **Add schema definition**:

   ```typescript
   const NewEndpointSchema = z.object({
     // Define expected response structure
   });
   ```

2. **Add test case**:

   ```typescript
   it('should have compatible GET /new-endpoint', async () => {
     const { python, typescript } = await compareEndpoints('/new-endpoint', {
       headers: authHeaders(),
     });

     expect(typescript.status).toBe(python.status);

     if (python.status === 200) {
       compareSchemas(python.body, typescript.body, NewEndpointSchema);
     }
   });
   ```

3. **Run tests** to verify compatibility

### Updating Schemas

When the API schema changes:

1. Update the Zod schema definition
2. Ensure both backends implement the change
3. Run compatibility tests
4. Update documentation

## Troubleshooting

### Tests Fail with "Connection Refused"

**Problem**: Cannot connect to one or both backends

**Solutions**:

- Verify backends are running: `curl http://localhost:8078/healthz`
- Check port conflicts: `lsof -i :8078` and `lsof -i :3000`
- Review backend logs for startup errors

### Tests Fail with "Schema Validation Error"

**Problem**: Response doesn't match expected schema

**Solutions**:

- Compare actual responses from both backends
- Check if schema definition is correct
- Verify backend implementation matches spec

### Tests Fail with "Status Code Mismatch"

**Problem**: Backends return different status codes

**Solutions**:

- Check backend logs for errors
- Verify both backends handle the request correctly
- Ensure database state is consistent

### Rate Limit Tests Fail

**Problem**: Rate limiting behaves differently

**Solutions**:

- Ensure Redis is running for both backends
- Check rate limit configuration matches
- Verify rate limit headers are set correctly

## Best Practices

1. **Run tests frequently** during development
2. **Keep schemas up to date** with API changes
3. **Test with realistic data** when possible
4. **Monitor test execution time** and optimize slow tests
5. **Document any known differences** between backends
6. **Use test fixtures** for consistent test data
7. **Clean up test data** after tests complete

## Related Documentation

- [TypeScript Backend Migration Design](../.kiro/specs/typescript-backend-migration/design.md)
- [API Requirements](../.kiro/specs/typescript-backend-migration/requirements.md)
- [Testing Strategy](../.kiro/specs/typescript-backend-migration/design.md#testing-strategy)

## Future Enhancements

1. **Performance comparison**: Measure response times
2. **Load testing**: Compare behavior under load
3. **Streaming validation**: Validate stream content, not just headers
4. **Tool execution**: Test actual tool execution compatibility
5. **Database state**: Verify database writes are identical
6. **Automated reporting**: Generate HTML compatibility reports
7. **Visual diff**: Show side-by-side response comparisons
