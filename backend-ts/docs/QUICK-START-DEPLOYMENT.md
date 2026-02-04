# Quick Start Deployment Guide

This guide provides step-by-step instructions for deploying the Neuroagent TypeScript backend in various environments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Development](#docker-development)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)

## Local Development

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+ (optional, for rate limiting)
- MinIO or S3 (optional, for file storage)

### Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/neuroagent.git
cd neuroagent/backend-ts

# Install dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Minimum required configuration:**

```env
# Database
DATABASE_URL=postgresql://postgres:pwd@localhost:5432/neuroagent

# LLM Provider (at least one)
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...

# Authentication (can disable for local dev)
NEUROAGENT_KEYCLOAK__ISSUER=https://keycloak.example.com/realms/myrealm
NEUROAGENT_KEYCLOAK__VALIDATE_TOKEN=false  # Disable for local dev

# Rate Limiting (can disable for local dev)
NEUROAGENT_RATE_LIMITER__DISABLED=true
```

### Step 3: Set Up Database

```bash
# Create database
createdb neuroagent

# Or using psql
psql -U postgres -c "CREATE DATABASE neuroagent;"

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

### Step 4: Start Development Server

```bash
# Start server with hot reload
npm run dev
```

Server will be available at `http://localhost:8079`

### Step 5: Verify Installation

```bash
# Check health
curl http://localhost:8079/api/healthz

# Check settings
curl http://localhost:8079/api/settings
```

## Docker Development

### Prerequisites

- Docker 20+
- Docker Compose 2+

### Step 1: Configure Environment

```bash
cd backend-ts

# Copy environment template
cp .env.example .env

# Edit .env (minimal config for Docker)
nano .env
```

**Docker environment:**

```env
# LLM Provider
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...

# Other services are configured in docker-compose.yml
```

### Step 2: Start Services

```bash
# Start all services (from repository root)
cd ..
docker-compose up backend-ts postgres redis minio

# Or start in background
docker-compose up -d backend-ts postgres redis minio
```

### Step 3: Initialize MinIO (First Time Only)

```bash
# Create MinIO bucket
docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin
docker exec -it neuroagent-minio-1 mc mb myminio/neuroagent
```

### Step 4: Verify Installation

```bash
# Check logs
docker-compose logs -f backend-ts

# Check health
curl http://localhost:8079/api/healthz

# Check all services
docker-compose ps
```

### Step 5: Development Workflow

```bash
# View logs
docker-compose logs -f backend-ts

# Restart after code changes
docker-compose restart backend-ts

# Rebuild after dependency changes
docker-compose up --build backend-ts

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Production Deployment

### Prerequisites

- Production server with Node.js 18+
- PostgreSQL 15+ (managed service recommended)
- Redis 7+ (managed service recommended)
- S3 or MinIO for storage
- Domain name and SSL certificate
- Reverse proxy (Nginx, Traefik, or cloud load balancer)

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (if using as reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Clone and Build

```bash
# Create application directory
sudo mkdir -p /opt/neuroagent
sudo chown $USER:$USER /opt/neuroagent

# Clone repository
cd /opt/neuroagent
git clone https://github.com/your-org/neuroagent.git .
cd backend-ts

# Install production dependencies
npm ci --only=production

# Copy production environment template
cp .env.production.example .env.production

# Edit with production values (use secure editor)
nano .env.production
```

### Step 3: Configure Production Environment

**CRITICAL**: Use strong passwords and enable all security features.

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:STRONG_PASSWORD@prod-db:5432/neuroagent?sslmode=require
NEUROAGENT_LLM__OPENAI_TOKEN=sk-prod-...
NEUROAGENT_KEYCLOAK__ISSUER=https://auth.example.com/realms/production
NEUROAGENT_KEYCLOAK__VALIDATE_TOKEN=true
NEUROAGENT_RATE_LIMITER__DISABLED=false
NEUROAGENT_RATE_LIMITER__REDIS_HOST=redis.prod.example.com
NEUROAGENT_RATE_LIMITER__REDIS_SSL=true
# ... other production settings
```

### Step 4: Build Application

```bash
# Generate Prisma Client
npm run db:generate

# Build Next.js application
npm run build
```

### Step 5: Run Database Migrations

```bash
# IMPORTANT: Backup database first!
pg_dump -h prod-db -U user neuroagent > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run db:migrate:deploy

# Verify migration status
npx prisma migrate status
```

### Step 6: Start Application with PM2

```bash
# Start application
pm2 start npm --name "neuroagent-backend" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions printed by the command

# Check status
pm2 status

# View logs
pm2 logs neuroagent-backend
```

### Step 7: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/neuroagent-backend
```

**Nginx configuration:**

```nginx
server {
    listen 80;
    server_name api.neuroagent.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.neuroagent.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.neuroagent.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.neuroagent.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js backend
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
        proxy_connect_timeout 75s;
    }

    # Health check endpoint (no auth required)
    location /api/healthz {
        proxy_pass http://localhost:8079;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/neuroagent-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 8: Set Up SSL Certificate

```bash
# Obtain SSL certificate with Let's Encrypt
sudo certbot --nginx -d api.neuroagent.example.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 9: Verify Production Deployment

```bash
# Check health
curl https://api.neuroagent.example.com/api/healthz

# Check settings
curl https://api.neuroagent.example.com/api/settings

# Test authenticated endpoint (with valid token)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.neuroagent.example.com/api/threads
```

### Step 10: Set Up Monitoring

```bash
# Install monitoring tools (example: Prometheus Node Exporter)
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

**Node Exporter service:**

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Start Node Exporter
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

## Cloud Deployment

### AWS ECS/Fargate

```bash
# Build and push Docker image
docker build -t neuroagent-backend-ts .
docker tag neuroagent-backend-ts:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/neuroagent-backend-ts:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/neuroagent-backend-ts:latest

# Create ECS task definition and service (use AWS Console or CLI)
# See DEPLOYMENT.md for detailed ECS configuration
```

### Google Cloud Run

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
  --set-secrets DATABASE_URL=database-url:latest,NEUROAGENT_LLM__OPENAI_TOKEN=openai-token:latest
```

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Note: Configure environment variables in Vercel dashboard
```

## Post-Deployment Checklist

After deployment, verify:

- [ ] Health check endpoint returns 200: `curl https://api.example.com/api/healthz`
- [ ] Settings endpoint returns configuration: `curl https://api.example.com/api/settings`
- [ ] Authentication works with valid token
- [ ] Database migrations applied successfully
- [ ] Rate limiting is enabled and working
- [ ] SSL/TLS certificate is valid
- [ ] Monitoring and alerting is set up
- [ ] Logs are being collected
- [ ] Backups are configured
- [ ] Error tracking (Sentry) is working
- [ ] Load balancer health checks pass
- [ ] Auto-scaling is configured (if applicable)

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs neuroagent-backend
# or
docker logs backend-ts

# Check environment variables
pm2 env 0
# or
docker exec backend-ts env | grep NEUROAGENT

# Verify database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Database Connection Errors

```bash
# Test connection
psql $DATABASE_URL

# Check network connectivity
ping database-host

# Verify credentials
psql -h host -U user -d neuroagent
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
curl -vI https://api.example.com
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit
# or
docker stats backend-ts

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" pm2 restart neuroagent-backend
```

## Rollback Procedure

If deployment fails:

1. **Stop new version:**
```bash
pm2 stop neuroagent-backend
# or
docker-compose stop backend-ts
```

2. **Restore database** (if migrations were applied):
```bash
psql $DATABASE_URL < backup.sql
```

3. **Start previous version:**
```bash
git checkout previous-tag
npm run build
pm2 restart neuroagent-backend
```

4. **Verify rollback:**
```bash
curl https://api.example.com/api/healthz
```

## Maintenance

### Update Application

```bash
# Pull latest code
cd /opt/neuroagent/backend-ts
git pull origin main

# Install dependencies
npm ci --only=production

# Build
npm run build

# Run migrations
npm run db:migrate:deploy

# Restart
pm2 restart neuroagent-backend
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit
npm audit fix

# Rebuild and restart
npm run build
pm2 restart neuroagent-backend
```

### Database Maintenance

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Vacuum and analyze
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('neuroagent'));"
```

## Support

For additional help:
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment documentation
- See [COMMON-OPERATIONS.md](./COMMON-OPERATIONS.md) for common operations
- Check GitHub issues
- Contact support team

---

**Last Updated**: 2024-01-01
