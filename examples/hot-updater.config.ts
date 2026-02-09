import { defineConfig } from "@hot-updater/core";
import { bare } from "@hot-updater/bare";
import { s3Storage } from "@hot-updater/aws";
import { standaloneRepository } from "@hot-updater/standalone";

export default defineConfig({
  // ==========================================
  // Build Plugin
  // ==========================================
  // Use 'bare' for React Native projects
  // Use 'expo' for Expo projects
  build: bare(),

  // ==========================================
  // Storage Configuration
  // ==========================================
  // IMPORTANT: This must match the storage configuration
  // in your server's hotUpdater.ts file!
  storage: s3Storage({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    bucketName: process.env.S3_BUCKET_NAME!,
  }),

  // ==========================================
  // Database Configuration
  // ==========================================
  // Connect to your self-hosted Hot Updater server
  database: standaloneRepository({
    // Your server's base URL
    baseUrl: process.env.HOT_UPDATER_SERVER_URL!,

    // Common headers sent with every request
    // Include API key for authentication
    commonHeaders: {
      Authorization: `Bearer ${process.env.HOT_UPDATER_API_KEY!}`,
    },
  }),

  // ==========================================
  // Optional: Platform-specific configuration
  // ==========================================
  // platform: {
  //   ios: {
  //     bundleOutput: "ios/main.jsbundle",
  //   },
  //   android: {
  //     bundleOutput: "android/index.android.bundle",
  //   },
  // },
});
