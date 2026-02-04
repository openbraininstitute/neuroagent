# Docker Deployment Guide

This guide covers Docker deployment for the Neuroagent TypeScript Backend.

## Quick Links

- **Quick Start**: [DOCKER-QUICKSTART.md](./DOCKER-QUICKSTART.md) - Common commands and workflows
- **Full Documentation**: [DOCKER.md](./DOCKER.md) - Comprehensive Docker documentation
- **Test Script**: Run `./test-docker.sh` to verify Docker configuration

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later
- At least 4GB RAM available for Docker
- PostgreSQL, Redis, and MinIO (provided via docker-compose)

## Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEUROAGENT_LLM__OPENAI_TOKEN` - OpenAI API key
- `NEUROAGENT_STORAGE__*` - MinIO/S3 configuration
- `NEUROAGENT_RATE_LIMITER__*` - Redis configuration

### 2. Build and Start

```bash
# From project root
docker compose up -d backend-ts

# Or build first
docker compose build backend-ts
docker compose up -d backend-ts
```

### 3. Verify Deployment

```bash
# Check container status
docker compose ps backend-ts

# View logs
docker compose logs -f backend-ts

# Test health endpoint
curl http://localhost:8079/api/healthz
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Architecture

### Multi-Stage Build

The Dockerfile uses three stages for optimal image size:

1. **deps** - Production dependencies only
2. **builder** - Build application with all dependencies
3. **runner** - Minimal runtime image (~352MB)

### Key Features

- ✅ Next.js standalone output for minimal size
- ✅ Prisma client generation during build
- ✅ Automatic database migrations on startup
- ✅ Non-root user (nextjs:1001) for security
- ✅ Health checks for container orchestration
- ✅ Signal handling with dumb-init
- ✅ Multi-stage build for optimization

## Configuration

### Port Mapping

- **Container Port**: 8079
- **Host Port**: 8079 (configurable)

This differs from:

- Frontend: 3000
- Python Backend: 8078

### Environment Variables

See [.env.example](./.env.example) for all available variables.

Critical variables:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_STORAGE__ENDPOINT_URL=http://minio:9000
NEUROAGENT_RATE_LIMITER__REDIS_HOST=redis
NODE_ENV=production
```

### Volume Mounts

No volumes are required for the backend-ts service. Data is stored in:

- PostgreSQL (postgres_data volume)
- MinIO (minio_data volume)
- Redis (redis_data volume)

## Database Migrations

### Automatic Migrations

Migrations run automatically on container startup via `docker-entrypoint.sh`:

```bash
npx prisma migrate deploy
```

### Manual Migrations

```bash
# Run migrations manually
docker compose exec backend-ts npx prisma migrate deploy

# Check migration status
docker compose exec backend-ts npx prisma migrate status

# View migration history
docker compose exec postgres psql -U postgres -d neuroagent \
  -c "SELECT * FROM _prisma_migrations;"
```

### Creating Migrations

Create migrations in development (not in Docker):

```bash
# Outside Docker
npm run db:migrate -- --name your_migration_name

# Commit the migration files
git add prisma/migrations/
git commit -m "Add migration: your_migration_name"
```

## Health Checks

The container includes built-in health checks:

```yaml
healthcheck:
  test: ['CMD', 'node', '-e', "require('http').get(...)"]
  interval: 30s
  timeout: 10s
  start_period: 40s
  retries: 3
```

Check health status:

```bash
# Via Docker
docker compose ps backend-ts

# Via API
curl http://localhost:8079/api/healthz

# Detailed health info
docker inspect --format='{{json .State.Health}}' neuroagent-backend-ts-1 | jq
```

## Troubleshooting

### Container Won't Start

1. Check logs:

   ```bash
   docker compose logs backend-ts
   ```

2. Verify dependencies:

   ```bash
   docker compose ps postgres redis minio
   ```

3. Check environment:
   ```bash
   docker compose exec backend-ts env | grep NEUROAGENT
   ```

### Database Connection Failed

1. Test connection:

   ```bash
   docker compose exec backend-ts npx prisma db execute --stdin <<< "SELECT 1"
   ```

2. Verify DATABASE_URL:

   ```bash
   docker compose exec backend-ts env | grep DATABASE_URL
   ```

3. Check PostgreSQL:
   ```bash
   docker compose ps postgres
   docker compose logs postgres
   ```

### Migration Failed

1. Check status:

   ```bash
   docker compose exec backend-ts npx prisma migrate status
   ```

2. View migration logs:

   ```bash
   docker compose logs backend-ts | grep -i migration
   ```

3. Reset database (development only):
   ```bash
   docker compose exec backend-ts npx prisma migrate reset
   ```

### Build Failed

1. Clear cache:

   ```bash
   docker compose build --no-cache backend-ts
   ```

2. Check disk space:

   ```bash
   docker system df
   ```

3. Prune old images:
   ```bash
   docker image prune -a
   ```

## Testing

### Run Test Script

```bash
cd backend-ts
./test-docker.sh
```

This validates:

- Docker installation
- Dockerfile configuration
- Multi-stage build
- Security best practices
- Prisma configuration
- Next.js configuration

### Manual Testing

```bash
# Build image
docker build -t neuroagent-backend-ts:test .

# Inspect image
docker inspect neuroagent-backend-ts:test

# Check image size
docker images neuroagent-backend-ts:test

# Test container (requires dependencies)
docker compose up -d backend-ts
docker compose logs -f backend-ts
curl http://localhost:8079/api/healthz
```

## Production Deployment

### Using Production Compose File

```bash
# Start with production settings
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View configuration
docker compose -f docker-compose.yml -f docker-compose.prod.yml config backend-ts
```

Production features:

- Resource limits (2 CPU, 2GB RAM)
- Read-only filesystem
- Log rotation
- Restart policies
- Optimized PostgreSQL settings

### Security Checklist

- [x] Runs as non-root user (nextjs:1001)
- [x] Multi-stage build minimizes attack surface
- [x] No secrets in image or repository
- [x] Health checks enabled
- [ ] Use HTTPS in production (configure reverse proxy)
- [ ] Enable authentication for Redis
- [ ] Use strong PostgreSQL passwords
- [ ] Rotate MinIO access keys
- [ ] Enable read-only filesystem (see docker-compose.prod.yml)

### Monitoring

```bash
# View logs
docker compose logs -f backend-ts

# Check resource usage
docker stats neuroagent-backend-ts-1

# Export logs
docker compose logs backend-ts > backend-ts.log

# Monitor health
watch -n 5 'curl -s http://localhost:8079/api/healthz | jq'
```

## Performance

### Image Size

- Base image: node:18-alpine (~40MB)
- Final image: ~352MB
- Includes: Next.js standalone + Prisma client

### Build Time

- First build: ~2-3 minutes
- Cached builds: ~30 seconds
- Layer caching optimizes rebuilds

### Runtime Performance

- Startup time: ~10-15 seconds (including migrations)
- Memory usage: ~200-500MB (depends on load)
- CPU usage: Minimal at idle, scales with requests

### Optimization Tips

1. **Use BuildKit**:

   ```bash
   export DOCKER_BUILDKIT=1
   docker compose build backend-ts
   ```

2. **Leverage cache**:
   - Don't change package.json unnecessarily
   - Copy files in optimal order (see Dockerfile)

3. **Resource limits**:
   - Set appropriate limits in docker-compose.prod.yml
   - Monitor with `docker stats`

## Comparison with Python Backend

| Feature      | Python Backend | TypeScript Backend |
| ------------ | -------------- | ------------------ |
| Port         | 8078           | 8079               |
| Framework    | FastAPI        | Next.js            |
| Base Image   | python:3.11    | node:18-alpine     |
| Image Size   | ~1.5GB         | ~352MB             |
| Build Time   | ~5 min         | ~2-3 min           |
| Migrations   | Alembic        | Prisma             |
| Health Check | /healthz       | /api/healthz       |

## Development Workflow

### Local Development (Recommended)

```bash
# Use local dev server (not Docker)
npm run dev
```

Benefits:

- Hot module reloading
- Better error messages
- Faster iteration

### Docker Development

```bash
# Build and start
docker compose up -d backend-ts

# Make changes
# ... edit files ...

# Rebuild and restart
docker compose build backend-ts
docker compose up -d backend-ts

# View logs
docker compose logs -f backend-ts
```

## Additional Resources

- [DOCKER.md](./DOCKER.md) - Full Docker documentation
- [DOCKER-QUICKSTART.md](./DOCKER-QUICKSTART.md) - Quick reference
- [.env.example](./.env.example) - Environment variables
- [../docker-compose.yml](../docker-compose.yml) - Service configuration
- [../docker-compose.prod.yml](../docker-compose.prod.yml) - Production overrides

## Support

For issues:

1. Run test script: `./test-docker.sh`
2. Check logs: `docker compose logs backend-ts`
3. Verify config: `docker compose config backend-ts`
4. Test health: `curl http://localhost:8079/api/healthz`
5. Review documentation in DOCKER.md

## Next Steps

1. ✅ Configure environment variables
2. ✅ Build Docker image
3. ✅ Start services
4. ✅ Verify health endpoint
5. ✅ Test API endpoints
6. ✅ Monitor logs
7. ✅ Set up production deployment
