import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const bankAccounts = pgTable("bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  bankCode: text("bank_code").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  branch: text("branch"),
  coaCode: text("coa_code").default("1020"),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
