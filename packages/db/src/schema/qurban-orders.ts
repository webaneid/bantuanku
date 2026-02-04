import { pgTable, text, timestamp, integer, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanPackages } from "./qurban-packages";
import { qurbanPackagePeriods } from "./qurban-package-periods";
import { qurbanSharedGroups } from "./qurban-shared-groups";

export const qurbanOrders = pgTable("qurban_orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderNumber: text("order_number").unique().notNull(), // QBN-2026-00001

  // User Info
  userId: text("user_id").references(() => users.id), // NULL jika guest/manual entry
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone").notNull(),

  // Package Info (new structure with package-period junction)
  packagePeriodId: text("package_period_id").references(() => qurbanPackagePeriods.id),

  // Legacy field (kept for backward compatibility)
  packageId: text("package_id").references(() => qurbanPackages.id),

  sharedGroupId: text("shared_group_id").references(() => qurbanSharedGroups.id), // NULL jika individual

  // Pricing
  quantity: integer("quantity").default(1).notNull(), // Untuk individual bisa > 1 (misal: beli 2 kambing)
  unitPrice: bigint("unit_price", { mode: "number" }).notNull(), // Harga satuan saat order
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(), // quantity * unitPrice

  // Pembayaran
  paymentMethod: text("payment_method").notNull(), // 'full' (lunas) atau 'installment' (cicilan)
  installmentFrequency: text("installment_frequency"), // 'weekly', 'monthly', 'custom'
  installmentCount: integer("installment_count"), // Berapa kali cicilan
  installmentAmount: bigint("installment_amount", { mode: "number" }), // Nominal per cicilan
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(), // Total yang sudah dibayar

  // Status
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, partial, paid, overdue
  orderStatus: text("order_status").default("pending").notNull(), // pending, confirmed, cancelled, executed

  // Atas Nama (penyembelihan)
  onBehalfOf: text("on_behalf_of").notNull(), // Atas nama siapa qurban ini

  // Timestamps
  orderDate: timestamp("order_date", { precision: 3, mode: "date" }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { precision: 3, mode: "date" }),
  executedAt: timestamp("executed_at", { precision: 3, mode: "date" }),

  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id), // Admin yang input (jika manual)
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanOrdersRelations = relations(qurbanOrders, ({ one, many }) => ({
  user: one(users, {
    fields: [qurbanOrders.userId],
    references: [users.id],
  }),
  // New relationship with package-period junction
  packagePeriod: one(qurbanPackagePeriods, {
    fields: [qurbanOrders.packagePeriodId],
    references: [qurbanPackagePeriods.id],
  }),
  // Legacy relationship (kept for backward compatibility)
  package: one(qurbanPackages, {
    fields: [qurbanOrders.packageId],
    references: [qurbanPackages.id],
  }),
  sharedGroup: one(qurbanSharedGroups, {
    fields: [qurbanOrders.sharedGroupId],
    references: [qurbanSharedGroups.id],
  }),
  creator: one(users, {
    fields: [qurbanOrders.createdBy],
    references: [users.id],
  }),
  payments: many(qurbanPayments),
  executions: many(qurbanExecutions),
}));

// Import after declaration
import { qurbanPayments } from "./qurban-payments";
import { qurbanExecutions } from "./qurban-executions";

export type QurbanOrder = typeof qurbanOrders.$inferSelect;
export type NewQurbanOrder = typeof qurbanOrders.$inferInsert;
