import { pgTable, text, timestamp, bigint, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { qurbanOrders } from "./qurban-orders";
import { users } from "./user";

// Legacy table - will be removed after migration to universal transactions
export const qurbanPayments = pgTable("qurban_payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  paymentNumber: text("payment_number").unique().notNull(),

  orderId: text("order_id").references(() => qurbanOrders.id).notNull(),

  amount: bigint("amount", { mode: "number" }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentChannel: text("payment_channel"),
  paymentProof: text("payment_proof"),

  status: text("status").default("pending").notNull(),
  installmentNumber: integer("installment_number"),

  notes: text("notes"),

  verifiedAt: timestamp("verified_at", { precision: 3, mode: "date" }),
  verifiedBy: text("verified_by").references(() => users.id),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanPaymentsRelations = relations(qurbanPayments, ({ one }) => ({
  order: one(qurbanOrders, {
    fields: [qurbanPayments.orderId],
    references: [qurbanOrders.id],
  }),
  verifier: one(users, {
    fields: [qurbanPayments.verifiedBy],
    references: [users.id],
  }),
}));

export type QurbanPayment = typeof qurbanPayments.$inferSelect;
export type NewQurbanPayment = typeof qurbanPayments.$inferInsert;
