# Backend

## Installation
```bash
pip install -e .
```

## Running Locally

1. Set up environment:
   - Copy `.env.example` to `.env` and fill in required variables
   - Set up database (PostgreSQL)

2. Initialize PostgreSQL database:
```bash
docker run -it --rm -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password postgres:latest
alembic -x url=postgresql://postgres:password@localhost:5432 upgrade head
```

3. (Optional) Set up MinIO for storage:
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

4. (Optional) Set up Redis for rate limiting:
```bash
docker run -d -p 6379:6379 redis
```

Rate limiting can be configured in the `.env` file:
```bash
# Redis connection
NEUROAGENT_RATE_LIMITER__REDIS_HOST=localhost
NEUROAGENT_RATE_LIMITER__REDIS_PORT=6379

# Rate limits (per 24h by default)
NEUROAGENT_RATE_LIMITER__LIMIT_CHAT=10          # Max chat requests
NEUROAGENT_RATE_LIMITER__LIMIT_SUGGESTIONS=100  # Max suggestion requests

# Disable rate limiting entirely
NEUROAGENT_RATE_LIMITER__DISABLED=true
```

5. (Optional) MCP server secrets can also be configured in the `.env` file.
Their keys follow the following naming convention:
`NEUROAGENT_MCP__SECRETS__${secret_name}=${secret_value}`
The servers in use are defined in the file `mcp.json`.
The potential secrets that can be set are also displayed in this file.

**Note:** MCP is disabled by default (`NEUROAGENT_MCP__SKIP_INIT=true`). To enable MCP tools, set `NEUROAGENT_MCP__SKIP_INIT=false` in `.env` (adds ~2min to startup).

6. Start the server:
```bash
neuroagent-api
```

The API will be available at `http://localhost:8000`
