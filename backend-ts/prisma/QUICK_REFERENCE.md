# Prisma Migrate Quick Reference

## Common Commands

### Development

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Create and apply migration
npm run db:migrate -- --name my_migration

# Create migration without applying
npm run db:migrate -- --name my_migration --create-only

# Push schema changes (prototyping only, no migration history)
npm run db:push

# Reset database (WARNING: destroys all data)
npx prisma migrate reset --force

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Production

```bash
# Apply all pending migrations
npm run db:migrate:deploy

# Check migration status
npx prisma migrate status

# Validate schema
npx prisma validate
```

### Troubleshooting

```bash
# Pull current database schema
npx prisma db pull

# Mark migration as applied (without running it)
npx prisma migrate resolve --applied MIGRATION_NAME

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# View migration diff
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

## Migration Workflow

### Creating a New Migration

1. **Modify schema**: Edit `prisma/schema.prisma`
2. **Create migration**: `npm run db:migrate -- --name descriptive_name`
3. **Review SQL**: Check `prisma/migrations/XXXXXX_descriptive_name/migration.sql`
4. **Create down migration**: Add `down.sql` file for rollback
5. **Test**: Run tests to verify changes
6. **Commit**: Add migration files to git

### Deploying to Production

1. **Backup database**: `pg_dump $DATABASE_URL > backup.sql`
2. **Apply migrations**: `npm run db:migrate:deploy`
3. **Verify**: `npx prisma migrate status`
4. **Deploy app**: Deploy new application version
5. **Monitor**: Watch logs for errors

### Rolling Back a Migration

1. **Apply down migration**: `psql $DATABASE_URL -f prisma/migrations/XXXXXX/down.sql`
2. **Revert schema**: `git revert <commit>`
3. **Redeploy**: Deploy previous application version

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:password@host:port/database"

# Optional (for connection pooling)
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20"
```

## File Structure

```
prisma/
├── schema.prisma              # Database schema definition
├── migrations/
│   ├── migration_lock.toml    # Lock file (commit to git)
│   └── XXXXXX_migration_name/
│       ├── migration.sql      # Generated SQL (commit to git)
│       └── down.sql           # Manual rollback SQL (optional)
├── MIGRATION_GUIDE.md         # Comprehensive guide
├── MIGRATION_WORKFLOW.md      # Detailed workflows
├── README.md                  # Overview
└── QUICK_REFERENCE.md         # This file
```

## Common Issues

### "Migration already applied"
```bash
# Migration is already in database, skip it
npx prisma migrate resolve --applied MIGRATION_NAME
```

### "Schema drift detected"
```bash
# Development: Reset database
npx prisma migrate reset --force

# Production: Create new migration to fix drift
npm run db:migrate -- --name fix_drift
```

### "Cannot connect to database"
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Check if database is running
docker ps  # if using Docker
```

### "Enum type already exists"
```bash
# Database already has the enum, mark migration as applied
npx prisma migrate resolve --applied MIGRATION_NAME
```

## Best Practices

✅ **DO**
- Always backup before migrations
- Test migrations in staging first
- Keep migrations small and focused
- Create down migrations for production
- Commit migration files to git
- Use descriptive migration names
- Document breaking changes

❌ **DON'T**
- Don't use `db:push` in production
- Don't edit applied migrations
- Don't skip migrations
- Don't apply untested migrations to production
- Don't forget to backup before migrations

## Testing

```bash
# Run migration tests
npm test -- tests/db/migrations.test.ts

# Run all database tests
npm test -- tests/db/

# Run all tests
npm test
```

## Getting Help

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Troubleshooting Guide](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/troubleshooting-development)
- See `MIGRATION_GUIDE.md` for detailed information
- See `MIGRATION_WORKFLOW.md` for step-by-step procedures
