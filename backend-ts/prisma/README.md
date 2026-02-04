# Prisma Database Schema

This directory contains the Prisma schema and migrations for the Neuroagent TypeScript backend.

## Schema Overview

The database schema mirrors the Python SQLAlchemy models and includes the following tables:

### Tables

- **threads**: User conversation threads
- **messages**: Individual messages within threads
- **tool_calls**: Tool invocations by the AI
- **tool_selection**: Tools selected for queries
- **complexity_estimation**: Model selection metadata
- **token_consumption**: LLM token usage tracking

### Enums

- **Entity**: Message entity types (USER, AI_TOOL, TOOL, AI_MESSAGE)
- **Task**: Token consumption task types (CHAT_COMPLETION, TOOL_SELECTION, CALL_WITHIN_TOOL)
- **TokenType**: Token types (INPUT_NONCACHED, INPUT_CACHED, COMPLETION)
- **ReasoningLevels**: Reasoning levels (NONE, MINIMAL, LOW, MEDIUM, HIGH)

## Key Features

- **UUID Generation**: Uses PostgreSQL's `gen_random_uuid()` for primary keys
- **Cascading Deletes**: Deleting a thread or message cascades to related records
- **Full-Text Search**: Messages table includes TSVECTOR for full-text search with GIN index
- **Timestamps**: Automatic creation and update timestamps with timezone support

## Usage

### Generate Prisma Client

After modifying the schema, regenerate the Prisma client:

```bash
npm run db:generate
```

### Create Migration

Create a new migration after schema changes:

```bash
npm run db:migrate
```

### Push Schema (Development)

Push schema changes directly to the database without creating a migration:

```bash
npm run db:push
```

### Deploy Migrations (Production)

Deploy pending migrations to production:

```bash
npm run db:migrate:deploy
```

### Prisma Studio

Open Prisma Studio to browse and edit data:

```bash
npm run db:studio
```

## Database Connection

The database connection is configured via the `DATABASE_URL` environment variable:

```
DATABASE_URL="postgresql://user:password@localhost:5432/neuroagent?schema=public"
```

### Connection Pooling

Connection pooling can be configured via query parameters:

```
DATABASE_URL="postgresql://user:password@localhost:5432/neuroagent?connection_limit=10&pool_timeout=20"
```

## Client Usage

Import the Prisma client in your code:

```typescript
import { prisma } from '@/lib/db/client';

// Query threads
const threads = await prisma.thread.findMany({
  where: { userId: 'user-id' },
  include: { messages: true },
});

// Create a message
const message = await prisma.message.create({
  data: {
    threadId: 'thread-id',
    entity: 'USER',
    content: JSON.stringify({ role: 'user', content: 'Hello' }),
    isComplete: true,
  },
});
```

## Full-Text Search

The messages table supports full-text search using PostgreSQL's TSVECTOR:

```typescript
// Raw SQL query for full-text search
const results = await prisma.$queryRaw`
  SELECT * FROM messages
  WHERE search_vector @@ to_tsquery('english', ${searchQuery})
  ORDER BY ts_rank(search_vector, to_tsquery('english', ${searchQuery})) DESC
`;
```

## Migration from Python Backend

This schema is designed to be compatible with the existing Python backend database. The table and column names match exactly, allowing both backends to share the same database during migration.

Key differences from SQLAlchemy models:

- Prisma uses camelCase for field names in TypeScript, but maps to snake_case in the database
- Enum values are mapped to match the Python backend's string values
- TSVECTOR is represented as `Unsupported("tsvector")` in Prisma
