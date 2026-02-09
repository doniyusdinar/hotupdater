# Authentication & Security

This guide covers securing your Hot Updater server with API key authentication and best practices for production deployments.

## Overview

Hot Updater has two types of endpoints:
1. **Public endpoints** - For React Native clients (checking for updates)
2. **Admin endpoints** - For deployment tools (managing bundles)

Admin endpoints require authentication to prevent unauthorized bundle management.

## Why Authentication Matters

Without authentication, anyone could:
- Deploy malicious bundles to your app
- Delete existing bundles
- Disrupt your update pipeline
- Access sensitive metadata

## API Key Authentication

### How It Works

```
┌─────────────┐        Authorization Header         ┌──────────────┐
│    CLI      │ ────────────────────────────────────▶ │   Express    │
│   / CI      │   Bearer your-secret-api-key-12345   │   Server     │
└─────────────┘                                       └──────────────┘
                                                            │
                                                            ▼
                                                     ┌──────────────┐
                                                     │ Middleware   │
                                                     │ Validation   │
                                                     └──────────────┘
                                                            │
                                                   ┌──────────┴──────────┐
                                                   │ Valid?               │
                                                   ├──────────┬───────────┤
                                                   │ Yes      │ No        │
                                                   ▼          ▼
                                            ┌──────────┐  ┌─────────┐
                                            │ Proceed  │  │ 403     │
                                            │ to API   │  │ Error   │
                                            └──────────┘  └─────────┘
```

### Implementation

The authentication middleware (from `src/index.ts`):

```typescript
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.split(" ")[1]; // Extract from "Bearer <token>"

  if (token !== process.env.API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};

// Protect admin endpoints
app.use("/hot-updater/api", authMiddleware);
```

## Protected vs Public Endpoints

### Protected Endpoints (Require API Key)

| Endpoint | Description | Why Protected |
|----------|-------------|---------------|
| POST `/hot-updater/api/bundles` | Deploy bundles | Prevent malicious uploads |
| DELETE `/hot-updater/api/bundles/:id` | Delete bundles | Prevent data loss |
| GET `/hot-updater/api/bundles` | List bundles | May contain sensitive info |

### Public Endpoints (No Auth)

| Endpoint | Description | Why Public |
|----------|-------------|------------|
| GET `/hot-updater/version` | Server version | Non-sensitive info |
| GET `/hot-updater/fingerprint/*` | Check updates by fingerprint | Needed by all clients |
| GET `/hot-updater/app-version/*` | Check updates by app version | Needed by all clients |

## Generate Secure API Key

### Method 1: Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Method 2: OpenSSL

```bash
openssl rand -hex 32
```

### Method 3: Python

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

All methods generate a 64-character hexadecimal string (256 bits).

Example output:
```
a1b2c3d4e5f6...7890abcdef1234
```

## Environment Configuration

### Development

`.env.development`:
```env
API_KEY=dev-api-key-not-secret-change-in-production
```

### Staging

`.env.staging`:
```env
API_KEY=staging-secure-api-key-87654321
```

### Production

`.env.production`:
```env
API_KEY=prod-very-secure-random-api-key-abcdef1234567890
```

**Important:** Use different keys for each environment!

## Client Authentication

### CLI Configuration

The CLI sends the API key in the Authorization header:

```typescript
// hot-updater.config.ts
export default defineConfig({
  database: standaloneRepository({
    baseUrl: process.env.HOT_UPDATER_SERVER_URL!,
    commonHeaders: {
      Authorization: `Bearer ${process.env.HOT_UPDATER_API_KEY!}`,
    },
  }),
});
```

### Testing Authentication

```bash
# Without auth (should fail)
curl http://localhost:3000/hot-updater/api/bundles

# Expected response:
# {"error":"Missing authorization header"}

# With auth (should succeed)
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/hot-updater/api/bundles

# Expected response:
# {"bundles":[],"total":0}
```

## Advanced Authentication

### Multiple API Keys

Support multiple keys (e.g., per service or team):

```typescript
const API_KEYS = process.env.API_KEYS?.split(',') || [];

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token || !API_KEYS.includes(token)) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};
```

Environment variable:
```env
API_KEYS=key1,key2,key3
```

### Scoped API Keys

Different permissions for different keys:

```typescript
const API_KEYS = {
  deploy: process.env.DEPLOY_API_KEY!,
  readonly: process.env.READONLY_API_KEY!,
};

const authMiddleware = (action: 'deploy' | 'readonly') => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (token === API_KEYS[action]) {
      return next();
    }

    // Readonly key can access GET endpoints
    if (action === 'readonly' && req.method === 'GET' && token === API_KEYS.readonly) {
      return next();
    }

    res.status(403).json({ error: "Insufficient permissions" });
  };
};

// Apply scoped middleware
app.use("/hot-updater/api/bundles", authMiddleware('deploy'));
```

### Time-Based Tokens

JWT tokens with expiration:

```bash
npm install jsonwebtoken @types/jsonwebtoken
```

```typescript
import jwt from 'jsonwebtoken';

const generateToken = () => {
  return jwt.sign(
    { role: 'deployer' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
};

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  try {
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
```

## Security Best Practices

### 1. Store Secrets Securely

**Never commit `.env` files:**

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

**Use secret management in production:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager

### 2. Rotate Keys Regularly

Set up a schedule to rotate API keys:

```bash
# Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update environment variable
echo "API_KEY=$NEW_KEY" > .env.production

# Restart services
docker-compose up -d --force-recreate
```

### 3. Use HTTPS in Production

Always use HTTPS for production deployments:

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
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 4. Implement Rate Limiting

Prevent brute force attacks:

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});

app.use("/hot-updater/api", limiter);
```

### 5. Monitor and Audit Access

Log all admin operations:

```typescript
app.use("/hot-updater/api", (req, res, next) => {
  console.log({
    method: req.method,
    path: req.path,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  next();
});
```

### 6. Use Principle of Least Privilege

- Use separate AWS credentials for read vs write
- Limit S3 bucket permissions to specific prefixes
- Use IAM roles instead of access keys in AWS

### 7. Enable CORS Carefully

Only allow trusted origins:

```typescript
import cors from "cors";

app.use(cors({
  origin: [
    "https://myapp.com",
    "https://admin.myapp.com",
  ],
  credentials: true,
}));
```

### 8. Validate Input

Validate all incoming data:

```typescript
import { z } from "zod";

const bundleSchema = z.object({
  platform: z.enum(["ios", "android"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  channel: z.string(),
});

app.post("/hot-updater/api/bundles", (req, res) => {
  const validated = bundleSchema.parse(req.body);
  // Process validated data...
});
```

## Security Checklist

### Development
- [ ] Use distinct API keys per environment
- [ ] Never commit `.env` files
- [ ] Add `.env` to `.gitignore`
- [ ] Use weak keys only for local development

### Staging
- [ ] Use strong, unique API keys
- [ ] Enable HTTPS
- [ ] Implement rate limiting
- [ ] Test authentication flow

### Production
- [ ] Use very strong API keys (64+ chars)
- [ ] Enable HTTPS with valid certificates
- [ ] Use secret management service
- [ ] Enable audit logging
- [ ] Set up key rotation schedule
- [ ] Implement rate limiting
- [ ] Regularly review access logs
- [ ] Monitor for suspicious activity

## Troubleshooting

### Issue: "401 Unauthorized"

**Causes:**
- Missing Authorization header
- Invalid API key
- Wrong header format

**Solution:**
```bash
# Check header format
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/hot-updater/api/bundles

# Verify API key in .env
cat .env | grep API_KEY
```

### Issue: "403 Forbidden"

**Causes:**
- API key doesn't match
- Key expired (if using JWT)

**Solution:**
```bash
# Compare keys
echo $API_KEY
echo "Expected key from .env"

# Regenerate key if needed
```

### Issue: CORS errors

**Solution:**
```typescript
app.use(cors({
  origin: true, // For development only
  credentials: true,
}));
```

## Next Steps

With security configured:

1. [Deployment Checklist](11-deployment-checklist.md) - Prepare for production
2. [Troubleshooting](12-troubleshooting.md) - Common issues and solutions

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
