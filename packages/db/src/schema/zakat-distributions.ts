import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { zakatTypes } from "./zakat-types";
import { users } from "./user";

export const zakatDistributions = pgTable("zakat_distributions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  referenceId: text("reference_id").unique().notNull(),
  zakatTypeId: text("zakat_type_id")
    .references(() => zakatTypes.id)
    .notNull(),

  // Penerima (8 Asnaf)
  recipientType: text("recipient_type"), // "coordinator" or "direct"
  coordinatorId: text("coordinator_id"), // employee ID if type is coordinator
  mustahiqId: text("mustahiq_id"), // mustahiq ID if type is direct
  recipientCategory: text("recipient_category").notNull(), // fakir, miskin, amil, mualaf, riqab, gharim, fisabilillah, ibnus_sabil
  recipientName: text("recipient_name").notNull(),
  recipientContact: text("recipient_contact"),
  
  // For coordinator type
  distributionLocation: text("distribution_location"), // location where distribution happened
  recipientCount: bigint("recipient_count", { mode: "number" }), // number of recipients

  // Jumlah
  amount: bigint("amount", { mode: "number" }).notNull(),

  // Detail
  purpose: text("purpose").notNull(),
  description: text("description"),
  notes: text("notes"),

  // Status
  status: text("status").default("draft").notNull(), // draft, approved, disbursed

  // Transfer Info (filled when approved)
  sourceBankId: text("source_bank_id"), // ID from payment_bank_accounts setting
  sourceBankName: text("source_bank_name"), // e.g., "Bank BCA"
  sourceBankAccount: text("source_bank_account"), // e.g., "1234567890"
  targetBankName: text("target_bank_name"), // from employee/mustahiq
  targetBankAccount: text("target_bank_account"), // from employee/mustahiq
  targetBankAccountName: text("target_bank_account_name"), // from employee/mustahiq
  transferProof: text("transfer_proof"), // URL/path to uploaded file

  // Workflow
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { precision: 3, mode: "date" }),
  disbursedBy: text("disbursed_by").references(() => users.id),
  disbursedAt: timestamp("disbursed_at", { precision: 3, mode: "date" }),
  
  // Activity Report (only for coordinator type, filled after disbursed)
  reportDate: timestamp("report_date", { precision: 3, mode: "date" }), // actual date of distribution activity
  reportDescription: text("report_description"), // activity description
  reportPhotos: text("report_photos"), // JSON array of photo URLs
  reportAddedBy: text("report_added_by").references(() => users.id),
  reportAddedAt: timestamp("report_added_at", { precision: 3, mode: "date" }),

  createdBy: text("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const zakatDistributionsRelations = relations(zakatDistributions, ({ one }) => ({
  zakatType: one(zakatTypes, {
    fields: [zakatDistributions.zakatTypeId],
    references: [zakatTypes.id],
  }),
  creator: one(users, {
    fields: [zakatDistributions.createdBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [zakatDistributions.approvedBy],
    references: [users.id],
  }),
  disburser: one(users, {
    fields: [zakatDistributions.disbursedBy],
    references: [users.id],
  }),
}));

export type ZakatDistribution = typeof zakatDistributions.$inferSelect;
export type NewZakatDistribution = typeof zakatDistributions.$inferInsert;
