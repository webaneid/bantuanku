import { pgTable, text, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const pillars = pgTable("pillars", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false).notNull(),

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

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
