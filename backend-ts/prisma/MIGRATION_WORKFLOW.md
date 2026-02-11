# Database Migration Workflow

This document describes the database migration workflow for development and production environments using Prisma Migrate.

## Overview

The Neuroagent TypeScript backend uses Prisma Migrate for database schema management. This replaces the Python backend's Alembic migrations while maintaining compatibility with the existing database schema.

## Initial Setup

The initial migration (`0_init`) represents the baseline database schema that was previously managed by Alembic. This migration has been marked as applied to avoid recreating existing tables.

## Development Workflow

### Prerequisites

- PostgreSQL database running (via Docker or local installation)
- `DATABASE_URL` environment variable configured in `.env`
- Prisma CLI installed (included in devDependencies)

### Making Schema Changes

1. **Modify the Prisma schema** (`prisma/schema.prisma`)

   ```prisma
   // Example: Adding a new field
   model Thread {
     id           String    @id @map("thread_id") @db.Uuid
     // ... existing fields
     description  String?   @db.VarChar  // New field
   }
   ```

2. **Create a migration**

   ```bash
   npm run db:migrate -- --name add_thread_description
   ```

   This command will:
   - Generate SQL migration files in `prisma/migrations/`
   - Apply the migration to your development database
   - Regenerate the Prisma Client with updated types

3. **Review the generated SQL**

   ```bash
   cat prisma/migrations/XXXXXX_add_thread_description/migration.sql
   ```

   Verify that the SQL is correct and safe to apply.

4. **Test the migration**
   - Run your application and verify it works with the new schema
   - Run tests to ensure nothing broke
   - Test rollback if needed (see Rollback section)

5. **Commit the migration**
   ```bash
   git add prisma/migrations/
   git add prisma/schema.prisma
   git commit -m "Add description field to threads table"
   ```

### Creating Migrations Without Applying

If you want to review the migration before applying:

```bash
npm run db:migrate -- --name my_migration --create-only
```

Then review the SQL and apply manually:

```bash
npx prisma migrate deploy
```

### Prototyping with db push

For rapid prototyping without creating migrations:

```bash
npm run db:push
```

**Warning**: This bypasses migration history. Use only for development prototyping.

## Production Workflow

### Pre-deployment Checklist

- [ ] All migrations tested in staging environment
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)
- [ ] Team notified of deployment

### Deployment Steps

1. **Backup the database**

   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Deploy migrations**

   ```bash
   npm run db:migrate:deploy
   ```

   This command:
   - Applies all pending migrations in order
   - Does not prompt for input (suitable for CI/CD)
   - Fails if any migration fails (transactional)

3. **Verify deployment**

   ```bash
   npx prisma migrate status
   ```

   Expected output: "Database schema is up to date!"

4. **Deploy application**
   - Deploy the new application version
   - Monitor logs for database errors
   - Verify API endpoints work correctly

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run database migrations
  run: npm run db:migrate:deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Verify migration status
  run: npx prisma migrate status
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Migration Rollback

Prisma Migrate does not have built-in rollback commands. To rollback a migration:

### Option 1: Manual Rollback (Recommended)

1. **Create a down migration SQL file**

   When creating a migration, also create a corresponding down migration:

   ```sql
   -- prisma/migrations/XXXXXX_add_thread_description/down.sql
   ALTER TABLE threads DROP COLUMN description;
   ```

2. **Apply the down migration**

   ```bash
   psql $DATABASE_URL -f prisma/migrations/XXXXXX_add_thread_description/down.sql
   ```

3. **Mark the migration as rolled back**

   ```bash
   npx prisma migrate resolve --rolled-back XXXXXX_add_thread_description
   ```

4. **Revert the schema file**
   ```bash
   git revert <commit-hash>
   ```

### Option 2: Restore from Backup

If the migration caused issues:

1. **Stop the application**

2. **Restore from backup**

   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Reset migration history**

   ```bash
   npx prisma migrate resolve --rolled-back XXXXXX_migration_name
   ```

4. **Redeploy previous application version**

## Testing Migrations

### Unit Tests

Test that migrations apply successfully:

```typescript
import { execSync } from 'child_process';
import { describe, it, expect } from 'vitest';

describe('Database Migrations', () => {
  it('should apply all migrations successfully', () => {
    expect(() => {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: 'postgresql://...' },
      });
    }).not.toThrow();
  });
});
```

### Integration Tests

Test database operations after migration:

```typescript
import { prisma } from '@/lib/db/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Thread Operations', () => {
  beforeAll(async () => {
    // Apply migrations
    execSync('npx prisma migrate deploy');
  });

  it('should create and query threads', async () => {
    const thread = await prisma.thread.create({
      data: {
        id: crypto.randomUUID(),
        title: 'Test Thread',
        userId: crypto.randomUUID(),
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    expect(thread.title).toBe('Test Thread');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

## Common Issues and Solutions

### Issue: "Migration already applied"

**Error**: `Migration X has already been applied`

**Solution**: The migration is already in the database. Use `migrate status` to verify.

### Issue: "Schema drift detected"

**Error**: `Your database schema is not in sync with your migration history`

**Solution**:

1. For development: `npx prisma migrate reset` (destroys data)
2. For production: Create a new migration to fix the drift

### Issue: "Cannot connect to database"

**Error**: `Can't reach database server`

**Solution**:

1. Verify `DATABASE_URL` in `.env`
2. Check database is running: `docker ps` or `pg_isready`
3. Test connection: `psql $DATABASE_URL`

### Issue: "Enum type already exists"

**Error**: `type "entity" already exists`

**Solution**: The database already has the enum. Mark the migration as applied:

```bash
npx prisma migrate resolve --applied XXXXXX_migration_name
```

## Best Practices

1. **Always backup before migrations**: Especially in production
2. **Test migrations in staging**: Never apply untested migrations to production
3. **Keep migrations small**: Easier to debug and rollback
4. **Document breaking changes**: Update API documentation if schema changes affect APIs
5. **Use transactions**: Prisma migrations are transactional by default
6. **Version control**: Always commit migration files to git
7. **Create down migrations**: Document how to rollback each migration
8. **Monitor after deployment**: Watch for errors and performance issues

## Migration Naming Conventions

Use descriptive names that explain what the migration does:

- ✅ Good: `add_description_to_threads`
- ✅ Good: `create_user_preferences_table`
- ✅ Good: `add_index_to_messages_content`
- ❌ Bad: `update_schema`
- ❌ Bad: `fix_bug`
- ❌ Bad: `migration_1`

## Database Schema Inspection

### Using Prisma Studio

Visual database browser:

```bash
npm run db:studio
```

Opens at http://localhost:5555

### Using psql

Command-line inspection:

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

# List foreign keys
\d+ messages
```

### Using Prisma CLI

```bash
# Pull current database schema
npx prisma db pull

# Show migration status
npx prisma migrate status

# Validate schema
npx prisma validate
```

## Emergency Procedures

### Database is corrupted

1. Stop all applications
2. Restore from most recent backup
3. Verify data integrity
4. Redeploy last known good version
5. Investigate root cause

### Migration stuck/hanging

1. Check for locks: `SELECT * FROM pg_locks WHERE NOT granted;`
2. Kill blocking queries if safe
3. Rollback transaction if possible
4. Restore from backup if necessary

### Data loss after migration

1. Stop application immediately
2. Restore from backup
3. Review migration SQL for errors
4. Fix migration and test thoroughly
5. Redeploy with corrected migration

## Support and Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Migration Troubleshooting Guide](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/troubleshooting-development)

## Appendix: Migration File Structure

```
prisma/migrations/
├── migration_lock.toml          # Lock file (commit to git)
├── 0_init/                      # Initial baseline migration
│   └── migration.sql            # SQL for initial schema
├── 20240115120000_add_field/    # Example migration
│   ├── migration.sql            # Generated SQL (commit to git)
│   └── down.sql                 # Manual rollback SQL (optional)
└── 20240116140000_add_index/
    ├── migration.sql
    └── down.sql
```

Each migration directory contains:

- `migration.sql`: Generated SQL to apply the migration
- `down.sql`: (Optional) Manual SQL to rollback the migration

curl -X POST http://localhost:8079/api/qa/chat_streamed/cfb10f68-6240-48ad-a04b-788a082b94c0 \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer eyJhbGciOiJSUz... \
 -d '{"content": "Hello, how are you?"}'
