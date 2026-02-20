import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";

export const activityReports = pgTable("activity_reports", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Polymorphic Reference
  referenceType: text("reference_type").notNull(), // campaign, zakat_period, zakat_disbursement, qurban_period
  referenceId: text("reference_id").notNull(),
  referenceName: text("reference_name"),

  // Core Report Fields
  title: text("title").notNull(),
  activityDate: timestamp("activity_date", { precision: 3, mode: "date" }).notNull(),
  description: text("description").notNull(), // HTML content from TipTap editor
  gallery: jsonb("gallery").$type<string[]>().default([]),
  videoUrl: text("video_url"),

  // Type-Specific Data
  typeSpecificData: jsonb("type_specific_data"),

  // Status & Publishing
  status: text("status").default("draft").notNull(), // draft, published
  publishedAt: timestamp("published_at", { precision: 3, mode: "date" }),

  // Audit
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),

  // Backward compatibility (will be removed in future)
  campaignId: text("campaign_id"),
});

// Relations
export const activityReportsRelations = relations(activityReports, ({ one }) => ({
  creator: one(users, {
    fields: [activityReports.createdBy],
    references: [users.id],
  }),
}));

export type ActivityReport = typeof activityReports.$inferSelect;
export type NewActivityReport = typeof activityReports.$inferInsert;
