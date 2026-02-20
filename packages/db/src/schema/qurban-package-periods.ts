import { pgTable, text, timestamp, integer, bigint, boolean, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { qurbanPackages } from "./qurban-packages";
import { qurbanPeriods } from "./qurban-periods";
import { qurbanSavings } from "./qurban-savings";

/**
 * Junction table for many-to-many relationship between packages and periods
 * This allows one package (e.g., "Sapi Premium 7 Orang") to be sold across
 * multiple periods (2026, 2027, 2028) with different prices and stock levels
 */
export const qurbanPackagePeriods = pgTable("qurban_package_periods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Relationships
  packageId: text("package_id")
    .references(() => qurbanPackages.id, { onDelete: "cascade" })
    .notNull(),
  periodId: text("period_id")
    .references(() => qurbanPeriods.id, { onDelete: "cascade" })
    .notNull(),

  // Period-specific pricing and stock
  price: bigint("price", { mode: "number" }).notNull(), // Harga untuk periode ini
  stock: integer("stock").default(0).notNull(), // Stok tersedia untuk periode ini
  stockSold: integer("stock_sold").default(0).notNull(), // Stok terjual untuk periode ini
  slotsFilled: integer("slots_filled").default(0).notNull(), // Total slot terisi (untuk shared packages)

  // Period-specific availability
  isAvailable: boolean("is_available").default(true).notNull(),

  // Optional execution override per package-period
  executionDateOverride: timestamp("execution_date_override", { precision: 3, mode: "date" }),
  executionTimeNote: text("execution_time_note"),
  executionLocation: text("execution_location"),
  executionNotes: text("execution_notes"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  // Ensure unique package-period combination
  packagePeriodUnique: unique().on(table.packageId, table.periodId),
}));

export const qurbanPackagePeriodsRelations = relations(qurbanPackagePeriods, ({ one, many }) => ({
  package: one(qurbanPackages, {
    fields: [qurbanPackagePeriods.packageId],
    references: [qurbanPackages.id],
  }),
  period: one(qurbanPeriods, {
    fields: [qurbanPackagePeriods.periodId],
    references: [qurbanPeriods.id],
  }),
  savings: many(qurbanSavings),
}));

export type QurbanPackagePeriod = typeof qurbanPackagePeriods.$inferSelect;
export type NewQurbanPackagePeriod = typeof qurbanPackagePeriods.$inferInsert;
