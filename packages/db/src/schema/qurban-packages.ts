import { pgTable, text, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";

/**
 * Master package definition (not tied to specific period)
 * Each package can be sold across multiple periods with different prices
 * Example: "Sapi Premium 7 Orang" can be sold in 2026, 2027, 2028
 */
export const qurbanPackages = pgTable("qurban_packages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Detail Hewan (Master data - doesn't change between periods)
  animalType: text("animal_type").notNull(), // 'cow' (sapi) atau 'goat' (kambing)
  packageType: text("package_type").notNull(), // 'individual' atau 'shared' (patungan)
  name: text("name").notNull(), // "Sapi A+ Premium" atau "Kambing Super"
  description: text("description"),
  imageUrl: text("image_url"),

  // Sharing Configuration (untuk sapi patungan)
  maxSlots: integer("max_slots"), // Maksimal pembagi (5 atau 7). NULL jika individual

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

  // Master Status (can be disabled globally)
  isAvailable: boolean("is_available").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdBy: text("created_by").references(() => users.id),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanPackagesRelations = relations(qurbanPackages, ({ many }) => ({
  packagePeriods: many(qurbanPackagePeriods), // Many-to-many relationship via junction table
  sharedGroups: many(qurbanSharedGroups),
}));

// Import after declaration to avoid circular dependency
import { qurbanPackagePeriods } from "./qurban-package-periods";
import { qurbanSharedGroups } from "./qurban-shared-groups";

export type QurbanPackage = typeof qurbanPackages.$inferSelect;
export type NewQurbanPackage = typeof qurbanPackages.$inferInsert;
