import { pgTable, text, timestamp, jsonb, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";

export const activityReports = pgTable("activity_reports", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Polymorphic Reference
  referenceType: text("reference_type").notNull(), // campaign, zakat_period, zakat_disbursement, qurban_period
  referenceId: text("reference_id").notNull(),
  referenceName: text("reference_name"),

  // Core Report Fields
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  activityDate: timestamp("activity_date", { precision: 3, mode: "date", withTimezone: true }).notNull(),
  description: text("description").notNull(), // HTML content from TipTap editor
  gallery: jsonb("gallery").$type<string[]>().default([]),
  videoUrl: text("video_url"),

  // Type-Specific Data
  typeSpecificData: jsonb("type_specific_data"),

  // Address - Indonesia Address System
  detailAddress: text("detail_address"),
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),

  // Status & Publishing
  status: text("status").default("draft").notNull(), // draft, published
  publishedAt: timestamp("published_at", { precision: 3, mode: "date", withTimezone: true }),

  // Audit
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),

  // SEO
  focusKeyphrase: text("focus_keyphrase"),
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 160 }),
  canonicalUrl: text("canonical_url"),
  noIndex: boolean("no_index").default(false),
  noFollow: boolean("no_follow").default(false),
  ogTitle: varchar("og_title", { length: 70 }),
  ogDescription: varchar("og_description", { length: 160 }),
  ogImageUrl: text("og_image_url"),
  seoScore: integer("seo_score").default(0),

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
