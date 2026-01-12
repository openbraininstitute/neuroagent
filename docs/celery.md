# Celery Integration

This document describes the Celery integration introduced in PR #645, which restructured the backend to support background task execution.

## Overview

The backend is split into two independent components:

- **App** (`backend/src/neuroagent/app/`): FastAPI web application
- **Tasks** (`backend/src/neuroagent/tasks/`): Celery workers for background tasks

Both components share code from the root `backend/src/neuroagent/` module but cannot import from each other's directories.

## Key Changes

### Architecture
- Compute-intensive operations (Python code execution, circuit analysis) now run as Celery tasks
- Redis is required for Celery broker/backend, Redis Streams (long polling), and rate limiting
- Two Docker images: `Dockerfile.app` and `Dockerfile.tasks`

### Configuration
- **App**: `.env.app` with `NEUROAGENT_` prefix
- **Tasks**: `.env.tasks` with `TASKS_` prefix
- Redis env vars renamed (e.g., `NEUROAGENT_REDIS_HOST`)

### Tasks
- `python_q`: Python code execution
- `circuit_q`: Circuit population analysis

## Running Locally

```bash
# Start Redis
docker run -d -p 6379:6379 redis

# Run the app
uv run uvicorn neuroagent.app.main:app --host 0.0.0.0 --port 8000

# Run Celery workers
uv run celery -A neuroagent.tasks.main worker -Q python_q,circuit_q --loglevel=info
```

Or use Docker Compose: `docker compose up`

## Implementation Guide

See [`backend/src/neuroagent/tasks/README.md`](../backend/src/neuroagent/tasks/README.md) for detailed instructions on implementing new Celery tasks.
