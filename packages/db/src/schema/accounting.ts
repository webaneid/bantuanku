import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { chartOfAccounts } from "./coa";
import { users } from "./user";

// Ledger Entries - Journal Entries
export const ledgerEntries = pgTable("ledger_entries", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  entryNumber: text("entry_number").unique().notNull(), // JE-202401-XXXX

  refType: text("ref_type").notNull(), // donation, disbursement, adjustment, etc
  refId: text("ref_id"), // reference to source transaction

  postedAt: timestamp("posted_at", { precision: 3, mode: "date" }).notNull(),
  memo: text("memo"), // description of the entry
  status: text("status").default("posted").notNull(), // posted, voided

  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Ledger Lines - Individual debit/credit lines within an entry
export const ledgerLines = pgTable("ledger_lines", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  entryId: text("entry_id").notNull().references(() => ledgerEntries.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => chartOfAccounts.id),

  description: text("description"),
  debit: bigint("debit", { mode: "number" }).default(0).notNull(),
  credit: bigint("credit", { mode: "number" }).default(0).notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Alias for chartOfAccounts to match import expectations
export { chartOfAccounts as ledgerAccounts } from "./coa";

// Relations
export const ledgerEntriesRelations = relations(ledgerEntries, ({ one, many }) => ({
  creator: one(users, {
    fields: [ledgerEntries.createdBy],
    references: [users.id],
  }),
  lines: many(ledgerLines),
}));

export const ledgerLinesRelations = relations(ledgerLines, ({ one }) => ({
  entry: one(ledgerEntries, {
    fields: [ledgerLines.entryId],
    references: [ledgerEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [ledgerLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type LedgerLine = typeof ledgerLines.$inferSelect;
export type NewLedgerLine = typeof ledgerLines.$inferInsert;
