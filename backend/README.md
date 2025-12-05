# Backend

The backend consists of **two separate components**:

1. **App**: The FastAPI application that handles HTTP requests, authentication, and API endpoints
2. **Tasks**: Celery workers that execute background tasks (Python code execution, circuit analysis, etc.)

These components are built separately, use different dependency groups, and can run independently.

## Installation

Install [uv](https://github.com/astral-sh/uv) if you haven't already:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Install the backend package:
```bash
# Install all dependencies (app, tasks, and dev)
uv sync --all-extras

# Or install base dependencies only
uv sync
```

To install dependencies for specific components:

```bash
# Install app dependencies only
uv sync --extra app

# Install tasks dependencies only
uv sync --extra tasks

# Install both app and tasks dependencies
uv sync --extra app --extra tasks

# Install with development dependencies
uv sync --extra dev
```

## Running Locally

### 1. Set up environment

- Copy `.env.example` to `.env` and fill in required variables for the app
- Copy `.env.tasks.example` to `.env.tasks` and fill in required variables for tasks (if running tasks separately)
- Set up database (PostgreSQL)

### 2. Initialize PostgreSQL database

```bash
docker run -it --rm -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password postgres:latest
uv run alembic -x url=postgresql://postgres:password@localhost:5432 upgrade head
```

### 3. (Optional) Set up MinIO for storage

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server --console-address ":9001" /data
```

MinIO will be available at:
- API: `http://localhost:9000`
- Console: `http://localhost:9001`

You'll need to create the `neuroagent` bucket. You can either:
- Use the MinIO Console UI at `http://localhost:9001` (login with minioadmin/minioadmin)
- Or use the MinIO CLI:
```bash
docker exec <container_id> mc mb /data/neuroagent
```

### 4. Set up Redis

Redis is **required** for:
- Rate limiting (app component)
- Celery message broker (tasks component)

```bash
docker run -d -p 6379:6379 redis
```

### 5. (Optional) MCP server secrets

MCP server secrets can be configured in the `.env` file. Their keys follow the following naming convention:
`NEUROAGENT_MCP__SECRETS__${secret_name}=${secret_value}`

The servers in use are defined in the file `mcp.json`. The potential secrets that can be set are also displayed in this file.

### 6. Running the Components

#### Running the App

Start the FastAPI server:
```bash
uv run neuroagent-api
```

Or with custom host/port:
```bash
uv run neuroagent-api --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

#### Running the Tasks Worker

**To run the Celery tasks worker manually**, use:

```bash
uv run celery -A neuroagent.tasks.main worker -Q python_q,circuit_q
```

Example with additional options via the command line:
```bash
uv run celery -A neuroagent.tasks.main worker -Q python_q,circuit_q --loglevel=info --concurrency=4
```

Note that one can also set Celery options via environment variables `TASKS_CELERY__{option_name}` in the `.env.tasks` file.

## Architecture: App vs Tasks

The backend is split into two independent components:

### App Component

- **Location**: `src/neuroagent/app/`
- **Purpose**: FastAPI web application
- **Dependencies**: Installed via `uv sync --extra app`
- **Entry point**: `neuroagent-api` command (defined in `pyproject.toml`)
- **Configuration**: `.env` file with `NEUROAGENT_` prefix
- **Features**: HTTP API, authentication, database, rate limiting, tool routing

### Tasks Component

- **Location**: `src/neuroagent/tasks/`
- **Purpose**: Celery workers for background task execution
- **Dependencies**: Installed via `uv sync --extra tasks`
- **Entry point**: `celery -A neuroagent.tasks.main worker`
- **Configuration**: `.env.tasks` file with `TASKS_` prefix
- **Features**: Python code execution, circuit analysis, data processing

### Import Restrictions

The app and tasks components are independent:
- Tasks can import from `neuroagent` but **cannot** import from `neuroagent.app` or its subfolders
- App can import from `neuroagent` but **cannot** import from `neuroagent.tasks` or its subfolders

## Testing

```bash
uv run pytest
```
