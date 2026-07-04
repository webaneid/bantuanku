import { pgTable, text, timestamp, bigint, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";

export const qurbanDiscounts = pgTable("qurban_discounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  type: text("type").notNull(),             // 'automatic' | 'voucher'
  discountType: text("discount_type").notNull(), // 'percentage' | 'nominal'
  discountValue: bigint("discount_value", { mode: "number" }).notNull(),
  maxDiscount: bigint("max_discount", { mode: "number" }),
  scopeType: text("scope_type").notNull().default("all"), // 'all' | 'package' | 'package_period' | 'animal_type'
  scopeId: text("scope_id"),               // packageId / packagePeriodId / 'cow'/'goat'/'sheep'
  code: text("code").unique(),             // hanya untuk type=voucher, uppercase
  startDate: timestamp("start_date", { precision: 3, mode: "date", withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { precision: 3, mode: "date", withTimezone: true }).notNull(),
  maxUsage: integer("max_usage"),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const qurbanDiscountsRelations = relations(qurbanDiscounts, ({ one, many }) => ({
  creator: one(users, {
    fields: [qurbanDiscounts.createdBy],
    references: [users.id],
  }),
  usages: many(qurbanDiscountUsages),
}));

import { qurbanDiscountUsages } from "./qurban-discount-usages";

export type QurbanDiscount = typeof qurbanDiscounts.$inferSelect;
export type NewQurbanDiscount = typeof qurbanDiscounts.$inferInsert;
