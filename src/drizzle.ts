import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./hot-updater-schema.js";

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Parse connection string for MySQL2
const connectionConfig = {
  host: new URL(connectionString).hostname,
  port: parseInt(new URL(connectionString).port) || 3306,
  user: new URL(connectionString).username,
  password: new URL(connectionString).password,
  database: new URL(connectionString).pathname.slice(1),
  multipleStatements: false,
  connectionLimit: 10,
};

// Create MySQL connection pool
const pool = mysql.createPool(connectionConfig);

// Create and export Drizzle instance with schema (enables query mode)
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await pool.end();
});
