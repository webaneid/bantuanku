import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const incomeRanges = pgTable("income_ranges", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type IncomeRange = typeof incomeRanges.$inferSelect;
export type NewIncomeRange = typeof incomeRanges.$inferInsert;
