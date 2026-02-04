# Deployment Guide

This guide covers deploying the Neuroagent TypeScript backend to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Build Process](#build-process)
- [Deployment Methods](#deployment-methods)
  - [Docker Deployment](#docker-deployment)
  - [Standalone Deployment](#standalone-deployment)
  - [Cloud Platform Deployment](#cloud-platform-deployment)
- [Database Migrations](#database-migrations)
- [Health Checks](#health-checks)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **PostgreSQL**: 15 or higher
- **Redis**: 7.0 or higher (optional, for rate limiting)
- **MinIO/S3**: For file storage (optional)

### Required Services

1. **PostgreSQL Database**
   - Database created and accessible
   - Connection string available
   - Sufficient permissions for migrations

2. **Authentication Provider**
   - Keycloak instance configured
   - Realm and client created
   - JWKS endpoint accessible

3. **LLM Provider** (at least one)
   - OpenAI API key, or
   - OpenRouter API key

### Optional Services

- **Redis**: For rate limiting
- **MinIO/S3**: For file storage
- **Monitoring**: Prometheus, Grafana, or similar

## Environment Configuration

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Copy template
cp .env.example .env
```

### Core Configuration

```env
# Node Environment
NODE_ENV=production

# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/neuroagent

# LLM Provider (At least one required)
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_LLM__OPENROUTER_TOKEN=sk-or-...
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4
NEUROAGENT_LLM__SUGGESTION_MODEL=gpt-3.5-turbo
NEUROAGENT_LLM__TEMPERATURE=1

# Authentication (Required)
NEUROAGENT_KEYCLOAK__ISSUER=https://keycloak.example.com/realms/myrealm
NEUROAGENT_KEYCLOAK__VALIDATE_TOKEN=true

# Agent Configuration
NEUROAGENT_AGENT__MODEL=simple
NEUROAGENT_AGENT__MAX_TURNS=10
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=10
```

### Optional Configuration

```env
# Rate Limiting (Redis)
NEUROAGENT_RATE_LIMITER__DISABLED=false
NEUROAGENT_RATE_LIMITER__REDIS_HOST=redis.example.com
NEUROAGENT_RATE_LIMITER__REDIS_PORT=6379
NEUROAGENT_RATE_LIMITER__REDIS_PASSWORD=
NEUROAGENT_RATE_LIMITER__REDIS_SSL=true
NEUROAGENT_RATE_LIMITER__LIMIT_CHAT=20
NEUROAGENT_RATE_LIMITER__EXPIRY_CHAT=86400

# Storage (MinIO/S3)
NEUROAGENT_STORAGE__ENDPOINT_URL=https://s3.amazonaws.com
NEUROAGENT_STORAGE__BUCKET_NAME=neuroagent-prod
NEUROAGENT_STORAGE__ACCESS_KEY=...
NEUROAGENT_STORAGE__SECRET_KEY=...
NEUROAGENT_STORAGE__EXPIRY=3600

# Tools
NEUROAGENT_TOOLS__EXA_API_KEY=...
NEUROAGENT_TOOLS__ENTITYCORE__URL=https://api.example.com/entitycore
NEUROAGENT_TOOLS__ENTITYCORE__TOKEN=...
NEUROAGENT_TOOLS__OBI_ONE__URL=https://api.example.com/obione
NEUROAGENT_TOOLS__OBI_ONE__TOKEN=...
NEUROAGENT_TOOLS__FRONTEND_BASE_URL=https://neuroagent.example.com

# Accounting (Optional)
NEUROAGENT_ACCOUNTING__DISABLED=true
NEUROAGENT_ACCOUNTING__PROJECT_ID=...
NEUROAGENT_ACCOUNTING__SERVICE_ACCOUNT_EMAIL=...
NEUROAGENT_ACCOUNTING__PRIVATE_KEY=...
```

### Environment Variable Validation

The application validates all environment variables at startup. If required variables are missing or invalid, it will fail with a clear error message:

```
Error: Invalid environment configuration:
  - NEUROAGENT_LLM__OPENAI_TOKEN: Required
  - DATABASE_URL: Invalid format
```

## Build Process

### Production Build

```bash
# Install dependencies (production only)
npm ci --only=production

# Generate Prisma Client
npm run db:generate

# Build Next.js application
npm run build
```

The build process:

1. Compiles TypeScript to JavaScript
2. Optimizes and bundles code
3. Generates static assets
4. Creates standalone output in `.next/standalone/`

### Build Optimization

The `next.config.ts` is configured for production:

```typescript
{
  output: 'standalone',  // Minimal production bundle
  typescript: {
    ignoreBuildErrors: false,  // Fail on type errors
  },
  eslint: {
    ignoreDuringBuilds: false,  // Fail on lint errors
  },
}
```

### Build Artifacts

After building, the following directories are created:

- `.next/standalone/` - Standalone server bundle
- `.next/static/` - Static assets (CSS, JS, images)
- `node_modules/.prisma/` - Generated Prisma Client

## Deployment Methods

### Docker Deployment

**Recommended for production**

#### Single Container

```bash
# Build image
docker build -t neuroagent-backend-ts:latest .

# Run container
docker run -d \
  --name neuroagent-backend \
  -p 8079:8079 \
  --env-file .env \
  --restart unless-stopped \
  neuroagent-backend-ts:latest
```

#### Docker Compose (Full Stack)

```bash
# Start all services
docker-compose up -d backend-ts postgres redis minio

# View logs
docker-compose logs -f backend-ts

# Stop services
docker-compose down
```

#### Docker Compose Configuration

The `docker-compose.yml` includes:

```yaml
backend-ts:
  build:
    context: ./backend-ts
    dockerfile: Dockerfile
  ports:
    - '8079:8079'
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://postgres:pwd@postgres:5432/neuroagent
  depends_on:
    - postgres
    - redis
    - minio
  healthcheck:
    test:
      [
        'CMD',
        'node',
        '-e',
        "require('http').get('http://localhost:8079/api/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
      ]
    interval: 30s
    timeout: 10s
    start_period: 40s
    retries: 3
  restart: unless-stopped
```

#### Multi-Stage Docker Build

The Dockerfile uses multi-stage builds for optimization:

1. **deps**: Install production dependencies
2. **builder**: Build application with all dependencies
3. **runner**: Minimal runtime image with only necessary files

**Image size**: ~200-300MB (vs ~1GB+ without optimization)

### Standalone Deployment

For deployment without Docker:

#### 1. Prepare Server

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2
```

#### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-org/neuroagent.git
cd neuroagent/backend-ts

# Install dependencies
npm ci --only=production

# Generate Prisma Client
npm run db:generate

# Build application
npm run build

# Run database migrations
npm run db:migrate:deploy
```

#### 3. Start with PM2

```bash
# Start application
pm2 start npm --name "neuroagent-backend" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 4. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.neuroagent.example.com;

    location / {
        proxy_pass http://localhost:8079;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Streaming support
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

### Cloud Platform Deployment

#### Vercel

**Note**: Vercel is optimized for Next.js but may have limitations for long-running API routes.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Considerations**:

- Serverless function timeout limits (10s hobby, 60s pro)
- Streaming responses work but may have limits
- Database connection pooling required (use Prisma Data Proxy)

#### AWS ECS/Fargate

1. **Build and push Docker image**:

```bash
# Build image
docker build -t neuroagent-backend-ts .

# Tag for ECR
docker tag neuroagent-backend-ts:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/neuroagent-backend-ts:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/neuroagent-backend-ts:latest
```

2. **Create ECS Task Definition**:

```json
{
  "family": "neuroagent-backend-ts",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/neuroagent-backend-ts:latest",
      "portMappings": [
        {
          "containerPort": 8079,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:8079/api/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

3. **Create ECS Service** with Application Load Balancer

#### Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/neuroagent-backend-ts

# Deploy to Cloud Run
gcloud run deploy neuroagent-backend-ts \
  --image gcr.io/PROJECT_ID/neuroagent-backend-ts \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8079 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest
```

#### Kubernetes

See `k8s/` directory for Kubernetes manifests (if available), or create:

1. **Deployment**:

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
        - name: backend
          image: neuroagent-backend-ts:latest
          ports:
            - containerPort: 8079
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: neuroagent-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /api/healthz
              port: 8079
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/healthz
              port: 8079
            initialDelaySeconds: 10
            periodSeconds: 5
```

2. **Service**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: neuroagent-backend-ts
spec:
  selector:
    app: neuroagent-backend-ts
  ports:
    - port: 80
      targetPort: 8079
  type: LoadBalancer
```

## Database Migrations

### Production Migration Strategy

**CRITICAL**: Always backup database before running migrations in production.

#### 1. Backup Database

```bash
# PostgreSQL backup
pg_dump -h host -U user -d neuroagent > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Docker
docker exec postgres pg_dump -U postgres neuroagent > backup.sql
```

#### 2. Test Migrations

Test migrations in a staging environment first:

```bash
# Apply migrations to staging
npm run db:migrate:deploy

# Verify application works
curl http://staging.example.com/api/healthz

# Run smoke tests
npm test
```

#### 3. Apply to Production

```bash
# Apply migrations
npm run db:migrate:deploy

# Verify migration status
npx prisma migrate status
```

#### 4. Rollback (if needed)

If a migration fails:

```bash
# Restore from backup
psql -h host -U user -d neuroagent < backup.sql

# Or using Docker
docker exec -i postgres psql -U postgres neuroagent < backup.sql
```

### Zero-Downtime Migrations

For zero-downtime deployments:

1. **Backward-compatible migrations first**:
   - Add new columns as nullable
   - Add new tables
   - Don't drop columns/tables yet

2. **Deploy new application version**:
   - Application uses new schema
   - Old columns still exist

3. **Data migration** (if needed):
   - Run background job to migrate data
   - Verify data integrity

4. **Cleanup migration**:
   - Drop old columns/tables
   - Add NOT NULL constraints

### Migration in Docker

The `docker-entrypoint.sh` automatically runs migrations on container start:

```bash
# Migrations run automatically
docker-compose up backend-ts

# Or manually
docker exec backend-ts npm run db:migrate:deploy
```

## Health Checks

### Endpoints

#### `/api/healthz` - Liveness Probe

Returns 200 if application is running:

```bash
curl http://localhost:8079/api/healthz
# Response: { "status": "ok" }
```

Use for:

- Kubernetes liveness probes
- Docker health checks
- Load balancer health checks

#### `/api/` - Readiness Probe

Returns 200 if application is ready to serve traffic:

```bash
curl http://localhost:8079/api/
# Response: { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

Use for:

- Kubernetes readiness probes
- Deployment verification

#### `/api/settings` - Configuration Check

Returns application settings (non-sensitive):

```bash
curl http://localhost:8079/api/settings
# Response: { "agent": { "model": "simple", ... }, ... }
```

### Health Check Configuration

#### Docker

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8079/api/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

#### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /api/healthz
    port: 8079
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/
    port: 8079
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Monitoring and Logging

### Application Logs

#### Structured Logging

The application logs to stdout/stderr in JSON format:

```json
{
  "level": "info",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Server started",
  "port": 8079
}
```

#### Log Levels

- `error`: Application errors, exceptions
- `warn`: Warnings, deprecated features
- `info`: General information, startup messages
- `debug`: Detailed debugging information (development only)

#### Viewing Logs

```bash
# Docker
docker logs -f backend-ts

# Docker Compose
docker-compose logs -f backend-ts

# PM2
pm2 logs neuroagent-backend

# Kubernetes
kubectl logs -f deployment/neuroagent-backend-ts
```

### Metrics

#### Built-in Metrics

The application exposes metrics via:

- Request count
- Response times
- Error rates
- Database query times
- LLM API latency
- Token consumption

#### Prometheus Integration

Add Prometheus metrics endpoint (optional):

```typescript
// src/app/api/metrics/route.ts
import { NextRequest } from 'next/server';
import { register } from 'prom-client';

export async function GET(request: NextRequest) {
  const metrics = await register.metrics();
  return new Response(metrics, {
    headers: { 'Content-Type': register.contentType },
  });
}
```

### Error Tracking

#### Sentry Integration

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Error Logging

All errors are logged with context:

```typescript
console.error('Error processing request', {
  error: error.message,
  stack: error.stack,
  userId: userInfo.sub,
  threadId: params.thread_id,
});
```

### Performance Monitoring

#### Database Query Monitoring

Enable Prisma query logging:

```typescript
// src/lib/db/client.ts
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

#### LLM API Monitoring

Track LLM API calls:

```typescript
console.log('LLM API call', {
  model: agent.model,
  tokens: usage.totalTokens,
  duration: Date.now() - startTime,
  cost: calculateCost(usage),
});
```

## Security Considerations

### Environment Variables

**NEVER commit `.env` files to version control**

```bash
# Add to .gitignore
.env
.env.local
.env.production
```

Use secret management:

- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault
- HashiCorp Vault

### Database Security

1. **Use strong passwords**:

```env
DATABASE_URL=postgresql://user:$(openssl rand -base64 32)@host:5432/db
```

2. **Enable SSL/TLS**:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

3. **Restrict network access**:
   - Use VPC/private networks
   - Whitelist IP addresses
   - Use connection pooling

### API Security

1. **Rate Limiting**: Enabled by default with Redis

2. **CORS**: Configured in `next.config.ts`

```typescript
headers: [{ key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' }];
```

3. **Authentication**: JWT validation with Keycloak

4. **Input Validation**: Zod schemas for all inputs

### Container Security

1. **Non-root user**: Dockerfile uses `nextjs` user

2. **Read-only filesystem**: Docker Compose uses `read_only: true`

3. **Minimal base image**: Uses `node:18-alpine`

4. **Security scanning**:

```bash
# Scan Docker image
docker scan neuroagent-backend-ts:latest

# Scan dependencies
npm audit
npm audit fix
```

### HTTPS/TLS

Always use HTTPS in production:

1. **Reverse Proxy** (Nginx, Traefik):

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8079;
    }
}
```

2. **Load Balancer** (AWS ALB, GCP Load Balancer):
   - Configure SSL certificate
   - Enable HTTP to HTTPS redirect

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms**: Container exits immediately, or server fails to start

**Diagnosis**:

```bash
# Check logs
docker logs backend-ts

# Check environment variables
docker exec backend-ts env | grep NEUROAGENT
```

**Solutions**:

- Verify all required environment variables are set
- Check DATABASE_URL format
- Ensure database is accessible
- Verify Prisma Client is generated

#### 2. Database Connection Errors

**Symptoms**: `Error: Can't reach database server`

**Diagnosis**:

```bash
# Test database connection
psql $DATABASE_URL

# Check network connectivity
docker exec backend-ts ping postgres
```

**Solutions**:

- Verify DATABASE_URL is correct
- Check database is running
- Verify network connectivity
- Check firewall rules
- Increase connection timeout

#### 3. Migration Failures

**Symptoms**: `Migration failed to apply`

**Diagnosis**:

```bash
# Check migration status
npx prisma migrate status

# View migration history
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations;"
```

**Solutions**:

- Restore from backup
- Manually fix database schema
- Mark migration as applied: `npx prisma migrate resolve --applied <migration_name>`
- Roll forward with new migration

#### 4. High Memory Usage

**Symptoms**: Container OOM killed, high memory consumption

**Diagnosis**:

```bash
# Check memory usage
docker stats backend-ts

# Check Node.js heap
docker exec backend-ts node -e "console.log(process.memoryUsage())"
```

**Solutions**:

- Increase container memory limit
- Optimize database queries
- Reduce connection pool size
- Enable garbage collection: `NODE_OPTIONS="--max-old-space-size=2048"`

#### 5. Slow Response Times

**Symptoms**: API requests take >5 seconds

**Diagnosis**:

```bash
# Enable query logging
# Check Prisma logs for slow queries

# Profile API endpoint
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8079/api/endpoint
```

**Solutions**:

- Add database indexes
- Optimize queries (use `select` to limit fields)
- Enable Redis caching
- Increase database connection pool
- Use CDN for static assets

#### 6. Authentication Failures

**Symptoms**: `401 Unauthorized` errors

**Diagnosis**:

```bash
# Verify JWT token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8079/api/healthz

# Check Keycloak configuration
curl $NEUROAGENT_KEYCLOAK__ISSUER/.well-known/openid-configuration
```

**Solutions**:

- Verify Keycloak issuer URL
- Check token expiration
- Verify JWKS endpoint is accessible
- Check token format (Bearer prefix)

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
DEBUG=* npm start

# Or in Docker
docker run -e DEBUG=* neuroagent-backend-ts
```

### Support

For additional help:

1. Check documentation in `docs/`
2. Review GitHub issues
3. Contact support team

## Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured and validated
- [ ] Database backup created
- [ ] Migrations tested in staging
- [ ] Health checks configured
- [ ] Monitoring and logging set up
- [ ] Security scan completed (`npm audit`, `docker scan`)
- [ ] Load testing performed
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Documentation updated

## Post-Deployment

After deployment:

1. **Verify health checks**:

```bash
curl https://api.example.com/api/healthz
```

2. **Test critical endpoints**:

```bash
# Test authentication
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/api/threads

# Test chat streaming
curl -X POST https://api.example.com/api/qa/chat_streamed/thread-id \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Hello"}'
```

3. **Monitor logs** for errors:

```bash
docker logs -f backend-ts
```

4. **Check metrics**:
   - Response times
   - Error rates
   - Database connections
   - Memory usage

5. **Verify database migrations**:

```bash
npx prisma migrate status
```

## Rollback Procedure

If deployment fails:

1. **Stop new version**:

```bash
docker-compose stop backend-ts
```

2. **Restore database** (if migrations were applied):

```bash
psql $DATABASE_URL < backup.sql
```

3. **Start previous version**:

```bash
docker-compose up -d backend-ts:previous-tag
```

4. **Verify rollback**:

```bash
curl https://api.example.com/api/healthz
```

5. **Investigate issue** and fix before redeploying

## Performance Tuning

### Database Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  connection_limit = 10
}
```

### Next.js Optimization

```typescript
// next.config.ts
{
  compress: true,  // Enable gzip compression
  poweredByHeader: false,  // Remove X-Powered-By header
  generateEtags: true,  // Enable ETags for caching
}
```

### Redis Caching

Enable Redis for rate limiting and caching:

```env
NEUROAGENT_RATE_LIMITER__DISABLED=false
NEUROAGENT_RATE_LIMITER__REDIS_HOST=redis.example.com
```

## Scaling

### Horizontal Scaling

The application is stateless and can be scaled horizontally:

```bash
# Docker Compose
docker-compose up --scale backend-ts=3

# Kubernetes
kubectl scale deployment neuroagent-backend-ts --replicas=5
```

### Load Balancing

Use a load balancer to distribute traffic:

- AWS Application Load Balancer
- Google Cloud Load Balancer
- Nginx
- Traefik

### Database Scaling

For high load:

1. Use read replicas for read-heavy workloads
2. Enable connection pooling (PgBouncer)
3. Optimize queries and add indexes
4. Consider database sharding for very large datasets

## Maintenance

### Regular Tasks

1. **Update dependencies** (monthly):

```bash
npm update
npm audit fix
```

2. **Database maintenance** (weekly):

```bash
# Vacuum and analyze
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('neuroagent'));"
```

3. **Log rotation** (daily):

```bash
# Configure logrotate
/var/log/neuroagent/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
}
```

4. **Backup verification** (weekly):

```bash
# Test restore from backup
pg_restore -d test_db backup.sql
```

### Monitoring Alerts

Set up alerts for:

- High error rate (>1%)
- Slow response times (>5s)
- High memory usage (>80%)
- Database connection errors
- Failed health checks

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Last Updated**: 2024-01-01
**Version**: 1.0.0
