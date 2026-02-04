import { pgTable, text, timestamp, integer, bigint, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanPeriods } from "./qurban-periods";
import { qurbanPackages } from "./qurban-packages";
import { qurbanPackagePeriods } from "./qurban-package-periods";
import { qurbanOrders } from "./qurban-orders";

export const qurbanSavings = pgTable("qurban_savings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  savingsNumber: text("savings_number").unique().notNull(), // SAV-QBN-2026-00001

  // User Info
  userId: text("user_id").references(() => users.id),
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone").notNull(),

  // Target (new structure with package-period junction)
  targetPackagePeriodId: text("target_package_period_id").references(() => qurbanPackagePeriods.id),

  // Legacy fields (kept for backward compatibility, can be removed in future migration)
  targetPeriodId: text("target_period_id").references(() => qurbanPeriods.id),
  targetPackageId: text("target_package_id").references(() => qurbanPackages.id),

  targetAmount: bigint("target_amount", { mode: "number" }).notNull(), // Target uang yang ingin ditabung
  currentAmount: bigint("current_amount", { mode: "number" }).default(0).notNull(), // Total yang sudah ditabung

  // Schedule
  installmentFrequency: text("installment_frequency").notNull(), // 'weekly', 'monthly', 'custom'
  installmentCount: integer("installment_count").notNull(), // Berapa kali cicilan (3x, 6x, 12x, 24x)
  installmentAmount: bigint("installment_amount", { mode: "number" }).notNull(), // Nominal per tabungan
  installmentDay: integer("installment_day"), // Hari ke- (monthly: 1-31, weekly: 1-7)
  startDate: date("start_date", { mode: "date" }).notNull(), // Mulai nabung

  // Status
  status: text("status").default("active").notNull(), // active, paused, completed, converted, cancelled

  // Conversion (ketika tabungan dikonversi jadi order)
  convertedToOrderId: text("converted_to_order_id").references(() => qurbanOrders.id),
  convertedAt: timestamp("converted_at", { precision: 3, mode: "date" }),

  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanSavingsRelations = relations(qurbanSavings, ({ one, many }) => ({
  user: one(users, {
    fields: [qurbanSavings.userId],
    references: [users.id],
  }),
  // New relationship with package-period junction
  targetPackagePeriod: one(qurbanPackagePeriods, {
    fields: [qurbanSavings.targetPackagePeriodId],
    references: [qurbanPackagePeriods.id],
  }),
  // Legacy relationships (kept for backward compatibility)
  targetPeriod: one(qurbanPeriods, {
    fields: [qurbanSavings.targetPeriodId],
    references: [qurbanPeriods.id],
  }),
  targetPackage: one(qurbanPackages, {
    fields: [qurbanSavings.targetPackageId],
    references: [qurbanPackages.id],
  }),
  convertedOrder: one(qurbanOrders, {
    fields: [qurbanSavings.convertedToOrderId],
    references: [qurbanOrders.id],
  }),
  transactions: many(qurbanSavingsTransactions),
}));

// Import after declaration
import { qurbanSavingsTransactions } from "./qurban-savings-transactions";

export type QurbanSaving = typeof qurbanSavings.$inferSelect;
export type NewQurbanSaving = typeof qurbanSavings.$inferInsert;
