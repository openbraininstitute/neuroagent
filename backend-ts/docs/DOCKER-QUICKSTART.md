# Docker Quick Start Guide

Quick reference for common Docker operations with the Neuroagent TypeScript backend.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for Docker

## Quick Start

### 1. Start All Services

```bash
# From project root
docker compose up -d

# View logs
docker compose logs -f backend-ts
```

### 2. Initialize MinIO Bucket (First Time Only)

```bash
# Create bucket
docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin
docker exec -it neuroagent-minio-1 mc mb myminio/neuroagent
```

### 3. Verify Services

```bash
# Check all services are running
docker compose ps

# Test TypeScript backend health
curl http://localhost:8079/api/healthz

# Test Python backend health (if running)
curl http://localhost:8078/healthz
```

## Common Commands

### Building

```bash
# Build TypeScript backend only
docker compose build backend-ts

# Build with no cache (clean build)
docker compose build --no-cache backend-ts

# Build all services
docker compose build
```

### Starting/Stopping

```bash
# Start services
docker compose up -d backend-ts

# Stop services
docker compose stop backend-ts

# Restart services
docker compose restart backend-ts

# Remove containers (keeps volumes)
docker compose down

# Remove containers and volumes (DESTRUCTIVE)
docker compose down -v
```

### Logs

```bash
# Follow logs
docker compose logs -f backend-ts

# Last 100 lines
docker compose logs --tail=100 backend-ts

# All logs since timestamp
docker compose logs --since 2024-01-01T00:00:00 backend-ts
```

### Database Operations

```bash
# Run migrations
docker compose exec backend-ts npx prisma migrate deploy

# Check migration status
docker compose exec backend-ts npx prisma migrate status

# Open Prisma Studio (database GUI)
docker compose exec backend-ts npx prisma studio

# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d neuroagent

# Backup database
docker compose exec postgres pg_dump -U postgres neuroagent > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres neuroagent < backup.sql
```

### Debugging

```bash
# Open shell in container
docker compose exec backend-ts sh

# Check environment variables
docker compose exec backend-ts env | grep NEUROAGENT

# Test database connection
docker compose exec backend-ts npx prisma db execute --stdin <<< "SELECT 1"

# View container details
docker inspect neuroagent-backend-ts-1

# Check resource usage
docker stats neuroagent-backend-ts-1
```

### Cleanup

```bash
# Remove stopped containers
docker compose rm backend-ts

# Remove unused images
docker image prune

# Remove all unused resources
docker system prune -a

# Remove specific image
docker rmi neuroagent-backend-ts:test
```

## Development Workflow

### 1. Make Code Changes

Edit files in `backend-ts/src/`

### 2. Rebuild and Restart

```bash
# Rebuild image
docker compose build backend-ts

# Restart container
docker compose up -d backend-ts

# Watch logs
docker compose logs -f backend-ts
```

### 3. Test Changes

```bash
# Test health endpoint
curl http://localhost:8079/api/healthz

# Test API endpoint
curl -X POST http://localhost:8079/api/qa/chat_streamed/YOUR_THREAD_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content": "Hello"}'
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker compose logs backend-ts

# Check if port is already in use
lsof -i :8079

# Verify dependencies are running
docker compose ps postgres redis minio
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection from backend
docker compose exec backend-ts npx prisma db execute --stdin <<< "SELECT 1"

# Check DATABASE_URL
docker compose exec backend-ts env | grep DATABASE_URL
```

### Migration Failed

```bash
# Check migration status
docker compose exec backend-ts npx prisma migrate status

# View migration history
docker compose exec postgres psql -U postgres -d neuroagent -c "SELECT * FROM _prisma_migrations;"

# Reset database (DESTRUCTIVE - development only)
docker compose exec backend-ts npx prisma migrate reset
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Recommended: 4GB minimum, 8GB preferred
```

### Build Fails

```bash
# Clear build cache
docker compose build --no-cache backend-ts

# Remove old images
docker image prune -a

# Check disk space
docker system df
```

## Port Reference

| Service       | Port | Description            |
| ------------- | ---- | ---------------------- |
| backend-ts    | 8079 | TypeScript Backend API |
| backend       | 8078 | Python Backend API     |
| frontend      | 3000 | Next.js Frontend       |
| postgres      | 5432 | PostgreSQL Database    |
| minio         | 9000 | MinIO S3 API           |
| minio-console | 9001 | MinIO Web Console      |
| redis         | 6379 | Redis Cache            |

## Environment Files

### Development

```bash
# Copy example file
cp backend-ts/.env.example backend-ts/.env

# Edit with your values
nano backend-ts/.env
```

### Production

Use environment variables from your orchestration platform:

- Kubernetes: ConfigMaps and Secrets
- Docker Swarm: Docker Secrets
- Cloud platforms: Environment variable configuration

## Health Check Status

```bash
# Check health status
docker compose ps backend-ts

# View health check details
docker inspect --format='{{json .State.Health}}' neuroagent-backend-ts-1 | jq

# Health check endpoint
curl http://localhost:8079/api/healthz
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Performance Tips

1. **Use BuildKit**: Enable Docker BuildKit for faster builds

   ```bash
   export DOCKER_BUILDKIT=1
   docker compose build backend-ts
   ```

2. **Layer Caching**: Don't change package.json unless necessary

3. **Multi-Stage Builds**: Already optimized in Dockerfile

4. **Resource Limits**: Set appropriate limits in docker-compose.yml
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Use strong passwords for PostgreSQL
- [ ] Rotate MinIO access keys
- [ ] Use HTTPS in production
- [ ] Enable authentication for Redis
- [ ] Run containers as non-root user (already configured)
- [ ] Use read-only filesystem where possible
- [ ] Keep base images updated

## Next Steps

- Read [DOCKER.md](./DOCKER.md) for detailed documentation
- Review [.env.example](./.env.example) for all configuration options
- Check [README.md](./README.md) for development setup
- See [../docker-compose.yml](../docker-compose.yml) for full stack configuration

## Support

For issues:

1. Check logs: `docker compose logs backend-ts`
2. Verify configuration: `docker compose config backend-ts`
3. Test health: `curl http://localhost:8079/api/healthz`
4. Review documentation in DOCKER.md
