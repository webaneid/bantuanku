import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { zakatDonations } from "./zakat-donations";

export const zakatPayments = pgTable("zakat_payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  paymentNumber: text("payment_number").unique().notNull(),
  zakatDonationId: text("zakat_donation_id")
    .references(() => zakatDonations.id, { onDelete: "cascade" })
    .notNull(),

  // Payment Details
  amount: bigint("amount", { mode: "number" }).notNull(),
  paymentDate: timestamp("payment_date", { precision: 3, mode: "date" }).defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(), // 'bank_transfer', 'ewallet', 'qris', 'va'
  paymentChannel: text("payment_channel"), // Bank code, QRIS ID, etc

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

export const zakatPaymentsRelations = relations(zakatPayments, ({ one }) => ({
  zakatDonation: one(zakatDonations, {
    fields: [zakatPayments.zakatDonationId],
    references: [zakatDonations.id],
  }),
  verifier: one(users, {
    fields: [zakatPayments.verifiedBy],
    references: [users.id],
  }),
}));

export type ZakatPayment = typeof zakatPayments.$inferSelect;
export type NewZakatPayment = typeof zakatPayments.$inferInsert;
