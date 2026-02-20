import { pgTable, text, timestamp, boolean, integer, varchar } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const pages = pgTable("pages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  featureImageUrl: text("feature_image_url"),
  content: text("content").notNull(),
  excerpt: text("excerpt"),

  // SEO fields
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 170 }),
  focusKeyphrase: varchar("focus_keyphrase", { length: 100 }),
  canonicalUrl: text("canonical_url"),
  noIndex: boolean("no_index").default(false),
  noFollow: boolean("no_follow").default(false),
  ogTitle: varchar("og_title", { length: 70 }),
  ogDescription: varchar("og_description", { length: 200 }),
  ogImageUrl: text("og_image_url"),
  seoScore: integer("seo_score").default(0),

  isPublished: boolean("is_published").default(true).notNull(),
  publishedAt: timestamp("published_at", { precision: 3, mode: "date" }),

  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
