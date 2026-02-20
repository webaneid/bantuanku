import { pgTable, text, bigint, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";
import { bankAccounts } from "./bank";
import { chartOfAccounts } from "./coa";
import { ledgerEntries } from "./accounting";

export const disbursements = pgTable("disbursements", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  disbursementNumber: text("disbursement_number").unique().notNull(),

  // Type discrimination: campaign, zakat, qurban, operational, vendor, revenue_share
  disbursementType: text("disbursement_type").notNull(),

  // Optional Reference (Polymorphic)
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  referenceName: text("reference_name"),

  // Basic info
  amount: bigint("amount", { mode: "number" }).notNull(),
  transactionType: text("transaction_type").default("expense").notNull(),
  category: text("category").notNull(),

  // Source of Funds (CRITICAL for Zakat)
  // Note: These reference settings JSON, not bank_accounts table
  bankAccountId: text("bank_account_id").notNull(), // Legacy field
  sourceBankId: text("source_bank_id"),
  sourceBankName: text("source_bank_name"),
  sourceBankAccount: text("source_bank_account"),

  // Recipient Information
  // Recipient: vendor, employee, coordinator, mustahiq, manual, fundraiser, mitra
  recipientType: text("recipient_type"),
  recipientId: text("recipient_id"),
  recipientName: text("recipient_name").notNull(),
  recipientContact: text("recipient_contact"),
  recipientBankName: text("recipient_bank_name"),
  recipientBankAccount: text("recipient_bank_account"),
  recipientBankAccountName: text("recipient_bank_account_name"),

  // Purpose & Description
  purpose: text("purpose"),
  description: text("description"),
  notes: text("notes"),

  // Payment Evidence
  paymentProof: text("payment_proof"),
  paymentMethod: text("payment_method"),

  // Payment Execution Details
  transferProofUrl: text("transfer_proof_url"),
  transferDate: timestamp("transfer_date", { precision: 3, mode: "date" }),
  transferredAmount: bigint("transferred_amount", { mode: "number" }),
  additionalFees: bigint("additional_fees", { mode: "number" }).default(0),
  destinationBankId: text("destination_bank_id"),

  // Approval workflow
  status: text("status").default("draft").notNull(),
  rejectionReason: text("rejection_reason"),

  createdBy: text("created_by").notNull().references(() => users.id),
  submittedBy: text("submitted_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  rejectedBy: text("rejected_by").references(() => users.id),
  paidBy: text("paid_by").references(() => users.id),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  submittedAt: timestamp("submitted_at", { precision: 3, mode: "date" }),
  approvedAt: timestamp("approved_at", { precision: 3, mode: "date" }),
  rejectedAt: timestamp("rejected_at", { precision: 3, mode: "date" }),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),

  // Backward compatibility (OPTIONAL)
  expenseAccountId: text("expense_account_id").references(() => chartOfAccounts.id),
  ledgerEntryId: text("ledger_entry_id").references(() => ledgerEntries.id),

  // Type-specific data (JSONB for conditional fields)
  typeSpecificData: jsonb("type_specific_data"),
});

export type Disbursement = typeof disbursements.$inferSelect;
export type NewDisbursement = typeof disbursements.$inferInsert;

export const disbursementActivityReports = pgTable("disbursement_activity_reports", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  disbursementId: text("disbursement_id").notNull().references(() => disbursements.id, { onDelete: "cascade" }),

  // Activity Details
  reportDate: timestamp("report_date", { precision: 3, mode: "date" }).notNull(),
  reportDescription: text("report_description").notNull(),
  photos: text("photos"), // JSON array of photo URLs
  videoUrl: text("video_url"),

  // Recipients Detail (for coordinator type)
  recipientCount: bigint("recipient_count", { mode: "number" }),
  recipientList: text("recipient_list"), // JSON array of recipient details

  addedBy: text("added_by").references(() => users.id),
  addedAt: timestamp("added_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type DisbursementActivityReport = typeof disbursementActivityReports.$inferSelect;
export type NewDisbursementActivityReport = typeof disbursementActivityReports.$inferInsert;
