# Docker Configuration for Neuroagent TypeScript Backend

This document describes the Docker setup for the Neuroagent TypeScript backend, a Next.js-based API application.

## Overview

The TypeScript backend is containerized using a multi-stage Docker build that:

- Minimizes image size using Alpine Linux
- Separates build and runtime dependencies
- Uses Next.js standalone output for optimal production builds
- Includes Prisma client generation and database migrations
- Runs as a non-root user for security
- Includes health checks for container orchestration

## Architecture

### Multi-Stage Build

The Dockerfile uses three stages:

1. **deps**: Installs production dependencies only
2. **builder**: Builds the application with all dependencies
3. **runner**: Creates minimal production image with only runtime requirements

### Port Configuration

- **Container Port**: 8079
- **Host Port**: 8079 (configurable in docker-compose.yml)

This differs from the frontend (port 3000) and Python backend (port 8078) to avoid conflicts.

## Building the Image

### Local Build

```bash
cd backend-ts
docker build -t neuroagent-backend-ts:latest .
```

### Build with Docker Compose

```bash
# Build only the TypeScript backend
docker compose build backend-ts

# Build all services
docker compose build
```

## Running the Container

### Using Docker Compose (Recommended)

```bash
# Start all services including TypeScript backend
docker compose up

# Start only TypeScript backend and its dependencies
docker compose up backend-ts postgres minio redis

# Start in detached mode
docker compose up -d backend-ts

# View logs
docker compose logs -f backend-ts
```

### Using Docker Run

```bash
docker run -d \
  --name neuroagent-backend-ts \
  -p 8079:8079 \
  -e DATABASE_URL=postgresql://postgres:pwd@postgres:5432/neuroagent \
  -e NODE_ENV=production \
  --network app-network \
  neuroagent-backend-ts:latest
```

## Environment Variables

### Required Variables

The following environment variables must be set:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# LLM Configuration
NEUROAGENT_LLM__OPENAI_TOKEN=your_openai_token
NEUROAGENT_LLM__OPENROUTER_TOKEN=your_openrouter_token

# Storage (MinIO/S3)
NEUROAGENT_STORAGE__ENDPOINT_URL=http://minio:9000
NEUROAGENT_STORAGE__ACCESS_KEY=minioadmin
NEUROAGENT_STORAGE__SECRET_KEY=minioadmin
NEUROAGENT_STORAGE__BUCKET_NAME=neuroagent

# Rate Limiting (Redis)
NEUROAGENT_RATE_LIMITER__REDIS_HOST=redis
NEUROAGENT_RATE_LIMITER__REDIS_PORT=6379
```

### Optional Variables

```bash
# Agent Configuration
NEUROAGENT_AGENT__MODEL=simple
NEUROAGENT_AGENT__MAX_TURNS=10
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=10

# LLM Models
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4
NEUROAGENT_LLM__SUGGESTION_MODEL=gpt-3.5-turbo
NEUROAGENT_LLM__TEMPERATURE=1.0

# Keycloak Authentication
NEUROAGENT_KEYCLOAK__ISSUER=https://your-keycloak-instance
NEUROAGENT_KEYCLOAK__VALIDATE_TOKEN=true

# Disable Features
NEUROAGENT_RATE_LIMITER__DISABLED=false
NEUROAGENT_ACCOUNTING__DISABLED=true
```

### Environment File

Create a `.env` file in the `backend-ts` directory:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Database Migrations

### Automatic Migrations

The Docker entrypoint script automatically runs Prisma migrations on container startup:

```bash
npx prisma migrate deploy
```

### Manual Migrations

To run migrations manually:

```bash
# Inside the container
docker compose exec backend-ts npx prisma migrate deploy

# Or using docker exec
docker exec neuroagent-backend-ts npx prisma migrate deploy
```

### Creating New Migrations

Migrations should be created in development, not in Docker:

```bash
# In development (outside Docker)
cd backend-ts
npm run db:migrate -- --name your_migration_name
```

## Health Checks

The container includes a health check that verifies the API is responding:

```bash
# Check health status
docker compose ps backend-ts

# View health check logs
docker inspect --format='{{json .State.Health}}' neuroagent-backend-ts | jq
```

The health check:

- **Endpoint**: `GET /api/healthz`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Start Period**: 40 seconds (allows time for migrations)
- **Retries**: 3

## Troubleshooting

### Container Won't Start

1. **Check logs**:

   ```bash
   docker compose logs backend-ts
   ```

2. **Verify database connection**:

   ```bash
   docker compose exec backend-ts npx prisma db execute --stdin <<< "SELECT 1"
   ```

3. **Check environment variables**:
   ```bash
   docker compose exec backend-ts env | grep NEUROAGENT
   ```

### Database Connection Issues

1. **Ensure PostgreSQL is running**:

   ```bash
   docker compose ps postgres
   ```

2. **Check DATABASE_URL format**:

   ```
   postgresql://user:password@host:port/database
   ```

3. **Verify network connectivity**:
   ```bash
   docker compose exec backend-ts ping postgres
   ```

### Migration Failures

1. **Check migration status**:

   ```bash
   docker compose exec backend-ts npx prisma migrate status
   ```

2. **Reset database (development only)**:

   ```bash
   docker compose exec backend-ts npx prisma migrate reset
   ```

3. **View migration history**:
   ```bash
   docker compose exec postgres psql -U postgres -d neuroagent -c "SELECT * FROM _prisma_migrations;"
   ```

### Build Failures

1. **Clear Docker cache**:

   ```bash
   docker compose build --no-cache backend-ts
   ```

2. **Check Prisma schema**:

   ```bash
   npx prisma validate
   ```

3. **Verify dependencies**:
   ```bash
   npm ci
   ```

## Performance Optimization

### Image Size

The multi-stage build produces a minimal image:

- Base image: `node:18-alpine` (~40MB)
- Final image: ~200-300MB (includes Next.js standalone output and Prisma client)

### Build Cache

To optimize build times:

1. Package files are copied before source code
2. Prisma schema is copied separately for better caching
3. `.dockerignore` excludes unnecessary files

### Runtime Performance

- Uses Next.js standalone output (minimal dependencies)
- Runs as non-root user (security)
- Uses `dumb-init` for proper signal handling
- Includes health checks for orchestration

## Security Considerations

### Non-Root User

The container runs as user `nextjs` (UID 1001) for security:

```dockerfile
USER nextjs
```

### Read-Only Filesystem

For enhanced security, you can run with a read-only filesystem:

```yaml
services:
  backend-ts:
    read_only: true
    tmpfs:
      - /tmp:exec,mode=1777
      - /app/.next/cache:exec,mode=1777
```

### Secrets Management

Never commit secrets to the repository:

- Use `.env` files (gitignored)
- Use Docker secrets in production
- Use environment variables from orchestration platform

## Production Deployment

### Docker Compose Production

```bash
# Use production compose file
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes

Example Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neuroagent-backend-ts
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neuroagent-backend-ts
  template:
    metadata:
      labels:
        app: neuroagent-backend-ts
    spec:
      containers:
        - name: backend-ts
          image: neuroagent-backend-ts:latest
          ports:
            - containerPort: 8079
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: neuroagent-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /api/healthz
              port: 8079
            initialDelaySeconds: 40
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/healthz
              port: 8079
            initialDelaySeconds: 10
            periodSeconds: 10
```

### Resource Limits

Recommended resource limits:

```yaml
services:
  backend-ts:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Monitoring

### Logs

```bash
# Follow logs
docker compose logs -f backend-ts

# View last 100 lines
docker compose logs --tail=100 backend-ts

# Export logs
docker compose logs backend-ts > backend-ts.log
```

### Metrics

The container exposes metrics through:

- Health check endpoint: `/api/healthz`
- Settings endpoint: `/api/settings`

### Debugging

To debug inside the container:

```bash
# Open shell
docker compose exec backend-ts sh

# Check Node.js version
docker compose exec backend-ts node --version

# Check Prisma version
docker compose exec backend-ts npx prisma --version

# Test database connection
docker compose exec backend-ts npx prisma db execute --stdin <<< "SELECT version();"
```

## Development vs Production

### Development

In development, use the local development server:

```bash
npm run dev
```

This provides:

- Hot module reloading
- Better error messages
- Source maps
- Development logging

### Production

In production, use Docker:

```bash
docker compose up -d backend-ts
```

This provides:

- Optimized build
- Minimal image size
- Security hardening
- Health checks
- Automatic restarts

## Comparison with Python Backend

| Feature      | Python Backend | TypeScript Backend |
| ------------ | -------------- | ------------------ |
| Port         | 8078           | 8079               |
| Framework    | FastAPI        | Next.js            |
| Base Image   | python:3.11    | node:18-alpine     |
| Image Size   | ~1.5GB         | ~250MB             |
| Migrations   | Alembic        | Prisma             |
| Health Check | /healthz       | /api/healthz       |

## References

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Alpine Linux](https://alpinelinux.org/)
