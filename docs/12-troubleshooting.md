# Troubleshooting

This guide covers common issues and solutions when setting up and running your Hot Updater server.

## Quick Diagnosis

### Check Services Status

```bash
docker-compose ps
```

All services should show "Up" and "healthy":

```
NAME                    STATUS              PORTS
hot-updater-db          Up (healthy)        0.0.0.0:5432->5432/tcp
hot-updater-server      Up (healthy)        0.0.0.0:3000:3000/tcp
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs -f hot-updater
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 hot-updater
```

### Test Database Connection

```bash
docker-compose exec postgres psql -U postgres -d hot_updater -c "SELECT 1;"
```

Expected output:
```
 ?column?
----------
        1
```

### Test Server Health

```bash
curl http://localhost:3000/health
```

Expected output:
```json
{"status":"ok","timestamp":"..."}
```

## Common Issues

### Issue: Container Exits Immediately

**Symptoms:**
```bash
docker-compose ps
# Shows "Exit 1" or "Exited (0)"
```

**Diagnosis:**
```bash
docker-compose logs hot-updater
```

**Possible Causes & Solutions:**

1. **Missing Environment Variables**
   ```bash
   # Check variables
   docker-compose exec hot-updater printenv

   # Solution: Ensure all required variables in .env
   cat .env | grep -E "DATABASE_URL|AWS_|API_KEY"
   ```

2. **Database Not Ready**
   ```bash
   # Wait for database to be healthy
   docker-compose up -d
   docker-compose logs -f postgres
   ```

3. **Port Already in Use**
   ```bash
   # Find what's using the port
   lsof -i :3000
   lsof -i :5432

   # Kill the process or change port in docker-compose.yml
   ports:
     - "3001:3000"  # Use different port
   ```

4. **Build Error**
   ```bash
   # Rebuild from scratch
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Issue: Database Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. **Database Not Running**
   ```bash
   # Check database status
   docker-compose ps postgres

   # Start database
   docker-compose up -d postgres

   # Wait for healthy status
   docker-compose logs -f postgres
   ```

2. **Wrong DATABASE_URL**
   ```bash
   # Check .env
   cat .env | grep DATABASE_URL

   # Should be (for Docker):
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hot_updater

   # NOT (for local):
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hot_updater
   ```

3. **Database Not Healthy**
   ```bash
   # Check health
   docker-compose exec postgres pg_isready -U postgres

   # Should return: postgres:5432 - accepting connections
   ```

### Issue: "Cannot find module" Errors

**Symptoms:**
```
Error: Cannot find module '@hot-updater/server'
```

**Solutions:**

1. **Dependencies Not Installed**
   ```bash
   # Install dependencies
   npm install

   # Rebuild Docker image
   docker-compose build
   docker-compose up -d
   ```

2. **Node Modules Not Copied**
   ```bash
   # Check .dockerignore
   cat .dockerignore

   # Ensure node_modules is NOT ignored
   # (It should be for multi-stage build)
   ```

3. **Build Incomplete**
   ```bash
   # Clean and rebuild
   rm -rf dist node_modules
   npm install
   npm run build
   docker-compose build --no-cache
   ```

### Issue: S3 Upload Failed

**Symptoms:**
```
Error: Access Denied
Error: NoSuchBucket
Error: InvalidAccessKeyId
```

**Solutions:**

1. **Verify AWS Credentials**
   ```bash
   # Check environment variables
   docker-compose exec hot-updater printenv | grep AWS

   # Test with AWS CLI
   aws s3 ls s3://your-bucket-name
   ```

2. **Check IAM Permissions**
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "s3:PutObject",
       "s3:GetObject",
       "s3:DeleteObject",
       "s3:ListBucket"
     ],
     "Resource": [
       "arn:aws:s3:::your-bucket-name",
       "arn:aws:s3:::your-bucket-name/*"
     ]
   }
   ```

3. **Verify Bucket Name**
   ```bash
   # List buckets
   aws s3 ls

   # Check bucket exists
   aws s3 ls s3://your-bucket-name
   ```

4. **Check Bucket Region**
   ```bash
   # Get bucket location
   aws s3api get-bucket-location --bucket your-bucket-name

   # Ensure AWS_REGION matches bucket region
   ```

### Issue: API Authentication Failed

**Symptoms:**
```
401 Unauthorized
403 Forbidden
```

**Solutions:**

1. **Check API Key**
   ```bash
   # In .env
   cat .env | grep API_KEY

   # In server logs
   docker-compose logs hot-updater | grep -i auth
   ```

2. **Test with curl**
   ```bash
   # Should fail
   curl http://localhost:3000/hot-updater/api/bundles

   # Should succeed
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/hot-updater/api/bundles
   ```

3. **Check Header Format**
   ```typescript
   // Must be "Bearer <token>" with space
   Authorization: Bearer your-api-key

   // NOT
   Authorization: your-api-key
   Authorization: bearer your-api-key  (lowercase)
   ```

### Issue: Health Check Failing

**Symptoms:**
```
Container status: "unhealthy"
docker-compose ps shows "(health: starting)" forever
```

**Solutions:**

1. **Check Health Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Verify Health Check Configuration**
   ```yaml
   # docker-compose.yml
   healthcheck:
     test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
     interval: 30s
     timeout: 5s
     retries: 3
   ```

3. **Increase Start Period**
   ```yaml
   healthcheck:
     start_period: 30s  # Give more time to start
   ```

### Issue: Bundle Not Showing in React Native App

**Symptoms:**
- App doesn't update even after deployment
- "No updates available" message

**Solutions:**

1. **Check Bundle Deployed**
   ```bash
   # List bundles via CLI
   npx hot-updater list

   # Or via API
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/hot-updater/api/bundles
   ```

2. **Verify Bundle Metadata**
   ```bash
   # Check platform matches (ios/android)
   # Check channel matches (production/staging)
   # Check app version constraints
   ```

3. **Check Client Configuration**
   ```typescript
   // In React Native app
   HotUpdater.wrap({
     baseURL: 'http://localhost:3000/hot-updater',  // Correct?
     updateStrategy: 'appVersion',  // Matches bundle?
     updateMode: 'auto',
   })
   ```

4. **Test Update Endpoint**
   ```bash
   # Test update check manually
   curl "http://localhost:3000/hot-updater/app-version/ios/1.0.0/production/1.0.0/2.0.0"
   ```

### Issue: Out of Memory

**Symptoms:**
```
Container killed (OOMKilled)
docker-compose ps shows "Exit 137"
```

**Solutions:**

1. **Increase Docker Memory**
   - Docker Desktop: Settings → Resources → Memory → Increase to 4GB+
   - Linux: Not applicable (uses host memory)

2. **Limit PostgreSQL Memory**
   ```yaml
   # docker-compose.yml
   postgres:
     environment:
       POSTGRES_SHARED_BUFFERS: 256MB
   ```

3. **Add Container Memory Limits**
   ```yaml
   services:
     hot-updater:
       deploy:
         resources:
           limits:
             memory: 1G
   ```

### Issue: Permission Denied (Linux)

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solutions:**

1. **Fix File Permissions**
   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER .

   # Fix permissions
   chmod -R 755 .
   ```

2. **Run as Non-Root (Docker)**
   ```dockerfile
   # Dockerfile
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nodejs -u 1001
   USER nodejs
   ```

## Debug Mode

### Enable Debug Logging

```typescript
// src/index.ts
const app = express();

// Add debug middleware
app.use((req, res, next) => {
  console.log({
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
  });
  next();
});
```

### Database Query Logging

```typescript
// src/drizzle.ts
export const db = drizzle(client, {
  logger: true,  // Enable query logging
});
```

### Verbose Docker Logs

```bash
# Enable debug mode
DOCKER_BUILDKIT=0 docker-compose build

# Verbose compose
docker-compose --verbose up
```

## Network Issues

### Container Cannot Reach AWS

**Diagnosis:**
```bash
docker-compose exec hot-updater ping amazonaws.com
```

**Solutions:**

1. **Check DNS**
   ```bash
   docker-compose exec hot-updater cat /etc/resolv.conf
   ```

2. **Use Host Network (Linux only)**
   ```yaml
   services:
     hot-updater:
       network_mode: host
   ```

3. **Check Firewall**
   ```bash
   # Allow outbound HTTPS
   sudo ufw allow out 443/tcp
   ```

### Container Cannot Reach Database

**Diagnosis:**
```bash
docker-compose exec hot-updater ping postgres
```

**Solutions:**

1. **Check Network**
   ```bash
   docker network inspect hot-updater-hot-updater-network
   ```

2. **Verify Service Names**
   ```yaml
   # Use service name, not localhost
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hot_updater
   # NOT localhost!
   ```

## Performance Issues

### Slow Response Times

**Diagnosis:**
```bash
# Check response time
time curl http://localhost:3000/hot-updater/version
```

**Solutions:**

1. **Enable Compression**
   ```typescript
   import compression from "compression";
   app.use(compression());
   ```

2. **Add Caching**
   ```typescript
   import apicache from "apicache";
   const cache = apicache.middleware;
   app.use(cache("5 minutes"));
   ```

3. **Optimize Database Queries**
   ```typescript
   // Add indexes to frequently queried columns
   ```

### High Memory Usage

**Diagnosis:**
```bash
docker stats hot-updater-server
```

**Solutions:**

1. **Set Node.js Memory Limit**
   ```yaml
   environment:
     NODE_OPTIONS: "--max-old-space-size=512"
   ```

2. **Monitor for Leaks**
   ```bash
   npm install -g clinic
   clinic doctor -- node dist/index.js
   ```

## Getting Help

If you're still stuck:

1. **Check Logs**
   ```bash
   docker-compose logs > logs.txt
   ```

2. **Gather Information**
   - Docker version
   - Node.js version
   - Error messages
   - Configuration files (sanitize secrets!)

3. **Resources**
   - [Hot Updater Documentation](https://hot-updater.dev)
   - [GitHub Issues](https://github.com/gronxbhot-updater/issues)
   - [Discord Community](https://discord.gg/hot-updater)

4. **Create Minimal Reproduction**
   ```bash
   # Isolate the problem
   docker-compose down
   docker-compose up -d postgres
   # Test database only
   ```

## Preventive Measures

### Regular Checks

```bash
# Daily health check
curl http://localhost:3000/health

# Weekly backup verification
ls -lh /backups

# Monthly dependency audit
npm audit
```

### Monitoring Setup

- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry, Rollbar)
- [ ] Log aggregation (CloudWatch, ELK)
- [ ] Performance monitoring (DataDog, New Relic)

### Documentation

Keep updated:
- Network topology
- Configuration changes
- Incident reports
- Runbook

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Container exits | Check logs, verify env vars |
| DB connection fails | Check DATABASE_URL, wait for DB |
| S3 upload fails | Verify AWS credentials, bucket name |
| Auth fails | Check API_KEY, header format |
| No bundle appears | Verify deployment, check app config |
| Out of memory | Increase Docker memory limit |
| Port in use | Change port or kill process |
| Slow response | Enable compression, add caching |

## Additional Resources

- [Docker Troubleshooting](https://docs.docker.com/engine/troubleshooting/)
- [PostgreSQL Troubleshooting](https://www.postgresql.org/docs/current/troubleshooting.html)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [AWS S3 Troubleshooting](https://docs.aws.amazon.com/AmazonS3/latest/user-guide/troubleshooting.html)
