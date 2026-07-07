import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
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
  // 'sending' | 'sent' | 'failed' | 'skipped_opt_out' | 'skipped_no_phone'
  // 'sending' = row di-insert sebelum kirim (claim-before-send); diupdate setelah response WA
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Unique per (job, donatur) — dipakai claim-before-send dengan onConflictDoNothing()
  // untuk mencegah double-send jika cron overlap
  uniqueJobDonatur: unique("wa_broadcast_logs_job_donatur_unique").on(t.jobId, t.donaturId),
}));

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
