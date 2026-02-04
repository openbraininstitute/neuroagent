# Integration Tests for External Services

This directory contains integration tests for external service integrations in the TypeScript backend.

## Overview

These tests verify the integration with external services while using mocks to avoid actual API calls and associated costs. **CRITICAL: All tests use mocks - NO real API calls are made.**

## Test Files

### `llm-providers.test.ts`

Tests for LLM provider integration (OpenAI and OpenRouter).

**Coverage:**
- OpenAI provider initialization and configuration
- OpenRouter provider initialization and configuration
- Text streaming with both providers (mocked)
- Structured output generation (mocked)
- Tool calling integration (mocked)
- Error handling for API failures
- Provider selection logic
- Multi-chunk streaming behavior

**Key Safety Features:**
- All `streamText` and `generateObject` calls are mocked
- No actual API keys are used in tests
- No real LLM API calls are made
- All responses are simulated

### `mcp-servers.test.ts`

Tests for MCP (Model Context Protocol) server integration.

**Coverage:**
- MCP client initialization with server configurations
- Server connection and disconnection (mocked)
- Tool discovery from MCP servers (mocked)
- Tool execution on MCP servers (mocked)
- Dynamic tool creation from MCP tool definitions
- Server health checks
- Error handling for server failures
- Multi-server aggregation

**Key Safety Features:**
- All MCP SDK calls are mocked
- No actual MCP server processes are spawned
- No real stdio communication occurs
- All tool executions are simulated

### `storage.test.ts`

Tests for S3/MinIO storage integration.

**Coverage:**
- S3 client initialization for MinIO and AWS S3
- File existence checks (mocked)
- File upload operations (mocked)
- File download operations (mocked)
- Presigned URL generation (mocked)
- User-specific file paths
- Content type handling
- Error handling (not found, access denied, timeouts)
- Path-style vs virtual-hosted-style URLs

**Key Safety Features:**
- All AWS SDK calls are mocked
- No actual S3/MinIO operations are performed
- No real files are uploaded or downloaded
- All presigned URLs are simulated

## Running the Tests

```bash
# Run all integration tests
npm test tests/integration

# Run specific test file
npm test tests/integration/llm-providers.test.ts
npm test tests/integration/mcp-servers.test.ts
npm test tests/integration/storage.test.ts

# Run with coverage
npm test -- --coverage tests/integration
```

## Cost Safety Verification

All tests in this directory are designed to be cost-safe:

1. **No Real API Calls**: All external service calls are mocked using Vitest's `vi.mock()`
2. **No Network Requests**: Tests do not make actual HTTP requests
3. **No Resource Creation**: No real resources (files, servers, etc.) are created
4. **Isolated Execution**: Tests run in complete isolation from external services

## Mock Patterns

### LLM Provider Mocks

```typescript
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(),
}));
```

### MCP Server Mocks

```typescript
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
  })),
}));
```

### Storage Mocks

```typescript
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));
```

## Adding New Integration Tests

When adding new integration tests for external services:

1. **Always use mocks** - Never make real API calls
2. **Document cost safety** - Add comments explaining mock usage
3. **Test error scenarios** - Include tests for failure cases
4. **Verify isolation** - Ensure tests don't depend on external state
5. **Follow patterns** - Use existing test patterns as templates

## Related Documentation

- [E2E Tests](../e2e/README.md) - End-to-end conversation flow tests
- [API Tests](../api/README.md) - API endpoint tests
- [Cost Safety Verification](../../TEST-COST-SAFETY-VERIFICATION.md) - Overall cost safety documentation

## Requirements

These tests fulfill:
- **Task 27.3**: Write integration tests for external services
- **Requirement 13.2**: Testing Infrastructure - Integration testing with external services
