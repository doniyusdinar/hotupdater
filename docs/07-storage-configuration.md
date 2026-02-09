# Storage Configuration

This guide covers configuring AWS S3 (or Cloudflare R2) for storing React Native bundle files.

## Overview

Hot Updater uses cloud storage to store the actual bundle files (JavaScript bundles, assets, etc.). The database only stores metadata and references (URIs) to these files.

**Why separate storage from database?**
- **Scalability**: Storage services handle large files efficiently
- **CDN Integration**: Easy to serve files from edge locations
- **Cost**: Database storage is expensive; S3/R2 is cheap
- **Performance**: Dedicated storage services are optimized for file delivery

## AWS S3 Setup

### Step 1: Create S3 Bucket

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click **"Create bucket"**
3. Configure:
   - **Bucket name**: Globally unique (e.g., `my-app-hot-updater-bucket`)
   - **Region**: Choose closest to your users
   - **Block Public Access**: Keep enabled (security best practice)
4. Click **"Create bucket"**

### Step 2: Create IAM User

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users** → **"Create user"**
3. Set username: `hot-updater`
4. Select **"Attach policies directly"**
5. Click **"Create user"**
6. After creation, go to **Security credentials** tab
7. Click **"Create access key"**
8. Select **"Application running outside AWS"**
9. Save the **Access Key ID** and **Secret Access Key**

### Step 3: Create IAM Policy

1. Go to **IAM** → **Policies** → **"Create policy"**
2. Switch to **JSON** editor
3. Paste this policy (replace `your-bucket-name`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "HotUpdaterBucketAccess",
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
  ]
}
```

4. Click **"Next"**, name it `HotUpdaterS3Policy`, create it
5. Attach this policy to the IAM user you created

### Step 4: Configure Bucket CORS (Optional)

If your React Native app makes direct requests to S3, configure CORS:

1. Open your bucket in S3 Console
2. Go to **Permissions** tab → **CORS configuration**
3. Add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 5: Configure Server Environment Variables

Add to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=my-app-hot-updater-bucket
```

### Step 6: Verify Storage Configuration

Update `src/hotUpdater.ts` if not already done:

```typescript
import { s3Storage } from "@hot-updater/aws";

export const hotUpdater = createHotUpdater({
  // ... database config
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
  basePath: "/hot-updater",
});
```

## Cloudflare R2 Setup (S3-Compatible Alternative)

Cloudflare R2 is a cost-effective alternative to AWS S3 with zero egress fees.

### Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **"Create bucket"**
3. Enter bucket name
4. Create bucket

### Step 2: Create API Token

1. Go to **R2** → **"Manage R2 API Tokens"**
2. Click **"Create API Token"**
3. Give it a name
4. Set permissions:
   - **Read** permission
   - **Edit** permission
   - **List** permission
5. Save the **Access Key ID**, **Secret Access Key**, and **Account ID**

### Step 3: Configure Server

```typescript
import { s3Storage } from "@hot-updater/aws";

storages: [
  s3Storage({
    region: "auto",  // Required for R2
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    bucketName: process.env.R2_BUCKET_NAME!,
  }),
]
```

Environment variables:

```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
```

## Alternative: Supabase Storage

If you use Supabase, you can use their storage instead.

### Setup

1. Create a bucket in Supabase Storage
2. Get your project URL and anon key from **Settings** → **API**

### Configuration

Install the package:

```bash
npm install @hot-updater/supabase
```

Configure in `src/hotUpdater.ts`:

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

Environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_BUCKET=hot-updater
```

## Alternative: Firebase Storage

If you use Firebase, you can use Cloud Storage for Firebase.

### Setup

1. Create a Firebase project
2. Enable Cloud Storage
3. Generate a service account key

### Configuration

Install the package:

```bash
npm install @hot-updater/firebase
```

Configure in `src/hotUpdater.ts`:

```typescript
import { firebaseStorage } from "@hot-updater/firebase";

storages: [
  firebaseStorage({
    bucket: process.env.FIREBASE_STORAGE_BUCKET!,
    credential: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
  }),
]
```

## Storage URI Format

Hot Updater stores URIs in the database. The format depends on storage type:

### AWS S3 / R2

```
s3://bucket-name/path/to/bundle.jsbundle
```

### Supabase

```
supabase://bucket-name/path/to/bundle.jsbundle
```

### Firebase

```
gs://bucket-name/path/to/bundle.jsbundle
```

The storage plugin decodes these URIs to generate download URLs for React Native clients.

## Best Practices

### Security

1. **Block Public Access**: Keep S3 bucket blocking public access enabled
2. **Use IAM Roles**: In production, use IAM roles instead of access keys
3. **Rotate Keys**: Regularly rotate access keys
4. **Least Privilege**: Grant only necessary permissions

### Cost Optimization

1. **Lifecycle Rules**: Auto-delete old bundles
   ```json
   {
     "Rules": [{
       "Id": "DeleteOldBundles",
       "Status": "Enabled",
       "Expiration": {"Days": 30}
     }]
   }
   ```

2. **Storage Class**: Use Intelligent-Tiering for cost savings
3. **Cloudflare R2**: Zero egress fees can save significant money

### Performance

1. **CDN**: Enable CloudFront in front of S3
2. **Compression**: Enable gzip compression for bundles
3. **Regional Buckets**: Use buckets closest to your users

### Organization

1. **Prefix Structure**: Organize files with prefixes
   ```
   bucket/
   ├── ios/
   │   ├── production/
   │   └── staging/
   └── android/
       ├── production/
       └── staging/
   ```

2. **Version Tags**: Use S3 object tags for version management

## Testing Storage Configuration

### Test Upload

Create a test script `src/test-storage.ts`:

```typescript
import { hotUpdater } from "./hotUpdater.js";

async function testStorage() {
  const testUri = "s3://your-bucket/test.txt";

  // This tests if the storage plugin can decode the URI
  console.log("Testing storage configuration...");

  // In real usage, this would be called during bundle deployment
  console.log("Storage plugin configured successfully!");
}

testStorage();
```

Run:
```bash
npx tsx src/test-storage.ts
```

### Test Access from Server

```bash
# Inside container or local
docker-compose exec hot-updater sh

# Test AWS credentials
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1

# List bucket (needs aws-cli)
apk add aws-cli
aws s3 ls s3://your-bucket-name
```

## Troubleshooting

### Issue: "Access Denied"

**Solutions:**
1. Verify IAM user has correct permissions
2. Check bucket name is correct
3. Ensure IAM policy is attached to user
4. Verify bucket exists in the specified region

### Issue: "No such bucket"

**Solutions:**
1. Verify bucket name spelling
2. Check bucket region matches configuration
3. Ensure bucket was created successfully

### Issue: "Invalid access key"

**Solutions:**
1. Regenerate access keys in AWS Console
2. Check for extra spaces in environment variables
3. Verify you're using the correct access key (not secret key)

### Issue: "Connection timeout"

**Solutions:**
1. Check network connectivity
2. Verify security groups allow outbound traffic
3. Check firewall rules
4. Try from different network

## Next Steps

With storage configured:

1. [CLI Configuration](08-cli-configuration.md) - Set up deployment CLI
2. [React Native Integration](09-react-native-integration.md) - Configure client app
3. [Deployment Checklist](11-deployment-checklist.md) - Production readiness

## Cost Comparison

| Provider | Storage Cost | Egress Cost | Best For |
|----------|-------------|-------------|----------|
| AWS S3 | $0.023/GB | $0.09/GB | AWS ecosystem |
| Cloudflare R2 | $0.015/GB | $0 | Cost optimization |
| Supabase Storage | $0.021/GB | $0.15/GB | Existing Supabase users |
| Firebase Storage | $0.026/GB | $0.15/GB | Existing Firebase users |

*Prices as of 2024, subject to change*
