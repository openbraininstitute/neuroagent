#!/bin/sh
# Entrypoint script for Neuroagent TypeScript Backend
# Handles database migrations and starts the Next.js server

set -e

echo "========================================="
echo "Neuroagent TypeScript Backend Starting"
echo "========================================="

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "Waiting for database at $DB_HOST:$DB_PORT to be ready..."
max_retries=30
retry_count=0

# Simple TCP connection check using nc (netcat)
while [ $retry_count -lt $max_retries ]; do
  if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
    echo "Database port is open!"
    # Give it a moment to fully initialize
    sleep 2
    break
  fi
  retry_count=$((retry_count + 1))
  echo "Database not ready yet (attempt $retry_count/$max_retries)..."
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "ERROR: Database connection timeout after $max_retries attempts"
  exit 1
fi

# Run database migrations (SAFE - only applies new migrations, never deletes data)
echo "Running database migrations..."
if npx prisma migrate deploy 2>&1; then
  echo "Migrations completed successfully!"
else
  echo "WARNING: No migrations to apply or migration failed"
  echo "Checking if database schema exists..."

  # Only use db push if migrations don't exist (initial setup)
  # This is safe because it only adds missing tables/columns
  if ! npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
    echo "Synchronizing database schema (safe operation - no data loss)..."
    # Note: We explicitly avoid --accept-data-loss flag to prevent any data deletion
    if npx prisma db push --skip-generate 2>&1; then
      echo "Database schema synchronized!"
    else
      echo "ERROR: Failed to synchronize database schema!"
      echo "Please check your DATABASE_URL and ensure the database is accessible"
      exit 1
    fi
  fi
fi

# Start the Next.js server
echo "Starting Neuroagent TypeScript Backend on port ${PORT:-8079}..."
echo "========================================="

exec node server.js
