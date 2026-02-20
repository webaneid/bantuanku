import { pgTable, text, timestamp, integer, bigint, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { transactions } from "./transactions";

export const transactionPayments = pgTable("transaction_payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  paymentNumber: text("payment_number").unique().notNull(),
  transactionId: text("transaction_id")
    .references(() => transactions.id, { onDelete: "cascade" })
    .notNull(),

  // Payment Details
  amount: bigint("amount", { mode: "number" }).notNull(),
  paymentDate: timestamp("payment_date", { precision: 3, mode: "date" }).defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentChannel: text("payment_channel"),

  // Installment Support
  installmentNumber: integer("installment_number"),

  // Proof & Verification
  paymentProof: text("payment_proof"),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { precision: 3, mode: "date" }),
  rejectedBy: text("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at", { precision: 3, mode: "date" }),

  // Status
  status: text("status").default("pending").notNull(), // pending, verified, rejected
  rejectionReason: text("rejection_reason"),

  // Gateway Integration
  externalId: text("external_id"),
  paymentCode: text("payment_code"),
  paymentUrl: text("payment_url"),
  qrCode: text("qr_code"),
  expiredAt: timestamp("expired_at", { precision: 3, mode: "date" }),
  gatewayCode: text("gateway_code"),
  webhookPayload: jsonb("webhook_payload"),

  // Ledger Integration
  ledgerEntryId: text("ledger_entry_id"),

  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const transactionPaymentsRelations = relations(transactionPayments, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionPayments.transactionId],
    references: [transactions.id],
  }),
  verifier: one(users, {
    fields: [transactionPayments.verifiedBy],
    references: [users.id],
  }),
  rejecter: one(users, {
    fields: [transactionPayments.rejectedBy],
    references: [users.id],
  }),
}));

export type TransactionPayment = typeof transactionPayments.$inferSelect;
export type NewTransactionPayment = typeof transactionPayments.$inferInsert;
