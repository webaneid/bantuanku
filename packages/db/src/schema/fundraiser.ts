import { pgTable, text, timestamp, integer, bigint, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { donatur } from "./donatur";
import { employees } from "./employee";
import { users } from "./user";
import { fundraiserReferrals } from "./fundraiser-referrals";

export const fundraisers = pgTable("fundraisers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Relasi (salah satu)
  donaturId: text("donatur_id").references(() => donatur.id),
  employeeId: text("employee_id").references(() => employees.id),

  // Data Fundraiser
  code: text("code").unique().notNull(),
  slug: text("slug").unique(),

  // Status
  status: text("status").default("pending").notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { precision: 3, mode: "date" }),

  // Komisi & Saldo
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default("5.00"),
  totalReferrals: integer("total_referrals").default(0),
  totalDonationAmount: bigint("total_donation_amount", { mode: "number" }).default(0),
  totalCommissionEarned: bigint("total_commission_earned", { mode: "number" }).default(0),
  currentBalance: bigint("current_balance", { mode: "number" }).default(0),
  totalWithdrawn: bigint("total_withdrawn", { mode: "number" }).default(0),

  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const fundraisersRelations = relations(fundraisers, ({ one, many }) => ({
  donatur: one(donatur, {
    fields: [fundraisers.donaturId],
    references: [donatur.id],
  }),
  employee: one(employees, {
    fields: [fundraisers.employeeId],
    references: [employees.id],
  }),
  approvedByUser: one(users, {
    fields: [fundraisers.approvedBy],
    references: [users.id],
  }),
  referrals: many(fundraiserReferrals),
}));

export type Fundraiser = typeof fundraisers.$inferSelect;
export type NewFundraiser = typeof fundraisers.$inferInsert;
