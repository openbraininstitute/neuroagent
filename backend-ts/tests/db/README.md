# Database Integration Tests

This directory contains integration tests for database operations using Prisma ORM with PostgreSQL.

## Test Files

### `client.test.ts`
Tests for the Prisma client singleton pattern and basic functionality:
- Verifies Prisma client is properly exported
- Tests singleton pattern (same instance on multiple imports)
- Verifies all expected models are available

### `migrations.test.ts`
Tests for database schema and migrations:
- Verifies all required tables exist
- Verifies all enums and their values
- Tests foreign key constraints and cascade delete rules
- Verifies GIN index on search_vector
- Tests database triggers for full-text search
- Validates column types for all tables

### `integration.test.ts`
Comprehensive integration tests for database operations:

#### Message Creation and Retrieval (7 tests)
- Creating messages with all required fields
- Retrieving messages by thread ID
- Creating messages with tool calls
- Creating messages with token consumption tracking
- Creating messages with complexity estimation
- Retrieving messages with all relations
- Handling incomplete messages and updates

#### Thread Management (6 tests)
- Creating threads with all fields
- Retrieving threads by user ID
- Updating thread title and updateDate
- Cascade deleting messages when thread is deleted
- Retrieving threads with message counts
- Filtering threads by vlab and project

#### Full-Text Search (5 tests)
- Searching messages using PostgreSQL tsvector
- Ranking search results by relevance
- Searching across multiple threads for a user
- Complex search queries with AND/OR operators
- Handling empty search results gracefully

#### Transaction and Cascade Operations (3 tests)
- Transaction rollback on error (atomicity)
- Cascade delete of tool calls when message is deleted
- Cascade delete of all related data when thread is deleted

#### Concurrent Operations (2 tests)
- Concurrent message creation in same thread
- Concurrent thread updates (last write wins)

#### Edge Cases and Error Handling (6 tests)
- Messages with large content (10,000 characters)
- Threads with no messages
- Messages with null optional fields
- Threads with null vlab and project IDs
- Rejecting messages with invalid entity types
- Rejecting messages with non-existent thread IDs

## Running Tests

### Run all database tests
```bash
npm test -- tests/db/
```

### Run specific test file
```bash
npm test -- tests/db/integration.test.ts
npm test -- tests/db/client.test.ts
npm test -- tests/db/migrations.test.ts
```

### Run with coverage
```bash
npm test -- tests/db/ --coverage
```

## Test Database Setup

Tests use the database connection specified in the `DATABASE_URL` environment variable. The test setup file (`tests/setup.ts`) configures a test database URL.

### Prerequisites
- PostgreSQL database running (via Docker or local installation)
- Database migrations applied: `npx prisma migrate dev`
- Test database should be separate from development database

### Docker Setup
```bash
# Start PostgreSQL via docker-compose
docker compose up -d postgres

# Run migrations
cd backend-ts
npx prisma migrate dev
```

## Test Data Cleanup

All integration tests include proper cleanup in `afterEach` hooks to ensure:
- Test messages are deleted after each test
- Test threads are deleted after each test
- No test data pollution between tests
- Cascade deletes are properly tested

## Key Testing Patterns

### 1. UUID Generation
```typescript
import { randomUUID } from 'crypto';
const threadId = randomUUID();
```

### 2. Test Data Tracking
```typescript
const testThreadIds: string[] = [];
testThreadIds.push(threadId);

afterEach(async () => {
  await prisma.thread.deleteMany({
    where: { id: { in: testThreadIds } },
  });
  testThreadIds.length = 0;
});
```

### 3. Full-Text Search Testing
```typescript
// Update search vectors (in production, done by trigger)
await prisma.$executeRaw`
  UPDATE messages
  SET search_vector = to_tsvector('english', content)
  WHERE thread_id = ${threadId}::uuid
`;

// Search with ranking
const results = await prisma.$queryRaw`
  SELECT message_id, ts_rank(search_vector, query) as rank
  FROM messages, to_tsquery('english', 'search term') query
  WHERE search_vector @@ query
  ORDER BY rank DESC
`;
```

### 4. Transaction Testing
```typescript
try {
  await prisma.$transaction(async (tx) => {
    // Operations that should succeed or fail together
  });
} catch (error) {
  // Expected to fail
}
```

## Coverage

The integration tests provide comprehensive coverage of:
- ✅ CRUD operations for all models
- ✅ Relationship handling (one-to-many, one-to-one)
- ✅ Cascade delete operations
- ✅ Full-text search with PostgreSQL tsvector
- ✅ Transaction atomicity
- ✅ Concurrent operations
- ✅ Error handling and validation
- ✅ Edge cases (null values, large content, empty results)

## Requirements Validated

These tests validate **Requirement 13.5** from the TypeScript Backend Migration spec:
- Message creation and retrieval
- Thread management
- Full-text search functionality

## Related Documentation

- [Prisma Schema](../../prisma/schema.prisma)
- [Database Client](../../src/lib/db/client.ts)
- [Migration Guide](../../docs/MIGRATIONS.md)
