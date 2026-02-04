import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanSavings } from "./qurban-savings";

export const qurbanSavingsTransactions = pgTable("qurban_savings_transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  transactionNumber: text("transaction_number").unique().notNull(), // TRX-SAV-QBN-2026-00001
  savingsId: text("savings_id")
    .references(() => qurbanSavings.id, { onDelete: "cascade" })
    .notNull(),

  // Transaction Details
  amount: bigint("amount", { mode: "number" }).notNull(),
  transactionType: text("transaction_type").notNull(), // 'deposit', 'withdrawal', 'conversion'
  transactionDate: timestamp("transaction_date", { precision: 3, mode: "date" }).defaultNow().notNull(),
  paymentMethod: text("payment_method"), // 'bank_transfer', 'ewallet', 'va', dst
  paymentChannel: text("payment_channel"),

  // Proof & Verification
  paymentProof: text("payment_proof"),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { precision: 3, mode: "date" }),
  status: text("status").default("pending").notNull(), // pending, verified, rejected

  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanSavingsTransactionsRelations = relations(qurbanSavingsTransactions, ({ one }) => ({
  savings: one(qurbanSavings, {
    fields: [qurbanSavingsTransactions.savingsId],
    references: [qurbanSavings.id],
  }),
  verifier: one(users, {
    fields: [qurbanSavingsTransactions.verifiedBy],
    references: [users.id],
  }),
}));

export type QurbanSavingsTransaction = typeof qurbanSavingsTransactions.$inferSelect;
export type NewQurbanSavingsTransaction = typeof qurbanSavingsTransactions.$inferInsert;
