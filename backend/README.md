# Backend

## Installation
```bash
pip install -e .
```

## Running Locally

1. Set up environment:
   - Copy `.env.example` to `.env` and fill in required variables
   - Set up database (SQLite or PostgreSQL)

2. Initialize SQLite database (if using SQLite):
```bash
touch sqlite.db
alembic -x url=sqlite:///sqlite.db upgrade head
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

Note: Rate limiting is skipped for users with specific virtual lab and project access.

5. Start the server:
```bash
neuroagent-api
```

The API will be available at `http://localhost:8000`
