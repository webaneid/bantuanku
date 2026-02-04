import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";

/**
 * Entity Bank Accounts Table
 * Universal table for storing bank account information for any entity
 * (vendors, employees, donors, mustahiqs, etc)
 */
export const entityBankAccounts = pgTable("entity_bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Entity relationship
  entityType: text("entity_type").notNull(), // vendor, employee, donor, mustahiq, etc
  entityId: text("entity_id").notNull(), // ID of the related entity

  // Bank account details
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolderName: text("account_holder_name").notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type EntityBankAccount = typeof entityBankAccounts.$inferSelect;
export type NewEntityBankAccount = typeof entityBankAccounts.$inferInsert;
