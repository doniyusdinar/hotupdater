# CLI Configuration

This guide covers setting up the Hot Updater CLI to deploy bundles from your CI/CD pipeline or local machine.

## Overview

The Hot Updater CLI is used to:
- Build and bundle your React Native app
- Upload bundles to storage (AWS S3)
- Register bundle metadata in the database
- Manage bundles (list, delete, etc.)

## Step 1: Install CLI Dependencies

In your **React Native app** (not the server), install the required packages:

```bash
# Core CLI package
npm install @hot-updater/core

# Standalone repository adapter
npm install @hot-updater/standalone

# Storage plugin (must match server)
npm install @hot-updater/aws

# Build plugins
npm install @hot-updater/bare
```

## Step 2: Create Configuration File

Create `hot-updater.config.ts` in your React Native app root:

```typescript
import { defineConfig } from "@hot-updater/core";
import { bare } from "@hot-updater/bare";
import { s3Storage } from "@hot-updater/aws";
import { standaloneRepository } from "@hot-updater/standalone";

export default defineConfig({
  // Build plugin: How to bundle your app
  build: bare(),

  // Storage: Where to upload bundle files
  storage: s3Storage({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    bucketName: process.env.S3_BUCKET_NAME!,
  }),

  // Database: Where to store bundle metadata
  database: standaloneRepository({
    baseUrl: process.env.HOT_UPDATER_SERVER_URL!,
    commonHeaders: {
      Authorization: `Bearer ${process.env.HOT_UPDATER_API_KEY!}`,
    },
  }),
});
```

### Configuration Options Explained

**build** - How to bundle your React Native app

Available build plugins:
- `bare()` - For React Native projects (without Expo)
- `expo()` - For Expo projects
- Custom build plugins

**storage** - Where to upload bundle files

**Must match server configuration!** If server uses `s3Storage`, CLI must also use `s3Storage` with the same credentials.

**database** - Where to store metadata

`standaloneRepository` connects to your custom server:
- `baseUrl`: Your server's base URL
- `commonHeaders`: Headers sent with every request (e.g., API key)

## Step 3: Set Environment Variables

Create `.env` in your React Native app:

```env
# Hot Updater Server
HOT_UPDATER_SERVER_URL=http://localhost:3000/hot-updater
HOT_UPDATER_API_KEY=your-very-secure-random-api-key-here

# AWS S3 Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=my-app-hot-updater-bucket
```

**Important:** Use the same AWS credentials and bucket name as the server!

## Step 4: Verify Configuration

Test the configuration:

```bash
npx hot-updater --version
```

Expected output:
```
@hot-updater/cli v0.22.0
```

## Step 5: Deploy Your First Bundle

### Build and Deploy

```bash
npx hot-updater deploy
```

This command will:
1. Bundle your React Native app
2. Upload the bundle to S3
3. Register the bundle metadata in the database

Expected output:
```
ℹ️  Bundling iOS app...
✅ iOS bundle created
ℹ️  Uploading to S3...
✅ Uploaded to s3://my-app-hot-updater-bucket/ios/production/xxx.jsbundle
ℹ️  Registering bundle...
✅ Bundle registered successfully!

Platform: ios
Version: 1.0.0
Bundle ID: xxx-xxx-xxx
Size: 2.3 MB
Channel: production
```

### Deploy Specific Platform

```bash
# Deploy iOS only
npx hot-updater deploy --platform ios

# Deploy Android only
npx hot-updater deploy --platform android
```

### Deploy to Specific Channel

```bash
npx hot-updater deploy --channel staging
```

## CLI Commands Reference

### Deploy Bundle

```bash
npx hot-updater deploy [options]
```

Options:
- `--platform <ios|android>` - Deploy specific platform
- `--channel <name>` - Target channel (default: production)
- `--message <text>` - Deployment message

### List Bundles

```bash
npx hot-updater list
```

Output:
```
Available Bundles:

┌──────────┬─────────┬───────────┬─────────┬────────┐
│ Platform │ Version │ Bundle ID │ Channel │ Size   │
├──────────┼─────────┼───────────┼─────────┼────────┤
│ ios      │ 1.0.5   │ xxx-1     │ prod    │ 2.1 MB │
│ ios      │ 1.0.4   │ xxx-2     │ prod    │ 2.0 MB │
│ android  │ 1.0.5   │ xxx-3     │ prod    │ 1.8 MB │
└──────────┴─────────┴───────────┴─────────┴────────┘
```

### Delete Bundle

```bash
npx hot-updater delete <bundle-id>
```

### View Bundle Details

```bash
npx hot-updater info <bundle-id>
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Hot Update

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Deploy iOS bundle
        env:
          HOT_UPDATER_SERVER_URL: ${{ secrets.HOT_UPDATER_SERVER_URL }}
          HOT_UPDATER_API_KEY: ${{ secrets.HOT_UPDATER_API_KEY }}
          AWS_REGION: us-east-1
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
        run: npx hot-updater deploy --platform ios

      - name: Deploy Android bundle
        env:
          HOT_UPDATER_SERVER_URL: ${{ secrets.HOT_UPDATER_SERVER_URL }}
          HOT_UPDATER_API_KEY: ${{ secrets.HOT_UPDATER_API_KEY }}
          AWS_REGION: us-east-1
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
        run: npx hot-updater deploy --platform android
```

Add secrets in GitHub repository settings:
- `HOT_UPDATER_SERVER_URL`
- `HOT_UPDATER_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
deploy-hot-update:
  stage: deploy
  only:
    - tags
  script:
    - npm ci
    - npx hot-updater deploy --platform ios
    - npx hot-updater deploy --platform android
  variables:
    HOT_UPDATER_SERVER_URL: $HOT_UPDATER_SERVER_URL
    HOT_UPDATER_API_KEY: $HOT_UPDATER_API_KEY
    AWS_REGION: us-east-1
    AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY
    S3_BUCKET_NAME: $S3_BUCKET_NAME
```

### Jenkins

```groovy
pipeline {
    agent any

    environment {
        HOT_UPDATER_SERVER_URL = credentials('hot-updater-url')
        HOT_UPDATER_API_KEY = credentials('hot-updater-api-key')
        AWS_ACCESS_KEY_ID = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
        S3_BUCKET_NAME = 'my-app-hot-updater-bucket'
        AWS_REGION = 'us-east-1'
    }

    stages {
        stage('Deploy') {
            steps {
                sh 'npm ci'
                sh 'npx hot-updater deploy'
            }
        }
    }
}
```

## Advanced Configuration

### Multiple Environments

Create separate config files for each environment:

`hot-updater.config.staging.ts`:
```typescript
export default defineConfig({
  build: bare(),
  storage: s3Storage({ /* ... */ }),
  database: standaloneRepository({
    baseUrl: "https://staging-api.example.com/hot-updater",
    commonHeaders: { Authorization: `Bearer ${process.env.STAGING_API_KEY!}` },
  }),
});
```

`hot-updater.config.production.ts`:
```typescript
export default defineConfig({
  build: bare(),
  storage: s3Storage({ /* ... */ }),
  database: standaloneRepository({
    baseUrl: "https://api.example.com/hot-updater",
    commonHeaders: { Authorization: `Bearer ${process.env.PRODUCTION_API_KEY!}` },
  }),
});
```

Deploy with specific config:
```bash
npx hot-updater deploy --config staging.config.ts
```

### Custom Build Hooks

```typescript
export default defineConfig({
  build: bare(),
  storage: s3Storage({ /* ... */ }),
  database: standaloneRepository({ /* ... */ }),

  // Hook before deployment
  onBeforeDeploy: async ({ platform, version }) => {
    console.log(`Deploying ${platform} version ${version}...`);
  },

  // Hook after deployment
  onAfterDeploy: async ({ bundleId, platform }) => {
    await notifyTeam(`New ${platform} bundle deployed: ${bundleId}`);
  },
});
```

## Best Practices

### Security

1. **Environment Variables**: Never commit API keys or credentials
2. **CI/CD Secrets**: Use secret management in your CI/CD platform
3. **Separate Keys**: Use different API keys for staging and production
4. **Key Rotation**: Regularly rotate API keys and credentials

### Workflow

1. **Tag Releases**: Deploy on git tags (e.g., `v1.0.0`)
2. **Test First**: Deploy to staging channel before production
3. **Version Bumping**: Match bundle version with app version
4. **Rollback**: Keep previous bundles for quick rollback

### Optimization

1. **Parallel Deploys**: Deploy iOS and Android in parallel in CI/CD
2. **Bundle Size**: Monitor and optimize bundle size
3. **CDN**: Ensure S3 is backed by CDN (CloudFront)
4. **Compression**: Use gzip compression for smaller uploads

## Troubleshooting

### Issue: "Cannot connect to server"

**Solutions:**
1. Verify HOT_UPDATER_SERVER_URL is correct
2. Check server is running
3. Verify network connectivity
4. Check firewall/security group rules

### Issue: "Authentication failed"

**Solutions:**
1. Verify HOT_UPDATER_API_KEY is correct
2. Check API key is set in server
3. Ensure Authorization header format is correct

### Issue: "S3 upload failed"

**Solutions:**
1. Verify AWS credentials
2. Check bucket name is correct
3. Ensure IAM permissions are correct
4. Verify bucket exists

### Issue: "Bundle already exists"

**Solutions:**
1. Increment version number in package.json
2. Or use `--force` flag to overwrite:
   ```bash
   npx hot-updater deploy --force
   ```

## Next Steps

With CLI configured:

1. [React Native Integration](09-react-native-integration.md) - Set up client app
2. [Authentication & Security](10-authentication-security.md) - Secure your deployment
3. [Deployment Checklist](11-deployment-checklist.md) - Production readiness
