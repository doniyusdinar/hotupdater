import { mysqlTable, varchar, text, boolean, json } from "drizzle-orm/mysql-core"

export const bundles = mysqlTable("bundles", {
  id: varchar("id", { length: 36 }).primaryKey().notNull(),
  platform: varchar("platform", { length: 255 }).notNull(),
  should_force_update: boolean("should_force_update").notNull(),
  enabled: boolean("enabled").notNull(),
  file_hash: varchar("file_hash", { length: 255 }).notNull(),
  git_commit_hash: varchar("git_commit_hash", { length: 255 }),
  message: text("message"),
  channel: varchar("channel", { length: 255 }).notNull(),
  storage_uri: text("storage_uri").notNull(),
  target_app_version: varchar("target_app_version", { length: 255 }),
  fingerprint_hash: varchar("fingerprint_hash", { length: 255 }),
  metadata: json("metadata").notNull()
})

export const private_hot_updater_settings = mysqlTable("private_hot_updater_settings", {
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  version: varchar("version", { length: 255 }).notNull().default("0.21.0")
})