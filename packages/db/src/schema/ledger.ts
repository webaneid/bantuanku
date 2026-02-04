import { pgTable, text, timestamp, bigint, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { campaigns } from "./campaign";
import { users } from "./user";
import { chartOfAccounts } from "./coa";
import { evidences } from "./evidence";
import { vendors } from "./vendor";
import { employees } from "./employee";

export const ledger = pgTable("ledger", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  referenceId: text("reference_id").unique().notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id),

  amount: bigint("amount", { mode: "number" }).notNull(),
  expenseAccountId: text("expense_account_id").references(() => chartOfAccounts.id), // Akun expense yang akan di-debit

  // Recipient References (optional - can be vendor, employee, or manual entry)
  vendorId: text("vendor_id").references(() => vendors.id),
  employeeId: text("employee_id").references(() => employees.id),

  recipientName: text("recipient_name").notNull(),
  recipientBank: text("recipient_bank"),
  recipientAccount: text("recipient_account"),
  recipientPhone: text("recipient_phone"),

  purpose: text("purpose").notNull(),
  description: text("description"),
  notes: text("notes"), // Catatan internal
  metadata: jsonb("metadata"), // Data tambahan fleksibel

  status: text("status").default("draft").notNull(), // draft, submitted, approved, rejected, paid

  createdBy: text("created_by").references(() => users.id),
  submittedBy: text("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at", { precision: 3, mode: "date" }),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { precision: 3, mode: "date" }),
  rejectedBy: text("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at", { precision: 3, mode: "date" }),
  rejectionReason: text("rejection_reason"),

  paidBy: text("paid_by").references(() => users.id),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),
  paymentMethod: text("payment_method"), // transfer, cash, check, etc

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const ledgerRelations = relations(ledger, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [ledger.campaignId],
    references: [campaigns.id],
  }),
  expenseAccount: one(chartOfAccounts, {
    fields: [ledger.expenseAccountId],
    references: [chartOfAccounts.id],
  }),
  vendor: one(vendors, {
    fields: [ledger.vendorId],
    references: [vendors.id],
  }),
  employee: one(employees, {
    fields: [ledger.employeeId],
    references: [employees.id],
  }),
  creator: one(users, {
    fields: [ledger.createdBy],
    references: [users.id],
  }),
  submitter: one(users, {
    fields: [ledger.submittedBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [ledger.approvedBy],
    references: [users.id],
  }),
  rejecter: one(users, {
    fields: [ledger.rejectedBy],
    references: [users.id],
  }),
  payer: one(users, {
    fields: [ledger.paidBy],
    references: [users.id],
  }),
  evidences: many(evidences),
}));

export type Disbursement = typeof ledger.$inferSelect;
export type NewDisbursement = typeof ledger.$inferInsert;
