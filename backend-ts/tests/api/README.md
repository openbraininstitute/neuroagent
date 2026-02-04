# API Compatibility Tests

This directory contains the API compatibility test suite that validates the TypeScript backend maintains full compatibility with the Python backend.

**⚠️ IMPORTANT**: Tests that would make actual LLM API calls are skipped to avoid costs. See [Cost Safety Documentation](../../docs/COMPATIBILITY-TESTS-COST-SAFETY.md) for details.

## Quick Start

### 1. Start Both Backends

**Terminal 1 - Python Backend:**
```bash
cd backend
neuroagent-api
# Runs on http://localhost:8078
```

**Terminal 2 - TypeScript Backend:**
```bash
cd backend-ts
npm run dev
# Runs on http://localhost:3000
```

### 2. Run Compatibility Tests

**Option A: Using the helper script (recommended):**
```bash
cd backend-ts
./scripts/run-compatibility-tests.sh
```

**Option B: Using npm:**
```bash
cd backend-ts
npm run test:compatibility
```

**Option C: Using vitest directly:**
```bash
cd backend-ts
npx vitest tests/api/compatibility.test.ts
```

## What Gets Tested

### Endpoints Covered

- ✅ Health checks (`/healthz`, `/`, `/settings`)
- ✅ Thread CRUD operations
- ✅ Message retrieval and pagination
- ✅ Thread search functionality
- ✅ QA endpoints (models, suggestions, chat streaming)
- ✅ Tools listing and metadata
- ✅ Storage presigned URLs
- ✅ Error responses (401, 404, 403)
- ✅ Rate limiting headers
- ✅ Streaming response headers
- ✅ Authentication and authorization

### Validation Performed

For each endpoint, the tests verify:

1. **Status Code Match**: Both backends return the same HTTP status
2. **Schema Compatibility**: Response data matches expected structure
3. **Field Presence**: All required fields are present
4. **Data Types**: Field types match (string, number, boolean, etc.)
5. **Error Format**: Error responses have consistent structure
6. **Headers**: Required headers are present and compatible

## Test Structure

```
tests/api/
├── README.md                    # This file
└── compatibility.test.ts        # Main compatibility test suite
```

### Test Organization

The test suite is organized into logical groups:

```typescript
describe('API Compatibility - Health Checks', () => { ... });
describe('API Compatibility - Threads', () => { ... });
describe('API Compatibility - QA', () => { ... });
describe('API Compatibility - Tools', () => { ... });
describe('API Compatibility - Storage', () => { ... });
describe('API Compatibility - Error Responses', () => { ... });
describe('API Compatibility - Rate Limiting', () => { ... });
describe('API Compatibility - Streaming', () => { ... });
describe('API Compatibility - Authentication', () => { ... });
```

## Configuration

### Environment Variables

Set these before running tests:

```bash
# Backend URLs (optional, defaults shown)
export PYTHON_BACKEND_URL="http://localhost:8078"
export TS_BACKEND_URL="http://localhost:3000"

# Authentication token (required for authenticated endpoints)
export TEST_AUTH_TOKEN="your-valid-jwt-token"
```

### Getting a Test Token

To test authenticated endpoints, you need a valid JWT token:

1. **From Keycloak**: Log in to your Keycloak instance and copy the access token
2. **From Browser**: Open browser dev tools, find the token in localStorage or cookies
3. **From API**: Use the Keycloak token endpoint to get a token programmatically

## Understanding Test Results

### Successful Test Output

```
✓ tests/api/compatibility.test.ts (45)
  ✓ API Compatibility - Health Checks (3)
    ✓ should have compatible /healthz endpoint
    ✓ should have compatible / (readyz) endpoint
    ✓ should have compatible /settings endpoint
  ✓ API Compatibility - Threads (8)
    ✓ should have compatible POST /threads endpoint
    ✓ should have compatible GET /threads endpoint
    ...
```

### Failed Test Example

```
✗ should have compatible GET /threads endpoint
  Expected: 200
  Received: 500

  Python Response: { status: 200, body: { ... } }
  TypeScript Response: { status: 500, body: { error: "..." } }
```

**What to do:**
1. Check TypeScript backend logs for errors
2. Verify database is accessible
3. Ensure environment variables are set correctly
4. Compare implementation with Python backend

## Common Issues

### Issue: "Connection Refused"

**Symptom:**
```
Error: fetch failed
  cause: Error: connect ECONNREFUSED 127.0.0.1:8078
```

**Solution:**
- Verify Python backend is running: `curl http://localhost:8078/healthz`
- Verify TypeScript backend is running: `curl http://localhost:3000/healthz`
- Check for port conflicts

### Issue: "401 Unauthorized"

**Symptom:**
```
Expected: 200
Received: 401
```

**Solution:**
- Set `TEST_AUTH_TOKEN` environment variable
- Verify token is valid and not expired
- Check token has required permissions

### Issue: "Schema Validation Failed"

**Symptom:**
```
ZodError: Invalid type
  Expected: string
  Received: number
```

**Solution:**
- Compare actual responses from both backends
- Check if TypeScript implementation matches Python
- Update schema definition if API changed

### Issue: "Rate Limit Exceeded"

**Symptom:**
```
Expected: 200
Received: 429
```

**Solution:**
- Wait for rate limit to reset
- Clear Redis cache: `redis-cli FLUSHALL`
- Adjust rate limit settings for testing

## Writing New Tests

When adding a new endpoint to the TypeScript backend, add a corresponding compatibility test:

### 1. Define the Response Schema

```typescript
const NewEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  created_at: z.string().datetime(),
});
```

### 2. Add the Test Case

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

### 3. Run the Test

```bash
npm run test:compatibility
```

## Test Utilities

The test suite provides helper functions:

### `compareEndpoints(path, options)`

Makes requests to both backends and returns responses:

```typescript
const { python, typescript } = await compareEndpoints('/threads', {
  method: 'GET',
  headers: authHeaders(),
});
```

### `compareSchemas(pythonData, tsData, schema)`

Validates both responses against a Zod schema:

```typescript
compareSchemas(python.body, typescript.body, ThreadSchema);
```

### `authHeaders()`

Returns authentication headers:

```typescript
const headers = authHeaders();
// { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' }
```

## Best Practices

1. **Run tests frequently** during development
2. **Test both success and error cases**
3. **Clean up test data** (threads, messages) after tests
4. **Use realistic test data** when possible
5. **Document any known differences** between backends
6. **Keep schemas up to date** with API changes

## CI/CD Integration

The compatibility tests can be integrated into your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run compatibility tests
  run: |
    # Start backends
    docker compose up -d backend backend-ts

    # Wait for backends to be ready
    sleep 10

    # Run tests
    cd backend-ts
    npm run test:compatibility
```

## Related Documentation

- [API Compatibility Testing Guide](../../docs/API-COMPATIBILITY-TESTING.md) - Detailed documentation
- [TypeScript Backend Migration Design](../../.kiro/specs/typescript-backend-migration/design.md)
- [API Requirements](../../.kiro/specs/typescript-backend-migration/requirements.md)

## Support

If you encounter issues with the compatibility tests:

1. Check the [Troubleshooting section](../../docs/API-COMPATIBILITY-TESTING.md#troubleshooting) in the main documentation
2. Review backend logs for errors
3. Verify your environment configuration
4. Compare actual API responses manually using curl or Postman

## Contributing

When contributing to the compatibility test suite:

1. Follow the existing test structure
2. Add tests for new endpoints
3. Update schemas when API changes
4. Document any special test requirements
5. Ensure tests pass before submitting PR
