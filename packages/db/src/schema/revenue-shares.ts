import { pgTable, text, timestamp, bigint, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { transactions } from "./transactions";
import { fundraisers } from "./fundraiser";
import { mitra } from "./mitra";

export const revenueShares = pgTable("revenue_shares", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),

  donationAmount: bigint("donation_amount", { mode: "number" }).notNull(),

  amilPercentage: decimal("amil_percentage", { precision: 5, scale: 2 }).notNull(),
  amilTotalAmount: bigint("amil_total_amount", { mode: "number" }).notNull(),

  developerPercentage: decimal("developer_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  developerAmount: bigint("developer_amount", { mode: "number" }).default(0).notNull(),

  fundraiserPercentage: decimal("fundraiser_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  fundraiserAmount: bigint("fundraiser_amount", { mode: "number" }).default(0).notNull(),
  fundraiserId: text("fundraiser_id").references(() => fundraisers.id),

  mitraPercentage: decimal("mitra_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  mitraAmount: bigint("mitra_amount", { mode: "number" }).default(0).notNull(),
  mitraId: text("mitra_id").references(() => mitra.id),

  amilNetAmount: bigint("amil_net_amount", { mode: "number" }).notNull(),
  programAmount: bigint("program_amount", { mode: "number" }).notNull(),

  status: text("status").default("calculated").notNull(),
  calculatedAt: timestamp("calculated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  distributedAt: timestamp("distributed_at", { precision: 3, mode: "date" }),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const revenueSharesRelations = relations(revenueShares, ({ one }) => ({
  transaction: one(transactions, {
    fields: [revenueShares.transactionId],
    references: [transactions.id],
  }),
  fundraiser: one(fundraisers, {
    fields: [revenueShares.fundraiserId],
    references: [fundraisers.id],
  }),
  mitra: one(mitra, {
    fields: [revenueShares.mitraId],
    references: [mitra.id],
  }),
}));

export type RevenueShare = typeof revenueShares.$inferSelect;
export type NewRevenueShare = typeof revenueShares.$inferInsert;
