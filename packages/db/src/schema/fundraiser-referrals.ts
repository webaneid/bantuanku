import { pgTable, text, timestamp, bigint, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { fundraisers } from "./fundraiser";
import { transactions } from "./transactions";

export const fundraiserReferrals = pgTable("fundraiser_referrals", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  fundraiserId: text("fundraiser_id").notNull().references(() => fundraisers.id),
  transactionId: text("transaction_id").notNull().references(() => transactions.id),

  donationAmount: bigint("donation_amount", { mode: "number" }).notNull(),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: bigint("commission_amount", { mode: "number" }).notNull(),

  status: text("status").default("pending").notNull(),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),

  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const fundraiserReferralsRelations = relations(fundraiserReferrals, ({ one }) => ({
  fundraiser: one(fundraisers, {
    fields: [fundraiserReferrals.fundraiserId],
    references: [fundraisers.id],
  }),
  transaction: one(transactions, {
    fields: [fundraiserReferrals.transactionId],
    references: [transactions.id],
  }),
}));

export type FundraiserReferral = typeof fundraiserReferrals.$inferSelect;
export type NewFundraiserReferral = typeof fundraiserReferrals.$inferInsert;
