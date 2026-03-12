import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const jobCategories = pgTable("job_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const jobCategoriesRelations = relations(jobCategories, ({ many }) => ({
  jobTitles: many(jobTitles),
}));

export const jobTitles = pgTable("job_titles", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => jobCategories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  isPopular: boolean("is_popular").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const jobTitlesRelations = relations(jobTitles, ({ one }) => ({
  category: one(jobCategories, {
    fields: [jobTitles.categoryId],
    references: [jobCategories.id],
  }),
}));

export type JobCategory = typeof jobCategories.$inferSelect;
export type NewJobCategory = typeof jobCategories.$inferInsert;
export type JobTitle = typeof jobTitles.$inferSelect;
export type NewJobTitle = typeof jobTitles.$inferInsert;
