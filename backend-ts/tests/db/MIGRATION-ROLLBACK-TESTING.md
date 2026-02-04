# Migration Rollback Testing Guide

This document explains how to test the migration rollback property test with actual migrations.

## Overview

The property test in `migration-rollback.property.test.ts` validates **Property 9: Migration Rollback** from the design document:

> *For any* applied migration, rolling it back should restore the database schema to its previous state.

**Validates: Requirements 4.4**

## Test Strategy

The property test:

1. **Captures initial schema state** - Records all tables, columns, enums, indexes, foreign keys, and triggers
2. **Applies a migration** - Ensures the migration is deployed
3. **Captures post-migration state** - Records the schema after migration
4. **Applies rollback** - Executes the down migration SQL
5. **Captures post-rollback state** - Records the schema after rollback
6. **Compares states** - Verifies initial state matches post-rollback state

## Current Status

The test currently passes with the message "No migrations to test (only 0_init exists)" because:

- The baseline migration (`0_init`) represents the existing database schema
- No additional migrations have been created yet
- The test is designed to skip the initial migration

## Testing with Real Migrations

To test the rollback functionality with actual migrations:

### Step 1: Create a Test Migration

Create a simple test migration:

```bash
cd backend-ts

# Create a test migration that adds a field
npm run db:migrate -- --name add_test_field_to_threads --create-only
```

This will create a migration directory like:
```
prisma/migrations/20240115120000_add_test_field_to_threads/
└── migration.sql
```

### Step 2: Edit the Migration SQL

Edit the generated `migration.sql` to add a simple field:

```sql
-- Add a test field to threads table
ALTER TABLE "threads" ADD COLUMN "test_field" VARCHAR;
```

### Step 3: Create the Down Migration

Create a `down.sql` file in the same directory:

```sql
-- Rollback: Remove the test field
ALTER TABLE "threads" DROP COLUMN IF EXISTS "test_field";
```

### Step 4: Apply the Migration

```bash
npm run db:migrate:deploy
```

### Step 5: Run the Property Test

```bash
npm test -- migration-rollback.property.test.ts
```

The test will:
- Capture the schema before the test migration
- Apply the migration (if not already applied)
- Capture the schema after migration
- Apply the rollback using `down.sql`
- Verify the schema matches the initial state
- Re-apply the migration to restore the database

### Step 6: Clean Up

After testing, you can remove the test migration:

```bash
# Rollback the test migration
npx prisma migrate resolve --rolled-back 20240115120000_add_test_field_to_threads

# Delete the migration directory
rm -rf prisma/migrations/20240115120000_add_test_field_to_threads
```

## Schema State Comparison

The test compares the following schema elements:

### Tables
- Table names
- Column names, types, nullability, and defaults

### Enums
- Enum type names
- Enum values and their order

### Indexes
- Index names and definitions
- Excludes primary key indexes

### Foreign Keys
- Foreign key constraint names
- Delete rules (CASCADE, RESTRICT, etc.)

### Triggers
- Trigger names and associated tables

## Example Test Output

### Successful Rollback

```
✓ should restore schema state after rollback for any migration
  - Initial state captured: 8 tables, 4 enums, 5 indexes
  - Migration applied: add_test_field_to_threads
  - Rollback applied successfully
  - Schema states match: ✓
```

### Failed Rollback

```
✗ should restore schema state after rollback for any migration
  Schema differences after rollback:
    - Column threads.test_field exists in state2 but not in state1
    - Index ix_threads_test_field exists in state2 but not in state1
```

## Property Test Characteristics

### Minimum Iterations

The test is configured to run with a minimum of 100 iterations for property-based tests (as specified in `vitest.config.ts`). However, since migration testing is deterministic and involves actual database operations, the test runs once per migration rather than using random generation.

### Test Isolation

Each test:
- Operates on the actual database (not mocked)
- Restores the database state after testing
- Can be run multiple times safely

### Idempotency

The test includes an idempotency check:
- Applies rollback twice
- Verifies the schema state remains consistent
- Ensures rollback operations are safe to repeat

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Migration Rollback Tests

on: [push, pull_request]

jobs:
  test-migrations:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: neuroagent_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: backend-ts

      - name: Apply migrations
        run: npm run db:migrate:deploy
        working-directory: backend-ts
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/neuroagent_test

      - name: Run migration rollback tests
        run: npm test -- migration-rollback.property.test.ts
        working-directory: backend-ts
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/neuroagent_test
```

## Best Practices

### 1. Always Create Down Migrations

When creating a migration, immediately create the corresponding `down.sql`:

```bash
# Create migration
npm run db:migrate -- --name my_migration --create-only

# Edit migration.sql
# Create down.sql with rollback logic
# Apply migration
npm run db:migrate:deploy
```

### 2. Test Rollback Before Production

Always test rollback in staging:

```bash
# In staging environment
npm run db:migrate:deploy
npm test -- migration-rollback.property.test.ts
```

### 3. Document Complex Rollbacks

For complex migrations, document the rollback process:

```sql
-- down.sql
-- This migration added a new table and foreign keys
-- Rollback order is important:
-- 1. Drop foreign keys first
-- 2. Drop dependent tables
-- 3. Drop main table

ALTER TABLE "child_table" DROP CONSTRAINT IF EXISTS "fk_parent";
DROP TABLE IF EXISTS "child_table" CASCADE;
DROP TABLE IF EXISTS "parent_table" CASCADE;
```

### 4. Backup Before Rollback

In production, always backup before rollback:

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Test rollback in staging first
# Then apply to production if successful
```

## Limitations

### Current Limitations

1. **Manual Down Migrations**: The test requires manually created `down.sql` files
2. **No Automatic Generation**: Down migrations are not auto-generated from up migrations
3. **Data Loss**: Rollback may cause data loss (e.g., dropping columns)
4. **Enum Modifications**: PostgreSQL enum changes are difficult to rollback

### Future Improvements

1. **Automatic Down Generation**: Generate basic down migrations automatically
2. **Data Preservation**: Warn about data loss before rollback
3. **Dry Run Mode**: Preview rollback changes without applying
4. **Rollback Validation**: Validate down migrations before execution

## Troubleshooting

### Issue: "No down migration available"

**Solution**: Create a `down.sql` file in the migration directory with the rollback SQL.

### Issue: "Schema states don't match after rollback"

**Cause**: The down migration is incomplete or incorrect.

**Solution**:
1. Review the `down.sql` file
2. Ensure all changes in `migration.sql` are reversed
3. Check for missing DROP statements or ALTER TABLE commands

### Issue: "Migration already rolled back"

**Cause**: The migration was already marked as rolled back in Prisma's migration history.

**Solution**:
```bash
# Re-apply the migration
npm run db:migrate:deploy

# Then test rollback again
npm test -- migration-rollback.property.test.ts
```

### Issue: "Cannot drop column - data exists"

**Cause**: Trying to rollback a migration that added a column with data.

**Solution**:
1. Backup the data first
2. Use `DROP COLUMN IF EXISTS` with CASCADE if needed
3. Consider data migration strategy before rollback

## Related Documentation

- [Prisma Migration Workflow](../prisma/MIGRATION_WORKFLOW.md)
- [Database Schema Documentation](../../docs/DATABASE-SCHEMA.md)
- [Migration Guide](../../docs/MIGRATION-GUIDE.md)

## Support

For questions or issues with migration rollback testing:

1. Check the [Prisma Migrate documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
2. Review the [PostgreSQL documentation](https://www.postgresql.org/docs/) for SQL syntax
3. Consult the team's migration best practices

## Appendix: Schema State Structure

The `SchemaState` interface captures:

```typescript
interface SchemaState {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default: string | null;
    }>;
  }>;
  enums: Array<{
    name: string;
    values: string[];
  }>;
  indexes: Array<{
    table: string;
    name: string;
    definition: string;
  }>;
  foreignKeys: Array<{
    table: string;
    name: string;
    deleteRule: string;
  }>;
  triggers: Array<{
    table: string;
    name: string;
  }>;
}
```

This comprehensive structure ensures that all schema elements are verified during rollback testing.
