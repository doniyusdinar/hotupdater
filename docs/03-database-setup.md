# Database Setup

This guide covers configuring PostgreSQL database with Drizzle ORM for your Hot Updater server.

## Overview

Hot Updater uses a database to store:
- Bundle metadata (version, platform, channel)
- App version information
- Update history
- Channel configurations

We use **PostgreSQL** as the database and **Drizzle ORM** for type-safe database operations.

## Prerequisites

- PostgreSQL installed locally, or
- PostgreSQL running in Docker (recommended)
- DATABASE_URL environment variable set

## Option 1: Docker PostgreSQL (Recommended)

If you haven't already, set up PostgreSQL using Docker:

### Run PostgreSQL Container

```bash
docker run -d \
  --name hot-updater-db \
  -e POSTGRES_DB=hot_updater \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

### Verify Connection

```bash
docker exec -it hot-updater-db psql -U postgres -d hot_updater
```

You should see the PostgreSQL prompt.

### Set DATABASE_URL

Add to your `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hot_updater
```

## Option 2: Local PostgreSQL Installation

### Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-16
sudo systemctl start postgresql
```

**Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hot_updater;

# Exit
\q
```

### Set DATABASE_URL

```env
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/hot_updater
```

## Configure Drizzle ORM

### Step 1: Create Database Connection File

Create `src/drizzle.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
```

### Step 2: Verify Connection

Create a test file `src/test-db.ts`:

```typescript
import { db } from "./drizzle.js";

async function testConnection() {
  try {
    await db.execute("SELECT 1");
    console.log("Database connection successful!");
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
```

Run the test:
```bash
npx tsx src/test-db.ts
```

Expected output:
```
Database connection successful!
```

## Generate Database Schema

Hot Updater CLI can automatically generate the database schema for you.

### Step 1: Create Hot Updater Instance

First, you need to create the Hot Updater instance (see [Server Configuration](04-server-configuration.md)).

### Step 2: Generate Schema

Run the schema generation command:

```bash
npx hot-updater db generate src/hotUpdater.ts --yes
```

This will:
- Create a `src/db/schema.ts` file with all required tables
- Set up the database schema for Hot Updater

The generated schema includes:
- `bundles` table - Stores bundle metadata
- `channels` table - Stores update channels
- `platforms` table - Stores supported platforms
- And other required tables

### Step 3: Run Migrations

Apply the schema to your database:

```bash
npx drizzle-kit push:pg
```

Or using the Hot Updater CLI:

```bash
npx hot-updater db push src/hotUpdater.ts --yes
```

## Alternative: Manual Schema Creation

If you prefer manual control, you can create the schema file yourself.

Create `src/db/schema.ts`:

```typescript
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const bundles = pgTable("bundles", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  channel: text("channel").notNull(),
  version: text("version").notNull(),
  bundleId: text("bundleId").notNull(),
  storageUri: text("storageUri").notNull(),
  fileSize: integer("fileSize").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const channels = pgTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});
```

## Database Schema Overview

### Core Tables

**bundles**
- Stores each deployed bundle
- Tracks version, platform, and channel
- Links to S3 storage via `storageUri`

**channels**
- Defines update channels (production, staging, dev)
- Each bundle belongs to a channel

### Relationships

```
channels (1) ----< (*) bundles
```

One channel can have many bundles.

## Best Practices

### Connection Pooling

Configure connection pool size based on your needs:

```typescript
const client = postgres(connectionString, {
  max: 10,        // Maximum connections
  idle_timeout: 20, // Idle timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
});
```

### Environment-Specific Databases

Use different databases for development and production:

```env
# .env.development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hot_updater_dev

# .env.production
DATABASE_URL=postgresql://user:pass@prod-db:5432/hot_updater
```

### Backup Strategy

For production, set up regular backups:

```bash
# Manual backup
docker exec hot-updater-db pg_dump -U postgres hot_updater > backup.sql

# Restore
docker exec -i hot-updater-db psql -U postgres hot_updater < backup.sql
```

## Troubleshooting

### Issue: "Connection refused"

**Solution:** Check that PostgreSQL is running:
```bash
docker ps  # If using Docker
brew services list  # If using macOS
sudo systemctl status postgresql  # If using Linux
```

### Issue: "Database does not exist"

**Solution:** Create the database:
```bash
createdb hot_updater
```

Or in PostgreSQL:
```sql
CREATE DATABASE hot_updater;
```

### Issue: "Password authentication failed"

**Solution:** Verify DATABASE_URL is correct:
- Check username and password
- Verify database name
- Ensure PostgreSQL is accepting connections

### Issue: Schema generation fails

**Solution:** Make sure:
1. Hot Updater instance file exists at `src/hotUpdater.ts`
2. DATABASE_URL is set correctly
3. Database connection works

## Next Steps

With the database configured:

1. [Server Configuration](04-server-configuration.md) - Create Hot Updater instance
2. [Framework Setup](05-framework-setup.md) - Configure Express server

## Alternative ORMs

While Drizzle is recommended, Hot Updater supports other ORMs:

### Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

Use `prismaAdapter` from `@hot-updater/server/adapters/prisma`.

### Kysely

```bash
npm install kysely pg
```

Use `kyselyAdapter` from `@hot-updater/server/adapters/kysely`.

### MongoDB

```bash
npm install mongodb
```

Use `mongodbAdapter` from `@hot-updater/server/adapters/mongodb`.

See the [Hot Updater documentation](https://hot-updater.dev) for details on using alternative adapters.
