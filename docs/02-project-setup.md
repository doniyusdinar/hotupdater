# Project Setup

This guide covers initializing your Hot Updater server project and installing all necessary dependencies.

## Initialize the Project

### Step 1: Create Project Directory

```bash
mkdir hot-updater-server
cd hot-updater-server
```

### Step 2: Initialize Node.js Project

```bash
npm init -y
```

This creates a `package.json` file with default settings.

### Step 3: Install Dependencies

Install the core Hot Updater packages:

```bash
# Core server and CLI packages
npm install @hot-updater/server @hot-updater/standalone

# Express framework
npm install express @types/express

# TypeScript and development tools
npm install -D typescript @types/node tsx nodemon

# AWS S3 storage plugin
npm install @hot-updater/aws

# Drizzle ORM with PostgreSQL driver
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

## Configure TypeScript

Create a `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Create Project Structure

Create the following directory structure:

```bash
mkdir -p src
```

Your project should now look like this:

```
hot-updater-server/
├── src/
├── package.json
├── tsconfig.json
└── node_modules/
```

## Update package.json

Update your `package.json` with scripts and proper configuration:

```json
{
  "name": "hot-updater-server",
  "version": "1.0.0",
  "description": "Self-hosted Hot Updater server",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "hot-updater db generate src/hotUpdater.ts --yes"
  },
  "keywords": ["hot-updater", "ota", "react-native"],
  "license": "MIT",
  "dependencies": {
    "@hot-updater/aws": "^0.22.0",
    "@hot-updater/server": "^0.22.0",
    "@hot-updater/standalone": "^0.22.0",
    "@types/express": "^4.17.21",
    "drizzle-orm": "^0.29.0",
    "express": "^4.18.2",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "drizzle-kit": "^0.20.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

## Install Additional Storage Plugins (Optional)

Based on your storage provider, install the appropriate package:

### AWS S3 or Cloudflare R2

```bash
npm install @hot-updater/aws
```

### Supabase Storage

```bash
npm install @hot-updater/supabase
```

### Firebase Storage

```bash
npm install @hot-updater/firebase
```

## Configure Drizzle Kit

Create a `drizzle.config.ts` file for database migrations:

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

Note: The schema file will be generated in a later step.

## Create Environment File

Create a `.env` file in your project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hot_updater

# API Authentication
API_KEY=your-secret-api-key-change-this

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
```

**Important:** Never commit the `.env` file to version control. Add it to `.gitignore`.

## Create .gitignore

Create a `.gitignore` file:

```gitignore
node_modules/
dist/
.env
.env.local
*.log
drizzle/
.DS_Store
```

## Verify Installation

Test that everything is installed correctly:

```bash
# Check Node version
node --version

# Check npm packages
npm list --depth=0

# Verify TypeScript
npx tsc --version
```

## Next Steps

With the project initialized, continue to:

1. [Database Setup](03-database-setup.md) - Configure PostgreSQL and Drizzle ORM
2. [Server Configuration](04-server-configuration.md) - Create Hot Updater instance
3. [Framework Setup](05-framework-setup.md) - Configure Express server

## Common Issues

### Issue: "Cannot find module" errors

**Solution:** Make sure you installed all dependencies:
```bash
npm install
```

### Issue: TypeScript errors

**Solution:** Verify your `tsconfig.json` is correct and TypeScript is installed:
```bash
npm install -D typescript
```

### Issue: ESM module errors

**Solution:** Ensure `"type": "module"` is in your `package.json` and you're using Node.js 18+.

## Alternative: Use Example Files

You can copy the example files from this repository:

```bash
# Copy package.json
cp examples/package.json ./package.json

# Install dependencies
npm install

# Copy TypeScript config
cp examples/tsconfig.json ./tsconfig.json

# Copy example source files
cp -r examples/src ./src
```

Then customize the files for your environment.
