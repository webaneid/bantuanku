import { pgTable, text, timestamp, boolean, bigint, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { categories } from "./category";
import { users } from "./user";
import { employees } from "./employee";

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  categoryId: text("category_id").references(() => categories.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description").notNull(),
  content: text("content"),
  imageUrl: text("image_url").notNull(),
  images: jsonb("images").$type<string[]>(),
  videoUrl: text("video_url"),
  goal: bigint("goal", { mode: "number" }).notNull(),
  collected: bigint("collected", { mode: "number" }).default(0).notNull(),
  donorCount: integer("donor_count").default(0).notNull(),
  pillar: text("pillar").default("Kemanusiaan").notNull(),
  startDate: timestamp("start_date", { precision: 3, mode: "date" }),
  endDate: timestamp("end_date", { precision: 3, mode: "date" }),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isUrgent: boolean("is_urgent").default(false).notNull(),
  status: text("status").default("draft").notNull(),
  publishedAt: timestamp("published_at", { precision: 3, mode: "date" }),
  createdBy: text("created_by").references(() => users.id),
  coordinatorId: text("coordinator_id").references(() => employees.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const campaignUpdates = pgTable("campaign_updates", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  images: jsonb("images").$type<string[]>(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  category: one(categories, {
    fields: [campaigns.categoryId],
    references: [categories.id],
  }),
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  updates: many(campaignUpdates),
}));

export const campaignUpdatesRelations = relations(campaignUpdates, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignUpdates.campaignId],
    references: [campaigns.id],
  }),
  creator: one(users, {
    fields: [campaignUpdates.createdBy],
    references: [users.id],
  }),
}));

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignUpdate = typeof campaignUpdates.$inferSelect;
export type NewCampaignUpdate = typeof campaignUpdates.$inferInsert;
