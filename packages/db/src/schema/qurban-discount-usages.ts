import { pgTable, text, timestamp, bigint, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanDiscounts } from "./qurban-discounts";

export const qurbanDiscountUsages = pgTable("qurban_discount_usages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  discountId: text("discount_id").notNull().references(() => qurbanDiscounts.id, { onDelete: "restrict" }),
  orderId: text("order_id").references(() => qurbanOrders.id, { onDelete: "restrict" }).unique(),
  savingsId: text("savings_id").references(() => qurbanSavings.id, { onDelete: "restrict" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  donorPhone: text("donor_phone"),
  discountAmount: bigint("discount_amount", { mode: "number" }).notNull(),
  appliedAt: timestamp("applied_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const qurbanDiscountUsagesRelations = relations(qurbanDiscountUsages, ({ one }) => ({
  discount: one(qurbanDiscounts, {
    fields: [qurbanDiscountUsages.discountId],
    references: [qurbanDiscounts.id],
  }),
  order: one(qurbanOrders, {
    fields: [qurbanDiscountUsages.orderId],
    references: [qurbanOrders.id],
  }),
  savings: one(qurbanSavings, {
    fields: [qurbanDiscountUsages.savingsId],
    references: [qurbanSavings.id],
  }),
  user: one(users, {
    fields: [qurbanDiscountUsages.userId],
    references: [users.id],
  }),
}));

import { qurbanOrders } from "./qurban-orders";
import { qurbanSavings } from "./qurban-savings";

export type QurbanDiscountUsage = typeof qurbanDiscountUsages.$inferSelect;
export type NewQurbanDiscountUsage = typeof qurbanDiscountUsages.$inferInsert;
