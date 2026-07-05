import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { donatur } from "./donatur";
import { waBroadcastJobs } from "./wa-broadcast-jobs";

export const waBroadcastLogs = pgTable("wa_broadcast_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  jobId: text("job_id").notNull().references(() => waBroadcastJobs.id, { onDelete: "cascade" }),
  donaturId: text("donatur_id").references(() => donatur.id, { onDelete: "set null" }),
  templateKey: text("template_key"),
  phone: text("phone").notNull(),
  status: text("status").notNull(),
  // 'sent' | 'failed' | 'skipped_opt_out' | 'skipped_no_phone'
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const waBroadcastLogsRelations = relations(waBroadcastLogs, ({ one }) => ({
  job: one(waBroadcastJobs, {
    fields: [waBroadcastLogs.jobId],
    references: [waBroadcastJobs.id],
  }),
  donaturRef: one(donatur, {
    fields: [waBroadcastLogs.donaturId],
    references: [donatur.id],
  }),
}));

export type WaBroadcastLog = typeof waBroadcastLogs.$inferSelect;
export type NewWaBroadcastLog = typeof waBroadcastLogs.$inferInsert;
