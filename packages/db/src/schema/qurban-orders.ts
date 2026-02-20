import { pgTable, text, timestamp, bigint, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanPackages } from "./qurban-packages";
import { qurbanPackagePeriods } from "./qurban-package-periods";
import { qurbanSharedGroups } from "./qurban-shared-groups";

// Legacy table - will be removed after migration to universal transactions
export const qurbanOrders = pgTable("qurban_orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderNumber: text("order_number").unique().notNull(),

  userId: text("user_id").references(() => users.id),
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone").notNull(),

  packageId: text("package_id").references(() => qurbanPackages.id),
  packagePeriodId: text("package_period_id").references(() => qurbanPackagePeriods.id),
  sharedGroupId: text("shared_group_id").references(() => qurbanSharedGroups.id),

  quantity: bigint("quantity", { mode: "number" }).notNull().default(1),
  unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
  adminFee: bigint("admin_fee", { mode: "number" }).default(0),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(),

  paymentMethod: text("payment_method").notNull(),
  paymentMethodId: text("payment_method_id"),
  metadata: jsonb("metadata"),
  installmentFrequency: text("installment_frequency"),
  installmentCount: bigint("installment_count", { mode: "number" }),
  installmentAmount: bigint("installment_amount", { mode: "number" }),

  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(),
  paymentStatus: text("payment_status").default("pending").notNull(),
  orderStatus: text("order_status").default("pending").notNull(),

  onBehalfOf: text("on_behalf_of"),
  notes: text("notes"),

  orderDate: timestamp("order_date", { precision: 3, mode: "date" }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { precision: 3, mode: "date" }),
  executedAt: timestamp("executed_at", { precision: 3, mode: "date" }),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanOrdersRelations = relations(qurbanOrders, ({ one }) => ({
  user: one(users, {
    fields: [qurbanOrders.userId],
    references: [users.id],
  }),
  package: one(qurbanPackages, {
    fields: [qurbanOrders.packageId],
    references: [qurbanPackages.id],
  }),
  packagePeriod: one(qurbanPackagePeriods, {
    fields: [qurbanOrders.packagePeriodId],
    references: [qurbanPackagePeriods.id],
  }),
  sharedGroup: one(qurbanSharedGroups, {
    fields: [qurbanOrders.sharedGroupId],
    references: [qurbanSharedGroups.id],
  }),
}));

export type QurbanOrder = typeof qurbanOrders.$inferSelect;
export type NewQurbanOrder = typeof qurbanOrders.$inferInsert;
