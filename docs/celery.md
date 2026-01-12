# Celery Integration

This document describes the Celery integration introduced in PR #645 (Celery POC), which restructured the backend to support background task execution for compute-intensive operations.

## Overview

The backend is now split into two independent components:

1. **App** (`src/neuroagent/app/`): The FastAPI web application that handles HTTP requests, authentication, and API endpoints
2. **Tasks** (`src/neuroagent/tasks/`): Celery workers that execute background tasks asynchronously

This separation allows compute-intensive operations (Python code execution, circuit population analysis, etc.) to run in dedicated worker processes, improving the application's responsiveness and scalability.

## Architecture

### Component Separation

- **App Component**
  - Location: `backend/src/neuroagent/app/`
  - Entry point: `uvicorn neuroagent.app.main:app`
  - Dependencies: Installed via `uv sync --extra app`
  - Configuration: `.env.app` file with `NEUROAGENT_` prefix
  - Responsibilities: HTTP API, authentication, database, rate limiting, tool routing

- **Tasks Component**
  - Location: `backend/src/neuroagent/tasks/`
  - Entry point: `celery -A neuroagent.tasks.main worker`
  - Dependencies: Installed via `uv sync --extra tasks`
  - Configuration: `.env.tasks` file with `TASKS_` prefix
  - Responsibilities: Python code execution, circuit analysis, data processing

- **Shared Code**
  - Location: `backend/src/neuroagent/` (root level)
  - Files like `utils.py`, `task_schemas.py`, etc.
  - Contains code used by both app and tasks

### Import Restrictions

To maintain separation of concerns:
- Tasks can import from `neuroagent` root but **cannot** import from `neuroagent.app` or its subfolders
- App can import from `neuroagent` root but **cannot** import from `neuroagent.tasks` or its subfolders
- Both can import shared code from the root `neuroagent` module

## Key Components

### Redis

Redis serves multiple purposes in this architecture:
1. **Celery Broker**: Message queue for task distribution
2. **Celery Backend**: Storage for task results and metadata
3. **Redis Streams**: Long polling mechanism for real-time task progress
4. **Rate Limiting**: Request rate limiting for the API

Redis is now a required dependency for the application.

### Task Queues

The implementation uses dedicated queues for different task types:
- `python_q`: Python code execution tasks
- `circuit_q`: Circuit population analysis tasks

Workers can consume from multiple queues (e.g., `-Q python_q,circuit_q`), allowing flexible resource allocation.

### Long Polling

Instead of short polling (repeatedly checking for results), the implementation uses **Redis Streams** for efficient long polling:

1. Tool submits a task and gets a task ID
2. Tool performs a blocking `XREAD` on Redis stream `task:{task_id}:progress`
3. Task worker publishes completion/error message to the stream when done
4. Tool receives the notification and retrieves the result

This approach reduces unnecessary polling requests and provides near-real-time updates.

### Task Communication Pattern

```
┌─────────┐                  ┌─────────┐                  ┌────────┐
│  Tool   │ ───send_task───> │  Redis  │ <───get_task─── │ Worker │
│ (App)   │                  │ (Broker)│                  │(Tasks) │
└─────────┘                  └─────────┘                  └────────┘
     │                            │                             │
     │                            │         ┌──────────────────┘
     │                            │         │
     └───poll (Redis Stream)──────┴─────notify_completion
```

## Tasks Migrated to Celery

As of this PR, the following operations run as Celery tasks:

1. **Python Code Execution** (`run_python_tool`)
   - Executes user-provided Python code in a WebAssembly sandbox
   - Returns plots and results via S3 presigned URLs
   - Queue: `python_q`

2. **Circuit Population Analysis** (`talk_to_circuit_dataframe`)
   - Performs complex circuit data analysis
   - Fetches data from EntityCore and processes it
   - Queue: `circuit_q`

## Configuration Changes

### Environment Variables

Environment variable naming has been updated for clarity:

**App Configuration (`.env.app`)**:
- All variables use `NEUROAGENT_` prefix
- Redis settings: `NEUROAGENT_REDIS_HOST`, `NEUROAGENT_REDIS_PORT`, `NEUROAGENT_REDIS_PASSWORD`

**Tasks Configuration (`.env.tasks`)**:
- All variables use `TASKS_` prefix
- Redis settings: `TASKS_REDIS_HOST`, `TASKS_REDIS_PORT`, `TASKS_REDIS_PASSWORD`
- Celery settings: `TASKS_CELERY__{option}` (e.g., `TASKS_CELERY__WORKER_CONCURRENCY`)

### Docker Images

Two separate Docker images are now built:
- `Dockerfile.app`: FastAPI application image
- `Dockerfile.tasks`: Celery worker image (includes Deno, WASM executor, additional plotting libraries)

## Developer Workflow

### Running Locally

1. **Start Redis**:
   ```bash
   docker run -d -p 6379:6379 redis
   ```

2. **Run the App**:
   ```bash
   uv run uvicorn neuroagent.app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Run Celery Workers**:
   ```bash
   uv run celery -A neuroagent.tasks.main worker -Q python_q,circuit_q --loglevel=info
   ```

### Running with Docker Compose

```bash
docker compose up
```

This starts all services including `app`, `tasks`, `frontend`, `postgres`, `redis`, and `minio`.

## Testing

The test suite works without requiring `.env.tasks` or running Celery workers. Task-related tests use mocks or test the task functions directly without Celery.

## Implementation Guide

For detailed instructions on implementing a new Celery task, see [`backend/src/neuroagent/tasks/README.md`](../backend/src/neuroagent/tasks/README.md).

## Benefits

1. **Improved Responsiveness**: Long-running operations don't block HTTP requests
2. **Scalability**: Workers can be scaled independently from the web application
3. **Resource Isolation**: Compute-intensive tasks run in separate processes with dedicated resources
4. **Fault Tolerance**: Task failures don't crash the web application
5. **Future-Ready**: Multiple queue support enables specialized worker pools for different task types

## Migration Notes

When deploying this change to production:
- Update Terraform to use new environment variable names for Redis
- Build and deploy both `app` and `tasks` Docker images
- Ensure Redis is configured and accessible to both components
- Set appropriate Celery worker concurrency based on available resources
