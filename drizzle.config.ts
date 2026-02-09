import type { Config } from "drizzle-kit";

export default {
  schema: "./src/hot-updater-schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: "mysql://root:root@localhost:3307/hot_updater",
  },
} satisfies Config;
