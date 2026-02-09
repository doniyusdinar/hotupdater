# Server Configuration

This guide covers creating and configuring the Hot Updater server instance with database adapter and storage plugins.

## Overview

The Hot Updater server instance is the core component that:
- Manages bundle metadata in the database
- Handles API requests from React Native clients
- Interacts with storage (AWS S3) for bundle files
- Provides admin endpoints for bundle management

## Step 1: Create Hot Updater Instance

Create `src/hotUpdater.ts`:

```typescript
import { createHotUpdater } from "@hot-updater/server";
import { drizzleAdapter } from "@hot-updater/server/adapters/drizzle";
import { s3Storage } from "@hot-updater/aws";
import { db } from "./drizzle.js";

export const hotUpdater = createHotUpdater({
  // Database adapter using Drizzle ORM
  database: drizzleAdapter({
    db,
    provider: "postgres",
  }),

  // Storage plugins for bundle files
  storages: [
    s3Storage({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      bucketName: process.env.S3_BUCKET_NAME!,
    }),
  ],

  // Base path for all API endpoints
  basePath: "/hot-updater",
});
```

## Configuration Options Explained

### Database Adapter

The `database` option configures how Hot Updater stores metadata.

**Drizzle Adapter (Recommended):**
```typescript
import { drizzleAdapter } from "@hot-updater/server/adapters/drizzle";

database: drizzleAdapter({
  db,              // Drizzle database instance
  provider: "postgres",  // Database provider: "postgres" | "mysql" | "sqlite"
})
```

**Alternative Adapters:**

Prisma:
```typescript
import { prismaAdapter } from "@hot-updater/server/adapters/prisma";

database: prismaAdapter({
  prisma,          // Prisma client instance
  provider: "postgres",
})
```

Kysely:
```typescript
import { kyselyAdapter } from "@hot-updater/server/adapters/kysely";

database: kyselyAdapter({
  db,              // Kysely database instance
  provider: "postgres",
})
```

MongoDB:
```typescript
import { mongodbAdapter } from "@hot-updater/server/adapters/mongodb";

database: mongodbAdapter({
  db,              // MongoDB database instance
})
```

### Storage Plugins

The `storages` option is an array of storage plugins. Each plugin can decode URIs for bundles stored in that storage backend.

**AWS S3 / Cloudflare R2:**
```typescript
import { s3Storage } from "@hot-updater/aws";

storages: [
  s3Storage({
    region: "us-east-1",        // AWS region or "auto" for R2
    endpoint: process.env.R2_ENDPOINT,  // Optional: For Cloudflare R2
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    bucketName: process.env.S3_BUCKET_NAME!,
  }),
]
```

**For Cloudflare R2:**
```typescript
s3Storage({
  region: "auto",
  endpoint: "https://<account-id>.r2.cloudflarestorage.com",
  credentials: { /* ... */ },
  bucketName: "my-bucket",
})
```

**Supabase Storage:**
```typescript
import { supabaseStorage } from "@hot-updater/supabase";

storages: [
  supabaseStorage({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_ANON_KEY!,
    bucket: process.env.SUPABASE_BUCKET!,
  }),
]
```

**Firebase Storage:**
```typescript
import { firebaseStorage } from "@hot-updater/firebase";

storages: [
  firebaseStorage({
    bucket: process.env.FIREBASE_STORAGE_BUCKET!,
    credential: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    },
  }),
]
```

### Multiple Storage Plugins

You can configure multiple storage plugins simultaneously:

```typescript
storages: [
  s3Storage({ /* AWS S3 config */ }),
  supabaseStorage({ /* Supabase config */ }),
]
```

This is useful when:
- Migrating between storage providers
- Supporting bundles from multiple sources
- Multi-region deployments

### Base Path

The `basePath` sets the URL prefix for all Hot Updater endpoints:

```typescript
basePath: "/hot-updater"
```

With this setting, endpoints will be:
- `/hot-updater/version`
- `/hot-updater/fingerprint/...`
- `/hot-updater/api/bundles`
- etc.

## Complete Example with Environment Variables

Here's a complete, production-ready example:

```typescript
// src/hotUpdater.ts
import { createHotUpdater } from "@hot-updater/server";
import { drizzleAdapter } from "@hot-updater/server/adapters/drizzle";
import { s3Storage } from "@hot-updater/aws";
import { db } from "./drizzle.js";

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const hotUpdater = createHotUpdater({
  database: drizzleAdapter({
    db,
    provider: "postgres",
  }),

  storages: [
    s3Storage({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      bucketName: process.env.S3_BUCKET_NAME!,
    }),
  ],

  basePath: process.env.BASE_PATH || "/hot-updater",
});
```

## API Endpoints

Once configured, Hot Updater automatically creates these endpoints:

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hot-updater/version` | Get server version info |
| GET | `/hot-updater/fingerprint/:platform/:fingerprintHash/:channel/:minBundleId/:bundleId` | Check for updates by device fingerprint |
| GET | `/hot-updater/app-version/:platform/:version/:channel/:minBundleId/:bundleId` | Check for updates by app version |

### Admin Endpoints (Should be Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hot-updater/api/bundles` | List all bundles |
| GET | `/hot-updater/api/bundles/:id` | Get specific bundle |
| POST | `/hot-updater/api/bundles` | Create or update bundle |
| DELETE | `/hot-updater/api/bundles/:id` | Delete bundle |
| GET | `/hot-updater/api/bundles/channels` | List all channels |

## Error Handling

Hot Updater provides built-in error handling. Common errors:

**Storage Error:**
```typescript
// Invalid S3 credentials
{
  "error": "StorageError",
  "message": "Access Denied"
}
```

**Database Error:**
```typescript
// Database connection failed
{
  "error": "DatabaseError",
  "message": "Connection refused"
}
```

**Validation Error:**
```typescript
// Missing required fields
{
  "error": "ValidationError",
  "message": "Missing required field: platform"
}
```

## Testing the Configuration

Create a test file `src/test-hot-updater.ts`:

```typescript
import { hotUpdater } from "./hotUpdater.js";

async function testHotUpdater() {
  try {
    // The handler is a Web Standard Request handler
    const testRequest = new Request("http://localhost:3000/hot-updater/version");

    const response = await hotUpdater.handler(testRequest);
    const data = await response.json();

    console.log("Hot Updater is working:", data);
  } catch (error) {
    console.error("Hot Updater test failed:", error);
  }
}

testHotUpdater();
```

Run the test:
```bash
npx tsx src/test-hot-updater.ts
```

## Environment Variables Reference

Update your `.env` file with all required variables:

```env
# Server
PORT=3000
BASE_PATH=/hot-updater

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hot_updater

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=my-hot-updater-bucket

# Optional: For Cloudflare R2
# R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

## Next Steps

With the Hot Updater instance configured:

1. [Framework Setup](05-framework-setup.md) - Integrate with Express server
2. [Docker Deployment](06-docker-deployment.md) - Deploy with Docker
3. [CLI Configuration](08-cli-configuration.md) - Configure deployment CLI

## Troubleshooting

### Issue: "Missing environment variable"

**Solution:** Ensure all required environment variables are set in `.env`:
- DATABASE_URL
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- S3_BUCKET_NAME

### Issue: S3 connection fails

**Solution:** Verify:
1. AWS credentials are correct
2. Bucket name is spelled correctly
3. IAM user has S3 permissions
4. Bucket is in the correct region

### Issue: Database adapter error

**Solution:** Check:
1. Database connection is working (see [Database Setup](03-database-setup.md))
2. Drizzle instance is properly exported
3. Provider string matches your database type
