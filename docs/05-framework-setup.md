# Framework Setup

This guide covers setting up the Express server to host your Hot Updater instance with API key authentication.

## Overview

The Express server acts as the HTTP layer that:
- Receives incoming requests
- Handles authentication for admin endpoints
- Routes requests to the Hot Updater handler
- Serves React Native clients and CLI tools

We use **Express** as the framework for its simplicity and large ecosystem. (Hono is also supported as a lighter alternative.)

## Step 1: Create Express Server

Create `src/index.ts`:

```typescript
import express from "express";
import { toNodeHandler } from "@hot-updater/server/node";
import { hotUpdater } from "./hotUpdater.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

// Convert Hot Updater's Web Standard handler to Express handler
const hotUpdaterHandler = toNodeHandler(hotUpdater);

// API key authentication middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

  if (token !== process.env.API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};

// Protect admin API endpoints
app.use("/hot-updater/api", authMiddleware);

// Mount Hot Updater handler for all /hot-updater routes
app.all("/hot-updater/*", (req, res) => {
  hotUpdaterHandler(req, res);
});

// Health check endpoint (optional)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`Hot Updater server running on port ${port}`);
  console.log(`API endpoint: http://localhost:${port}/hot-updater`);
});
```

## Step 2: Update Environment Variables

Add API key to your `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Authentication
API_KEY=your-secret-api-key-change-this-in-production

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hot_updater

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
```

**Important:** Use a strong, random API key in production. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## How Authentication Works

### Protected Endpoints

The `authMiddleware` protects `/hot-updater/api/*` endpoints which require admin access:

- POST `/hot-updater/api/bundles` - Deploy bundles
- DELETE `/hot-updater/api/bundles/:id` - Delete bundles
- GET `/hot-updater/api/bundles` - List all bundles

### Public Endpoints

These endpoints remain public for React Native clients:

- GET `/hot-updater/version` - Server version
- GET `/hot-updater/fingerprint/*` - Check for updates by fingerprint
- GET `/hot-updater/app-version/*` - Check for updates by app version

### Request Flow

```
Client Request
    │
    ▼
Express Server
    │
    ▼
Is it /hot-updater/api/* ? ───YES──▶ authMiddleware ───▶ Hot Updater Handler
    │ NO
    ▼
Hot Updater Handler (direct)
```

## Step 3: Create Server Entry Point

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "hot-updater db generate src/hotUpdater.ts --yes"
  }
}
```

## Step 4: Test the Server

Start the development server:

```bash
npm run dev
```

The server should start:
```
Hot Updater server running on port 3000
API endpoint: http://localhost:3000/hot-updater
```

### Test Public Endpoint

```bash
curl http://localhost:3000/hot-updater/version
```

Expected response:
```json
{
  "version": "0.22.0"
}
```

### Test Protected Endpoint (Without API Key)

```bash
curl http://localhost:3000/hot-updater/api/bundles
```

Expected response:
```json
{
  "error": "Missing authorization header"
}
```

### Test Protected Endpoint (With API Key)

```bash
curl -H "Authorization: Bearer your-secret-api-key-change-this" \
  http://localhost:3000/hot-updater/api/bundles
```

Expected response:
```json
{
  "bundles": [],
  "total": 0
}
```

## Alternative: Hono Framework

If you prefer Hono (lighter, faster), here's the equivalent setup:

### Install Hono

```bash
npm install hono @hono/node-server
```

### Create Hono Server

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { hotUpdater } from "./hotUpdater.js";

const app = new Hono();
const port = Number(process.env.PORT) || 3000;

// API key authentication middleware
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader) {
    return c.json({ error: "Missing authorization header" }, 401);
  }

  const token = authHeader.split(" ")[1];

  if (token !== process.env.API_KEY) {
    return c.json({ error: "Invalid API key" }, 403);
  }

  await next();
};

// Apply auth to /api/* routes only
app.use("/hot-updater/api/*", authMiddleware);

// Mount Hot Updater handler
app.on(["POST", "GET", "DELETE"], "/hot-updater/*", async (c) => {
  return hotUpdater.handler(c.req.raw);
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Start server
serve({
  fetch: app.fetch,
  port,
}, () => {
  console.log(`Hot Updater server running on port ${port}`);
});
```

## Advanced Configuration

### CORS Configuration

If your React Native app and server are on different domains, configure CORS:

```bash
npm install cors
```

```typescript
import cors from "cors";

// Enable CORS for all routes
app.use(cors());

// Or configure specific origins
app.use(cors({
  origin: ["https://myapp.com", "exp://192.168.1.1:19000"],
  credentials: true,
}));
```

### Rate Limiting

Protect against abuse with rate limiting:

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from "express-rate-limit";

// Rate limit for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});

app.use("/hot-updater/api", adminLimiter);
```

### Request Logging

Log all requests for debugging:

```bash
npm install morgan
```

```typescript
import morgan from "morgan";

// Log requests in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
```

### Graceful Shutdown

Handle server shutdown gracefully:

```typescript
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
```

## Production Considerations

### Use a Process Manager

Use PM2 or similar for production:

```bash
npm install -g pm2
pm2 start dist/index.js --name hot-updater
pm2 startup
pm2 save
```

### Use HTTPS

Always use HTTPS in production. Use nginx or a reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name updates.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /hot-updater {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment-Specific Configs

Use different API keys for environments:

```env
# .env.development
API_KEY=dev-api-key-not-secret

# .env.staging
API_KEY=staging-api-key-keep-secret

# .env.production
API_KEY=prod-api-key-very-secure-random-string
```

## Troubleshooting

### Issue: "Middleware not working"

**Solution:** Ensure middleware is applied before routes:
```typescript
// Correct order
app.use("/hot-updater/api", authMiddleware);
app.all("/hot-updater/*", handler);
```

### Issue: "Handler not receiving requests"

**Solution:** Make sure you're using `toNodeHandler`:
```typescript
import { toNodeHandler } from "@hot-updater/server/node";
const handler = toNodeHandler(hotUpdater);
```

### Issue: "API key validation failing"

**Solution:** Check that:
1. API_KEY is set in `.env`
2. Authorization header format is `Bearer <token>`
3. No extra spaces in the token

### Issue: "Port already in use"

**Solution:** Change the PORT in `.env` or kill the process using the port:
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Next Steps

With the server configured:

1. [Docker Deployment](06-docker-deployment.md) - Deploy with Docker Compose
2. [Storage Configuration](07-storage-configuration.md) - Configure AWS S3
3. [CLI Configuration](08-cli-configuration.md) - Set up deployment CLI
