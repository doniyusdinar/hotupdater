# Docker Deployment

This guide covers deploying your Hot Updater server using Docker and Docker Compose for a complete, production-ready setup.

## Overview

Docker deployment provides:
- Consistent environment across development and production
- Easy setup with PostgreSQL database included
- Simple scaling and updates
- Isolated dependencies

## Architecture

```
┌─────────────────────────────────────┐
│      Docker Compose Network         │
│                                     │
│  ┌────────────────┐  ┌────────────┐│
│  │  hot-updater   │  │ PostgreSQL ││
│  │   (Express)    │◀─│   Database ││
│  │   Port: 3000   │  │  Port:5432 ││
│  └────────────────┘  └────────────┘│
└─────────────────────────────────────┘
         │
         ▼
    AWS S3 (External)
```

## Step 1: Create Dockerfile

Create `Dockerfile` in your project root:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
```

### Dockerfile Explanation

**Multi-stage Build:**
- **Builder stage**: Compiles TypeScript and installs dev dependencies
- **Production stage**: Contains only runtime dependencies and compiled code

**Security:**
- Runs as non-root user (`nodejs`)
- Minimal attack surface with Alpine Linux
- No development tools in production image

**Health Check:**
- Checks `/health` endpoint every 30 seconds
- Marks container as unhealthy after 3 failed checks

## Step 2: Create .dockerignore

Create `.dockerignore` to exclude unnecessary files:

```gitignore
node_modules
dist
npm-debug.log
.git
.gitignore
.env
.env.local
README.md
docs
examples
.DS_Store
*.md
drizzle
.vscode
.idea
```

## Step 3: Create docker-compose.yml

Create `docker-compose.yml` in your project root:

```yaml
version: "3.8"

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: hot-updater-db
    environment:
      POSTGRES_DB: hot_updater
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - hot-updater-network

  # Hot Updater Server
  hot-updater:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hot-updater-server
    ports:
      - "3000:3000"
    environment:
      # Server
      PORT: 3000
      NODE_ENV: production

      # Database
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/hot_updater

      # API Authentication
      API_KEY: ${API_KEY:-change-this-to-a-secure-api-key}

      # AWS S3
      AWS_REGION: ${AWS_REGION:-us-east-1}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - hot-updater-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  postgres_data:
    driver: local

networks:
  hot-updater-network:
    driver: bridge
```

### Docker Compose Explained

**Services:**
- `postgres`: PostgreSQL 16 database
- `hot-updater`: Your Express server

**Volumes:**
- `postgres_data`: Persists database data

**Networks:**
- `hot-updater-network`: Isolated network for communication

**Health Checks:**
- PostgreSQL: Uses `pg_isready` to check database is accepting connections
- Hot Updater: Checks `/health` endpoint

**Dependency Management:**
- Hot Updater waits for PostgreSQL to be healthy before starting

## Step 4: Configure Environment Variables

Create `.env` file (or copy from example):

```env
# API Authentication (generate a secure key!)
API_KEY=your-very-secure-random-api-key-here

# AWS S3 Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=my-hot-updater-bucket
```

**Generate Secure API Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Build and Start Services

### Build Docker Images

```bash
docker-compose build
```

Expected output:
```
[+] Building 45.2s (15/15) FINISHED
 => [hot-updater internal] load build definition
 => [hot-updater internal] load .dockerignore
 => [hot-updater internal] load metadata
 ...
 => => naming to docker.io/library/hot-updater-hot-updater
```

### Start All Services

```bash
docker-compose up -d
```

Expected output:
```
[+] Running 3/3
 ✔ Network hot-updater-hot-updater-network      Created
 ✔ Volume "hot-updater_postgres_data"           Created
 ✔ Container hot-updater-db                     Started
 ✔ Container hot-updater-server                 Started
```

### Verify Services are Running

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
hot-updater-db          Up (healthy)        0.0.0.0:5432->5432/tcp
hot-updater-server      Up (healthy)        0.0.0.0:3000->3000/tcp
```

### View Logs

```bash
# All logs
docker-compose logs

# Hot Updater logs only
docker-compose logs -f hot-updater

# PostgreSQL logs only
docker-compose logs -f postgres
```

## Step 6: Generate Database Schema

Generate the database schema inside the container:

```bash
docker-compose exec hot-updater npx hot-updater db generate src/hotUpdater.ts --yes
```

Or use the npm script if you configured it:

```bash
docker-compose exec hot-updater npm run db:generate
```

## Step 7: Test the Deployment

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test Hot Updater Version

```bash
curl http://localhost:3000/hot-updater/version
```

Expected response:
```json
{
  "version": "0.22.0"
}
```

### Test Protected Endpoint

```bash
curl -H "Authorization: Bearer your-very-secure-random-api-key-here" \
  http://localhost:3000/hot-updater/api/bundles
```

Expected response:
```bash
{
  "bundles": [],
  "total": 0
}
```

## Docker Commands Reference

### Start Services

```bash
# Start in detached mode (background)
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes database!)
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart hot-updater
```

### View Logs

```bash
# Follow logs (live)
docker-compose logs -f

# Logs for specific service
docker-compose logs -f hot-updater

# Last 100 lines
docker-compose logs --tail=100 hot-updater
```

### Execute Commands

```bash
# Open shell in container
docker-compose exec hot-updater sh

# Run command in container
docker-compose exec hot-updater npm run build

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d hot_updater
```

### Rebuild After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment

### Use Production Environment Variables

Create `.env.production`:

```env
API_KEY=your-production-api-key
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=prod-access-key
AWS_SECRET_ACCESS_KEY=prod-secret-key
S3_BUCKET_NAME=prod-bucket
```

Start with production config:

```bash
docker-compose --env-file .env.production up -d
```

### External Database

For production, use a managed database service (AWS RDS, etc.):

```yaml
services:
  hot-updater:
    environment:
      DATABASE_URL: ${DATABASE_URL}  # External database
    # Remove postgres service and depends_on
```

### Reverse Proxy

Use nginx or Traefik for HTTPS and load balancing:

**nginx.conf:**
```nginx
server {
    listen 443 ssl http2;
    server_name updates.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location /hot-updater {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add to `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/ssl/certs
      - ./keys:/etc/ssl/private
    depends_on:
      - hot-updater
```

### Health Monitoring

Add monitoring with health checks:

```bash
# Check container health
docker-compose ps

# Check health status details
docker inspect hot-updater-server | grep -A 10 Health
```

## Backup and Restore

### Backup Database

```bash
# Backup to file
docker-compose exec postgres pg_dump -U postgres hot_updater > backup.sql

# Backup to compressed file
docker-compose exec postgres pg_dump -U postgres hot_updater | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from file
cat backup.sql | docker-compose exec -T postgres psql -U postgres hot_updater

# Restore from compressed file
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U postgres hot_updater
```

### Automated Backups

Add backup service to `docker-compose.yml`:

```yaml
services:
  backup:
    image: postgres:16-alpine
    volumes:
      - ./backups:/backups
    depends_on:
      - postgres
    restart: "no"
    command: >
      sh -c "sleep 10 &&
      pg_dump -U postgres -h postgres hot_updater |
      gzip > /backups/backup-$$(date +%Y%m%d-%H%M%S).sql.gz"
```

Run backup manually:

```bash
docker-compose up backup
```

## Troubleshooting

### Issue: Container exits immediately

**Solution:** Check logs:
```bash
docker-compose logs hot-updater
```

Common causes:
- Missing environment variables
- Database connection failure
- Port already in use

### Issue: Database connection fails

**Solution:**
1. Verify PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Check DATABASE_URL:
   ```bash
   docker-compose exec hot-updater printenv | grep DATABASE_URL
   ```

3. Test connection:
   ```bash
   docker-compose exec postgres psql -U postgres -d hot_updater
   ```

### Issue: "Port already allocated"

**Solution:** Change port in `docker-compose.yml` or stop conflicting service:
```bash
# Find what's using the port
lsof -i :3000

# Or change port mapping
ports:
  - "3001:3000"
```

### Issue: Out of memory

**Solution:** Increase Docker memory limit or limit PostgreSQL memory:

```yaml
services:
  postgres:
    environment:
      # Limit shared buffers
      POSTGRES_SHARED_BUFFERS: 256MB
```

### Issue: Container can't reach AWS S3

**Solution:**
1. Verify AWS credentials are correct
2. Check IAM permissions
3. Ensure container has internet access
4. Check security groups/firewall rules

## Next Steps

With Docker deployment complete:

1. [Storage Configuration](07-storage-configuration.md) - Set up AWS S3 bucket
2. [CLI Configuration](08-cli-configuration.md) - Configure deployment CLI
3. [Deployment Checklist](11-deployment-checklist.md) - Production readiness check
