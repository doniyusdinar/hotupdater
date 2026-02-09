# Deployment Checklist

This guide provides a comprehensive checklist for deploying your Hot Updater server to production.

## Pre-Deployment Checklist

### Server Configuration

- [ ] **Environment Variables**
  - [ ] `DATABASE_URL` is set correctly
  - [ ] `PORT` is configured (default: 3000)
  - [ ] `API_KEY` is generated and secure (64+ characters)
  - [ ] `NODE_ENV=production` is set

- [ ] **Database**
  - [ ] PostgreSQL is running and accessible
  - [ ] Database schema is generated (`npx hot-updater db generate`)
  - [ ] Database migrations are applied
  - [ ] Database backup is configured

- [ ] **Storage (AWS S3)**
  - [ ] S3 bucket is created
  - [ ] IAM user has correct permissions
  - [ ] AWS credentials are set in environment variables
  - [ ] Bucket region matches configuration
  - [ ] Bucket is blocking public access (security)

- [ ] **Docker**
  - [ ] `Dockerfile` is optimized for production
  - [ ] `.dockerignore` excludes unnecessary files
  - [ ] `docker-compose.yml` is configured
  - [ ] Health checks are defined
  - [ ] Volume mounts are configured for data persistence

### Security

- [ ] **Authentication**
  - [ ] API key authentication is implemented
  - [ ] API key is stored securely (not in code)
  - [ ] Different keys for staging/production
  - [ ] API key is strong (random 64+ chars)

- [ ] **Network Security**
  - [ ] HTTPS is enabled with valid certificate
  - [ ] Firewall rules are configured
  - [ ] Only necessary ports are exposed (3000, 5432)
  - [ ] Database is not publicly accessible

- [ ] **Secrets Management**
  - [ ] No secrets in code or git
  - [ ] `.env` files are in `.gitignore`
  - [ ] Secrets are stored in secret manager (AWS Secrets Manager, etc.)
  - [ ] Secret rotation plan is in place

### Application

- [ ] **Code Quality**
  - [ ] TypeScript compilation succeeds (`npm run build`)
  - [ ] No console.log statements in production
  - [ ] Error handling is implemented
  - [ ] Logging is configured

- [ ] **Dependencies**
  - [ ] All dependencies are installed (`npm ci --omit=dev`)
  - [ ] No vulnerable packages (`npm audit`)
  - [ ] Dependencies are up to date

## Deployment Steps

### 1. Build Docker Image

```bash
docker-compose build
```

Verify:
```bash
docker images | grep hot-updater
```

### 2. Test Locally

```bash
# Start services
docker-compose up -d

# Check health
docker-compose ps

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/hot-updater/version
```

### 3. Generate Database Schema

```bash
docker-compose exec hot-updater npx hot-updater db generate src/hotUpdater.ts --yes
```

### 4. Verify Database Connection

```bash
docker-compose exec postgres psql -U postgres -d hot_updater -c "SELECT 1;"
```

### 5. Deploy to Production

Choose your deployment method:

#### Option A: Docker Compose (VPS)

```bash
# Copy files to server
scp -r ./ user@server:/opt/hot-updater

# SSH into server
ssh user@server

# Navigate to directory
cd /opt/hot-updater

# Start services
docker-compose up -d
```

#### Option B: Cloud Run (GCP)

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/hot-updater

# Deploy
gcloud run deploy hot-updater \
  --image gcr.io/PROJECT_ID/hot-updater \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option C: ECS (AWS)

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag hot-updater-server:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hot-updater:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hot-updater:latest

# Update ECS service
aws ecs update-service --cluster hot-updater --service hot-updater --force-new-deployment
```

### 6. Configure Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name updates.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location /hot-updater {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

### 7. Configure SSL Certificate

Using Let's Encrypt with certbot:

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d updates.yourdomain.com

# Auto-renewal (configured automatically)
sudo certbot renew --dry-run
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://updates.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. API Endpoint Test

```bash
curl https://updates.yourdomain.com/hot-updater/version
```

Expected response:
```json
{
  "version": "0.22.0"
}
```

### 3. Authentication Test

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://updates.yourdomain.com/hot-updater/api/bundles
```

Expected response:
```json
{
  "bundles": [],
  "total": 0
}
```

### 4. CLI Configuration Test

```bash
# In your React Native app
npx hot-updater list
```

Should connect to production server and list bundles.

## Monitoring Setup

### 1. Application Monitoring

**Uptime Monitoring:**
- UptimeRobot
- Pingdom
- StatusCake

**Performance Monitoring:**
- New Relic
- DataDog
- Prometheus + Grafana

### 2. Log Aggregation

**Options:**
- AWS CloudWatch Logs
- Loggly
- Papertrail
- ELK Stack

**Docker logs:**
```bash
# View logs
docker-compose logs -f hot-updater

# Export logs
docker-compose logs hot-updater > logs.txt
```

### 3. Error Tracking

- Sentry
- Rollbar
- Bugsnag

Integrate into `src/index.ts`:

```typescript
import * as Sentry from "@sentry/node";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: "production",
  });
}
```

### 4. Alerting

Set up alerts for:
- Server down
- High error rate
- Database connection failures
- S3 upload failures
- High memory/CPU usage

## Backup Strategy

### Database Backups

**Automated backups (cron):**

```bash
# Backup script: /opt/backup-hot-updater.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="//backups"
docker-compose exec -T postgres pg_dump -U postgres hot_updater | gzip > "$BACKUP_DIR/backup-$DATE.sql.gz"

# Keep last 7 days
find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +7 -delete
```

**Add to crontab:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/backup-hot-updater.sh
```

### Restore from Backup

```bash
# Stop services
docker-compose down

# Restore database
gunzip -c backup-20240115-020000.sql.gz | docker-compose exec -T postgres psql -U postgres hot_updater

# Start services
docker-compose up -d
```

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Verify uptime
- Review error rates

**Weekly:**
- Review disk usage
- Check backup completion
- Review security logs

**Monthly:**
- Update dependencies (`npm update`)
- Review and rotate API keys
- Review and optimize database
- Security audit

### Dependency Updates

```bash
# Check for updates
npm outdated

# Update packages
npm update

# Audit for vulnerabilities
npm audit
npm audit fix
```

### Scaling

**Horizontal Scaling (Multiple Instances):**

1. Use external PostgreSQL database
2. Load balancer (nginx/HAProxy/ALB)
3. Shared S3 storage (already shared)
4. Sticky sessions not required (stateless API)

**Vertical Scaling:**

Increase Docker container resources:

```yaml
# docker-compose.yml
services:
  hot-updater:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Rollback Plan

### Quick Rollback

```bash
# Revert to previous Docker image
docker-compose down
docker-compose pull hot-updater:previous-version
docker-compose up -d
```

### Database Rollback

```bash
# Restore from backup
docker-compose exec postgres psql -U postgres hot_updater < backup-before-deploy.sql
```

### One-Click Rollback Script

```bash
#!/bin/bash
# rollback.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

echo "Rolling back to version $VERSION..."

# Down current version
docker-compose down

# Start previous version
IMAGE_TAG="hot-updater:$VERSION"
docker run -d \
  --name hot-updater-rollback \
  -p 3000:3000 \
  --env-file .env.production \
  $IMAGE_TAG

echo "Rollback complete!"
```

## Documentation

Maintain the following documentation:

- [ ] Architecture diagram
- [ ] Network topology
- [ ] Runbook (incident response)
- [ ] On-call procedures
- [ ] Contact information
- [ ] API documentation
- [ ] Configuration reference

## Final Checklist

Before going live:

- [ ] All pre-deployment items complete
- [ ] Health checks passing
- [ ] Authentication working
- [ ] Database backups configured
- [ ] Monitoring and alerting setup
- [ ] SSL certificate valid
- [ ] DNS configured
- [ ] Firewall rules set
- [ ] Rollback procedure tested
- [ ] Team trained on operations
- [ ] Documentation complete

## Success Criteria

Your deployment is successful when:

1. ✅ Server responds to health checks
2. ✅ Public endpoints work without authentication
3. ✅ Admin endpoints require valid API key
4. ✅ CLI can deploy bundles
5. ✅ React Native apps can check for updates
6. ✅ Logs are being collected
7. ✅ Monitoring is working
8. ✅ Backups are running
9. ✅ Team can respond to incidents

## Next Steps

After deployment:

1. Monitor logs and metrics for first 24 hours
2. Deploy test bundle to verify end-to-end flow
3. Set up incident response procedures
4. Schedule regular maintenance windows
5. Review and optimize based on metrics

## Additional Resources

- [Production Readiness Checklist](https://github.com/goldbergyoni/nodebestpractices#-1-project-structure-practices)
- [Docker Security Best Practices](https://snyk.io/blog/10-docker-image-security-best-practices/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [nginx Security Guide](https://github.com/detectify/nginx-secure-configuration)
