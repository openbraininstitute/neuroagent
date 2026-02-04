# Database Migration Guide

## Overview

This guide documents the migration from Python/Alembic to TypeScript/Prisma for database schema management. The Neuroagent database uses PostgreSQL with full-text search capabilities.

## Migration Strategy

The migration strategy is designed to work with an existing database that has been managed by Alembic migrations. We use Prisma's introspection and migration capabilities to take over schema management.

### Key Principles

1. **Preserve existing data**: All migrations are designed to work with existing production data
2. **Maintain compatibility**: The schema structure remains identical to the Python backend
3. **Incremental adoption**: The TypeScript backend can coexist with the Python backend during transition
4. **Rollback support**: All migrations include downgrade paths

## Database Schema

### Tables

1. **threads**: Conversation threads
   - `thread_id` (UUID, PK)
   - `vlab_id` (UUID, nullable)
   - `project_id` (UUID, nullable)
   - `title` (VARCHAR)
   - `creation_date` (TIMESTAMPTZ)
   - `update_date` (TIMESTAMPTZ)
   - `user_id` (UUID)

2. **messages**: Individual messages in threads
   - `message_id` (UUID, PK)
   - `creation_date` (TIMESTAMPTZ)
   - `entity` (ENUM: USER, AI_TOOL, TOOL, AI_MESSAGE)
   - `content` (VARCHAR, JSON string)
   - `is_complete` (BOOLEAN)
   - `thread_id` (UUID, FK to threads)
   - `search_vector` (TSVECTOR, for full-text search)

3. **tool_calls**: Tool invocations
   - `tool_call_id` (VARCHAR, PK)
   - `name` (VARCHAR)
   - `arguments` (VARCHAR, JSON string)
   - `validated` (BOOLEAN, nullable)
   - `message_id` (UUID, FK to messages)

4. **tool_selection**: Tool selection metadata
   - `id` (UUID, PK)
   - `tool_name` (VARCHAR)
   - `message_id` (UUID, FK to messages)

5. **complexity_estimation**: Model complexity metadata
   - `id` (UUID, PK)
   - `complexity` (INTEGER, nullable)
   - `model` (VARCHAR)
   - `reasoning` (ENUM: NONE, MINIMAL, LOW, MEDIUM, HIGH, nullable)
   - `message_id` (UUID, FK to messages)

6. **token_consumption**: LLM token usage tracking
   - `id` (UUID, PK)
   - `message_id` (UUID, FK to messages)
   - `type` (ENUM: INPUT_NONCACHED, INPUT_CACHED, COMPLETION)
   - `task` (ENUM: CHAT_COMPLETION, TOOL_SELECTION, CALL_WITHIN_TOOL)
   - `count` (INTEGER)
   - `model` (VARCHAR)

### Enums

- **entity**: USER, AI_TOOL, TOOL, AI_MESSAGE
- **task**: CHAT_COMPLETION, TOOL_SELECTION, CALL_WITHIN_TOOL
- **tokentype**: INPUT_NONCACHED, INPUT_CACHED, COMPLETION
- **reasoninglevels**: NONE, MINIMAL, LOW, MEDIUM, HIGH

### Indexes

- `ix_messages_search_vector`: GIN index on `messages.search_vector` for full-text search

### Triggers

- `messages_search_vector_trigger`: Automatically updates `search_vector` on INSERT/UPDATE

## Development Workflow

### Initial Setup (New Database)

For a completely new database:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply initial migration
npx prisma migrate dev --name init

# This will:
# 1. Create all tables, enums, indexes
# 2. Set up triggers for search_vector
# 3. Generate migration files in prisma/migrations/
```

### Working with Existing Database (Alembic-managed)

For databases already managed by Alembic:

```bash
# 1. Introspect the existing database to verify schema
npx prisma db pull

# 2. Create a baseline migration without applying it
npx prisma migrate dev --name baseline --create-only

# 3. Mark the migration as applied (since schema already exists)
npx prisma migrate resolve --applied baseline

# 4. Generate Prisma client
npx prisma generate
```

### Creating New Migrations

When you modify the Prisma schema:

```bash
# 1. Update prisma/schema.prisma with your changes

# 2. Create a migration
npx prisma migrate dev --name descriptive_name

# This will:
# - Generate SQL migration files
# - Apply the migration to your dev database
# - Regenerate Prisma client
```

### Applying Migrations in Production

```bash
# Apply all pending migrations
npx prisma migrate deploy

# This command:
# - Applies migrations in order
# - Does not prompt for input
# - Suitable for CI/CD pipelines
```

### Rolling Back Migrations

Prisma doesn't have built-in rollback commands. To rollback:

```bash
# 1. Manually apply the down migration SQL
psql $DATABASE_URL -f prisma/migrations/XXXXXX_migration_name/down.sql

# 2. Mark the migration as rolled back
npx prisma migrate resolve --rolled-back XXXXXX_migration_name
```

## Migration from Alembic

### Current Status

The TypeScript backend has been initialized with a baseline migration (`0_init`) that represents the complete database schema from the Python backend. This migration includes:

- All tables (threads, messages, tool_calls, tool_selection, complexity_estimation, token_consumption)
- All enums (entity, task, tokentype, reasoninglevels)
- All foreign key constraints with CASCADE delete
- Full-text search support (TSVECTOR with GIN index and trigger)
- The alembic_version table for compatibility

The baseline migration has been marked as applied, allowing the TypeScript backend to take over schema management from this point forward.

### Alembic Migration History

The Python backend used these Alembic migrations (in order):

1. `b57e558cf11f_initial_migration.py` - Created threads and messages tables
2. `169bed537507_add_entity_to_message.py` - Added entity enum and column
3. `cf9eedbf9270_added_tool_call_table.py` - Created tool_calls table
4. `0ea274d7a584_remove_order_column.py` - Removed order column from messages
5. `52d7f4485020_add_model_column_to_messages.py` - Added model column (later removed)
6. `529e44b33a67_switch_to_uuid.py` - Converted IDs to UUID type
7. `7122d2f48028_switch_to_offset_aware_datetimes.py` - Changed to TIMESTAMPTZ
8. `818a9ba86187_allow_empty_vlab_project.py` - Made vlab_id/project_id nullable
9. `08a638866869_partial_messages.py` - Added is_complete column
10. `dde4f8453a14_add_tool_selection_table.py` - Created tool_selection table
11. `02aab0a6eef4_track_token_usage.py` - Created token_consumption table
12. `6d8986f38d7b_complexity_estimation.py` - Created complexity_estimation table
13. `12bd7610cbc2_within_tool_call_task.py` - Added CALL_WITHIN_TOOL to task enum
14. `cd5a73ea91db_add_ts_vector.py` - Added search_vector with trigger

### Conversion Notes

The Prisma schema in `schema.prisma` represents the final state after all Alembic migrations. Key differences:

1. **Enum naming**: Prisma requires lowercase enum names in PostgreSQL
   - `entity` (not `Entity`)
   - `task` (not `Task`)
   - `tokentype` (not `TokenType`)
   - `reasoninglevels` (not `ReasoningLevels`)

2. **Column mapping**: Prisma uses `@map()` to match database column names
   - Model field: `threadId` → DB column: `thread_id`
   - Model field: `creationDate` → DB column: `creation_date`

3. **Relations**: Prisma defines bidirectional relations
   - Thread has many Messages
   - Message belongs to Thread
   - Message has many ToolCalls, ToolSelections, etc.

4. **Cascade deletes**: Defined with `onDelete: Cascade`
   - Deleting a thread deletes all its messages
   - Deleting a message deletes all related tool_calls, token_consumption, etc.

5. **Full-text search**: Uses `Unsupported("tsvector")` type
   - Prisma doesn't natively support TSVECTOR
   - Requires raw SQL queries for full-text search operations

## Testing Migrations

### Unit Tests

Test migration application and rollback:

```typescript
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

describe('Database Migrations', () => {
  it('should apply migrations successfully', async () => {
    // Apply migrations
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Verify schema
    const prisma = new PrismaClient();
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    expect(tables).toContainEqual({ table_name: 'threads' });
    expect(tables).toContainEqual({ table_name: 'messages' });
    // ... verify other tables
  });
});
```

### Integration Tests

Test database operations after migration:

```typescript
describe('Database Operations', () => {
  it('should create and query threads', async () => {
    const prisma = new PrismaClient();

    const thread = await prisma.thread.create({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Thread',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    expect(thread.title).toBe('Test Thread');
  });
});
```

## Troubleshooting

### Common Issues

1. **Enum type mismatch**
   - Error: `type "Entity" does not exist`
   - Solution: Ensure enum names are lowercase in PostgreSQL

2. **Migration already applied**
   - Error: `Migration X has already been applied`
   - Solution: Use `npx prisma migrate resolve --applied X`

3. **Schema drift detected**
   - Error: `Your database schema is not in sync`
   - Solution: Run `npx prisma db pull` to sync schema

4. **Connection issues**
   - Error: `Can't reach database server`
   - Solution: Verify DATABASE_URL in .env file

### Manual Schema Inspection

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Describe table structure
\d threads
\d messages

# List enums
\dT

# List indexes
\di

# List triggers
\dy
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Backup database
- [ ] Test migrations on staging environment
- [ ] Verify rollback procedures
- [ ] Review migration SQL for performance impact
- [ ] Plan maintenance window if needed

### Deployment Steps

1. **Backup database**

   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Apply migrations**

   ```bash
   npx prisma migrate deploy
   ```

3. **Verify deployment**

   ```bash
   npx prisma migrate status
   ```

4. **Monitor application**
   - Check logs for database errors
   - Verify API endpoints work correctly
   - Monitor query performance

### Rollback Procedure

If issues occur:

1. **Stop application**
2. **Restore from backup**
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   ```
3. **Investigate and fix issues**
4. **Retry deployment**

## Best Practices

1. **Always backup before migrations**: Especially in production
2. **Test migrations thoroughly**: Use staging environment
3. **Keep migrations small**: Easier to debug and rollback
4. **Document breaking changes**: Update API documentation
5. **Monitor performance**: Watch for slow queries after schema changes
6. **Use transactions**: Prisma migrations are transactional by default
7. **Version control**: Commit migration files to git

## References

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
