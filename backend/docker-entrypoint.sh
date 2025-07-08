#!/bin/bash

set -o errexit

alembic upgrade head
neuroagent-api --host 0.0.0.0 --port 8078 &
SERVER_PID=$!

# Wait for server to be ready
while ! curl -f http://localhost:8078/healthz 2>/dev/null; do
  echo "Waiting for server to start..."
  sleep 2
done

echo "Server is ready, running setup_pyodide.mjs"
node setup_pyodide.mjs

# Keep server running
wait $SERVER_PID
