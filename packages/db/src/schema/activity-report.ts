import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { campaigns } from "./campaign";
import { users } from "./user";

export const activityReports = pgTable("activity_reports", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  activityDate: timestamp("activity_date", { precision: 3, mode: "date" }).notNull(),
  description: text("description").notNull(), // HTML content from TipTap editor
  gallery: jsonb("gallery").$type<string[]>().default([]),
  status: text("status").default("draft").notNull(), // draft, published
  publishedAt: timestamp("published_at", { precision: 3, mode: "date" }),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Relations
export const activityReportsRelations = relations(activityReports, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [activityReports.campaignId],
    references: [campaigns.id],
  }),
  creator: one(users, {
    fields: [activityReports.createdBy],
    references: [users.id],
  }),
}));

export type ActivityReport = typeof activityReports.$inferSelect;
export type NewActivityReport = typeof activityReports.$inferInsert;
