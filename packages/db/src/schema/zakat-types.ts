import { pgTable, text, timestamp, boolean, integer, numeric, varchar } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const zakatTypes = pgTable("zakat_types", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  icon: text("icon"),
  hasCalculator: boolean("has_calculator").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  calculatorType: text("calculator_type"),
  fitrahAmount: numeric("fitrah_amount", { precision: 15, scale: 2 }),

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

  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type ZakatType = typeof zakatTypes.$inferSelect;
export type NewZakatType = typeof zakatTypes.$inferInsert;
