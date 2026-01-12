# Celery Integration

This document describes the Celery integration added to the Neuroagent backend, which enables asynchronous execution of compute-intensive tasks.

## Overview

The Celery integration splits the backend into two independent components:

1. **App** (`neuroagent.app`): The FastAPI web application that handles HTTP requests, authentication, and tool routing
2. **Tasks** (`neuroagent.tasks`): Celery workers that execute background tasks asynchronously

This separation allows compute-intensive operations (like Python code execution and circuit analysis) to be offloaded to dedicated worker processes, improving the responsiveness of the web API and enabling better scalability.

## Architecture

### Component Separation

The backend is now organized into two distinct runtime components:

```
backend/src/neuroagent/
├── app/                  # FastAPI application
│   ├── main.py          # App entry point
│   ├── config.py        # App-specific configuration
│   ├── dependencies.py  # App dependencies
│   └── ...
├── tasks/               # Celery workers
│   ├── main.py         # Celery app and worker entry point
│   ├── config.py       # Tasks-specific configuration
│   ├── README.md       # Guide for implementing new tasks
│   └── ...
├── config.py           # Shared configuration (Redis, S3)
├── task_schemas.py     # Shared schemas for task inputs/outputs
├── utils.py            # Shared utilities
└── tools/              # Tool implementations (enqueue tasks)
```

**Import Restrictions:**
- Tasks **cannot** import from `neuroagent.app`
- App **cannot** import from `neuroagent.tasks`
- Both can import from shared modules like `neuroagent.utils` and `neuroagent.task_schemas`

### Dependency Management

Dependencies are organized using `uv` extras in `pyproject.toml`:

- **Base dependencies**: Core dependencies shared by both components
- **`app` extra**: FastAPI, SQLAlchemy, authentication libraries
- **`tasks` extra**: Celery, code execution libraries, circuit analysis tools
- **`dev` extra**: Development and testing tools

### Docker Images

Two separate Docker images are built:

- **`Dockerfile.app`**: Builds the FastAPI application (installs `app` dependencies)
- **`Dockerfile.tasks`**: Builds the Celery workers (installs `tasks` dependencies)

Both images use `uv` for dependency management and are optimized for their specific workloads.

## Configuration

### Environment Variables

Configuration is split into two files:

1. **`.env.app`**: Configuration for the FastAPI application (prefix: `NEUROAGENT_`)
2. **`.env.tasks`**: Configuration for Celery workers (prefix: `TASKS_`)

Shared configuration (Redis, S3) is defined in `backend/src/neuroagent/config.py` and consumed by both components.

### Redis

Redis serves multiple purposes in the new architecture:

- **Message Broker**: Celery uses Redis to queue tasks
- **Result Backend**: Celery stores task results in Redis
- **Rate Limiting**: The app component uses Redis for API rate limiting
- **Long Polling**: Redis Streams are used for real-time task progress notifications

Redis is now **required** for both components to function.

## Task Execution Flow

1. **User Request**: Client sends request to FastAPI app
2. **Tool Invocation**: App invokes a tool (e.g., `PythonCodeTool`)
3. **Task Submission**: Tool submits task to Celery queue using `celery_client.send_task()`
4. **Worker Picks Up Task**: Celery worker retrieves task from queue and executes it
5. **Progress Notification**: Worker publishes completion event to Redis Stream
6. **Long Polling**: Tool polls Redis Stream for completion notification
7. **Result Retrieval**: Tool retrieves result from Celery result backend
8. **Response**: Tool returns result to client

### Long Polling with Redis Streams

Instead of repeatedly checking if a task is complete (short polling), the implementation uses Redis Streams for efficient long polling:

- **Worker side**: Uses `task_stream_notifier` context manager to publish "done" or "error" messages to a Redis Stream (`task:{task_id}:progress`)
- **Tool side**: Uses `long_poll_celery_result()` helper to wait for stream messages with a blocking `XREAD` call
- **Benefits**: Reduces Redis load, provides near-instant notification of task completion

## Tasks

The following tasks have been migrated to Celery:

### 1. Python Code Execution (`run_python_tool`)

- **Queue**: `python_q`
- **Purpose**: Execute user-provided Python code in a sandboxed WASM environment
- **Task Module**: `backend/src/neuroagent/tasks/python_tool_task.py`
- **Tool**: `backend/src/neuroagent/tools/python_code_tool.py`

**Key Features:**
- Executes code using a WASM-based Python interpreter (Pyodide)
- Uploads generated plots directly to S3 from the task
- Returns execution results and plot URLs

### 2. Circuit Population Analysis (`talk_to_df`)

- **Queue**: `circuit_q`
- **Purpose**: Analyze circuit data using natural language queries
- **Task Module**: `backend/src/neuroagent/tasks/circuit_population_analysis_task.py`
- **Tool**: `backend/src/neuroagent/tools/circuit_population_analysis.py`

**Key Features:**
- Downloads circuit data from a pre-signed URL
- Analyzes data using user's natural language query
- Returns analysis results with token consumption metrics

## Queue Strategy

The implementation uses separate queues for different task types (`python_q`, `circuit_q`). This enables:

- **Workload isolation**: Different tasks can have different resource requirements
- **Prioritization**: Critical tasks can be routed to dedicated workers
- **Scalability**: Workers can be configured to consume from specific queues

**Current Default**: Workers consume from all queues (`-Q python_q,circuit_q`), but the queue separation enables future optimization where different worker pools could handle different task types.

## Running the System

### Using Docker Compose

The easiest way to run both components:

```bash
docker compose up
```

This starts:
- `app` service: FastAPI application on port 8078
- `tasks` service: Celery workers consuming from all queues
- `redis` service: Message broker and result backend
- Other supporting services (postgres, minio, frontend)

### Running Locally

#### 1. Start Redis

```bash
docker run -d -p 6379:6379 redis
```

#### 2. Start the App

```bash
cd backend
uv sync --extra app
uv run uvicorn neuroagent.app.main:app --host 0.0.0.0 --port 8000
```

#### 3. Start the Workers

```bash
cd backend
uv sync --extra tasks
uv run celery -A neuroagent.tasks.main worker -Q python_q,circuit_q --loglevel=info
```

### Celery Configuration

Celery options can be set via:
- **Environment variables**: `TASKS_CELERY__{option_name}` in `.env.tasks`
- **Command line flags**: `--concurrency=4`, `--loglevel=info`, etc.

## Implementing New Tasks

See [`backend/src/neuroagent/tasks/README.md`](../backend/src/neuroagent/tasks/README.md) for a comprehensive guide on implementing new Celery tasks.

**Key Steps:**
1. Define input/output schemas in `task_schemas.py`
2. Create task function in `backend/src/neuroagent/tasks/`
3. Register task in `backend/src/neuroagent/tasks/__init__.py`
4. Create/update tool to submit task using `celery_client.send_task()`
5. Use `long_poll_celery_result()` to wait for task completion

## Testing and Debugging

### Running Tests

```bash
cd backend
uv run pytest
```

### Debugging Tasks

Use `celery.contrib.rdb` for remote debugging:

```python
from celery.contrib import rdb

@celery.task(name="my_task", bind=True)
def run(self, arg):
    rdb.set_trace()  # Set breakpoint
    # Task logic...
```

Connect to the debugger when the worker hits the breakpoint:

```bash
telnet localhost 6900
```

## Migration Impact

### Breaking Changes

1. **Environment Variables**: Redis-related variables were renamed
   - **Before**: `RATE_LIMITER_*` prefixes
   - **After**: `NEUROAGENT_REDIS_*` and `TASKS_REDIS_*` prefixes

2. **Environment Files**: Configuration split into separate files
   - **Before**: Single `.env` file
   - **After**: `.env.app` and `.env.tasks` files

3. **Docker Images**: Two images instead of one
   - Applications must deploy both `app` and `tasks` containers
   - Terraform/deployment configurations need updates

### Removed Features

- **`neuroagent-api` console script**: Removed in favor of direct `uvicorn` command
- **Async code execution in tools**: All code execution now happens in Celery tasks

## Performance Considerations

### Timeouts

- **Task execution timeout**: Configurable via Celery configuration
- **Long polling timeout**: Default 30 seconds, configurable per tool
- **Stream TTL**: Redis Streams expire after 1 day

### Scalability

- **Horizontal scaling**: Deploy multiple worker containers for increased throughput
- **Queue-based routing**: Route different task types to specialized workers
- **Resource isolation**: CPU-intensive tasks don't block API responses

## Future Improvements

Potential enhancements mentioned in the PR:

1. **Unit tests**: Add tests demonstrating how to test Celery tasks
2. **Logging**: Reduce verbosity of httpx and OpenAI loggers
3. **Token refresh**: Implement JWT/pre-signed URL refresh for long-running tasks
4. **Queue optimization**: Consider different worker pools for different queues based on usage patterns

## References

- [Celery User Guide](https://docs.celeryq.dev/en/stable/userguide/)
- [Celery Task Calling](https://docs.celeryq.dev/en/stable/userguide/calling.html)
- [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Backend README](../backend/README.md)
- [Tasks Implementation Guide](../backend/src/neuroagent/tasks/README.md)
