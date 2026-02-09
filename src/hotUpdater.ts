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

// Create and export Hot Updater instance
export const hotUpdater = createHotUpdater({
  // Database adapter using Drizzle ORM with MySQL
  database: drizzleAdapter({
    db,
    provider: "mysql",
  }),

  // Storage plugins for bundle files
  // You can configure multiple storage providers simultaneously
  storages: [
    // AWS S3 / Cloudflare R2 storage
    s3Storage({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      bucketName: process.env.S3_BUCKET_NAME!,

      // Optional: For Cloudflare R2, uncomment this:
      // endpoint: process.env.R2_ENDPOINT,
    }),

    // You can add more storage plugins here:
    // supabaseStorage({ /* config */ }),
    // firebaseStorage({ /* config */ }),
  ],

  // Base path for all API endpoints
  basePath: process.env.BASE_PATH || "/hot-updater",
});
