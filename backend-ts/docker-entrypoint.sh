#!/bin/sh
# Entrypoint script for Neuroagent TypeScript Backend
# Handles database migrations and starts the Next.js server

set -e

echo "========================================="
echo "Neuroagent TypeScript Backend Starting"
echo "========================================="

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_retries=30
retry_count=0

until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $retry_count -eq $max_retries ]; do
  retry_count=$((retry_count + 1))
  echo "Database not ready yet (attempt $retry_count/$max_retries)..."
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "ERROR: Database connection timeout after $max_retries attempts"
  exit 1
fi

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
if npx prisma migrate deploy; then
  echo "Migrations completed successfully!"
else
  echo "ERROR: Migration failed!"
  exit 1
fi

# Start the Next.js server
echo "Starting Neuroagent TypeScript Backend on port ${PORT:-8079}..."
echo "========================================="

exec node server.js
