import { pgTable, text, timestamp, integer, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanOrders } from "./qurban-orders";

export const qurbanPayments = pgTable("qurban_payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  paymentNumber: text("payment_number").unique().notNull(), // PAY-QBN-2026-00001
  orderId: text("order_id")
    .references(() => qurbanOrders.id, { onDelete: "cascade" })
    .notNull(),

  // Payment Details
  amount: bigint("amount", { mode: "number" }).notNull(),
  paymentDate: timestamp("payment_date", { precision: 3, mode: "date" }).defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(), // 'bank_transfer', 'ewallet', 'cash', 'va'
  paymentChannel: text("payment_channel"), // 'BCA', 'Mandiri', 'GoPay', dst

  // Installment Info (jika pembayaran cicilan)
  installmentNumber: integer("installment_number"), // Cicilan ke-berapa (1, 2, 3, dst)

  // Proof & Verification
  paymentProof: text("payment_proof"), // URL bukti transfer
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { precision: 3, mode: "date" }),

  // Status
  status: text("status").default("pending").notNull(), // pending, verified, rejected

  notes: text("notes"),
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
