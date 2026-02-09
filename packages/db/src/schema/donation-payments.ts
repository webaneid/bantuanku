import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { donations } from "./donation";

export const donationPayments = pgTable("donation_payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  paymentNumber: text("payment_number").unique().notNull(),
  donationId: text("donation_id")
    .references(() => donations.id, { onDelete: "cascade" })
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

export const donationPaymentsRelations = relations(donationPayments, ({ one }) => ({
  donation: one(donations, {
    fields: [donationPayments.donationId],
    references: [donations.id],
  }),
  verifier: one(users, {
    fields: [donationPayments.verifiedBy],
    references: [users.id],
  }),
}));

export type DonationPayment = typeof donationPayments.$inferSelect;
export type NewDonationPayment = typeof donationPayments.$inferInsert;
