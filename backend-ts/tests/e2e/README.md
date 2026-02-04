# End-to-End Tests

This directory contains end-to-end (E2E) tests for complete user flows through the TypeScript backend.

## Purpose

E2E tests verify that all components work together correctly in realistic scenarios. Unlike unit tests that test individual components in isolation, E2E tests validate complete user journeys from request to response.

## Test Coverage

### conversation-flow.test.ts

Tests complete conversation flows:

1. **Full Conversation Flow**
   - User message to AI response
   - Multi-turn conversations with message history
   - Message persistence in database
   - Token consumption tracking

2. **Tool Calling Flow**
   - Tool execution during conversation
   - Multiple tool calls in sequence
   - Tool result integration into responses
   - Tool availability and registration

3. **Streaming with Interruptions**
   - Stream interruption handling
   - Partial message recovery
   - Network timeout scenarios
   - Conversation recovery after interruption

4. **Complex Integration Scenarios**
   - Combined tool calling and streaming
   - Max turns enforcement
   - Multi-step agent interactions

### error-scenarios.test.ts

Tests error handling in complete flows:

1. **Tool Execution Errors**
   - Tool failure handling
   - Error message propagation
   - Graceful degradation

2. **LLM Provider Errors**
   - Provider timeout handling
   - Invalid model configuration
   - API rate limits from providers

3. **Rate Limiting Scenarios**
   - Rate limit enforcement
   - Rate limit headers
   - User-specific limits

4. **Database Transaction Scenarios**
   - Database connection failures
   - Transaction rollback
   - Data consistency

5. **Concurrent Request Scenarios**
   - Multiple requests to same thread
   - Race condition handling
   - Message ordering

## Running Tests

```bash
# Run all E2E tests
npm test tests/e2e

# Run specific test file
npm test tests/e2e/conversation-flow.test.ts

# Run with coverage
npm test -- --coverage tests/e2e
```

## Test Structure

Each test follows this pattern:

1. **Setup**: Create test thread and user
2. **Mock**: Configure mocks for external dependencies
3. **Execute**: Make API request
4. **Verify**: Check response and database state
5. **Cleanup**: Remove test data

## Mocking Strategy

E2E tests mock:
- **AI SDK**: `streamText` function to simulate LLM responses
- **Providers**: OpenAI and OpenRouter clients
- **Middleware**: Authentication and rate limiting
- **Tools**: Tool initialization and execution

E2E tests use real:
- **Database**: Prisma client with test database
- **API Routes**: Actual Next.js route handlers
- **Agent Routine**: Real agent orchestration logic

## Key Scenarios Tested

### Requirement 13.2: Integration Testing

These tests validate:
- ✅ Full conversation flow from user message to AI response
- ✅ Tool calling flow with real tool execution
- ✅ Streaming with interruptions and recovery
- ✅ Multi-turn conversations with history
- ✅ Error handling across the stack
- ✅ Concurrent request handling
- ✅ Database transaction integrity

## Adding New Tests

When adding new E2E tests:

1. Create test in appropriate file or new file
2. Follow existing test structure
3. Mock external dependencies (LLM, auth)
4. Use real database operations
5. Clean up test data in afterEach
6. Document what the test validates
7. Reference requirements being tested

## Notes

- Tests use unique UUIDs for threads/users to avoid conflicts
- Database cleanup happens in beforeEach and afterEach
- Mocks are reset between tests
- Tests should be independent and runnable in any order
- Use descriptive test names that explain the scenario
