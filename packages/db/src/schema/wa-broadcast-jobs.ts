import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";

export const waBroadcastJobs = pgTable("wa_broadcast_jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // 'campaign_new' | 'manual_content' | 'manual_free' | 'reengagement' | 'birthday'
  templateKey: text("template_key"),
  // null jika type = 'manual_free'
  contentOverride: text("content_override"),
  // konten bebas untuk type = 'manual_free'
  referenceId: text("reference_id"),
  referenceName: text("reference_name"),
  audienceScope: text("audience_scope").notNull().default("all"),
  // 'all' | 'campaign_donors' | 'inactive_62d' | 'birthday_today'
  batchSize: integer("batch_size").notNull().default(50),
  batchIntervalMinutes: integer("batch_interval_minutes").notNull().default(60),
  currentOffset: integer("current_offset").notNull().default(0),
  nextBatchAt: timestamp("next_batch_at", { precision: 3, mode: "date", withTimezone: true }),
  status: text("status").notNull().default("pending"),
  // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { precision: 3, mode: "date", withTimezone: true }),
  completedAt: timestamp("completed_at", { precision: 3, mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const waBroadcastJobsRelations = relations(waBroadcastJobs, ({ one, many }) => ({
  creator: one(users, {
    fields: [waBroadcastJobs.createdBy],
    references: [users.id],
  }),
  logs: many(waBroadcastLogs),
}));

import { waBroadcastLogs } from "./wa-broadcast-logs";

export type WaBroadcastJob = typeof waBroadcastJobs.$inferSelect;
export type NewWaBroadcastJob = typeof waBroadcastJobs.$inferInsert;
