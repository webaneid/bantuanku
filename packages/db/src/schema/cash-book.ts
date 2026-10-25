import { pgTable, text, timestamp, bigint, boolean, index, unique } from "drizzle-orm/pg-core";
import { createId } from "../utils";

/**
 * Buku Kas (ADR-0016). Satu baris `cash_entries` per pergerakan uang fisik; append-only (koreksi = entri pembalik).
 * Sengaja TANPA FK ke transactions/disbursements/campaigns agar jejak tidak hilang bila sumbernya dihapus.
 */
export const cashAccounts = pgTable("cash_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  kind: text("kind").notNull(), // bank | qris | gateway | cash | unmapped
  name: text("name").notNull(),
  refKey: text("ref_key").notNull().unique(), // id settings (bank-<ts>, qris-<ts>) | kode gateway | cash | unmapped
  gatewayCode: text("gateway_code"),
  purpose: text("purpose").default("umum").notNull(), // umum | zakat
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const cashEntries = pgTable(
  "cash_entries",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    entryDate: timestamp("entry_date", { precision: 3, mode: "date", withTimezone: true }).notNull(),
    direction: text("direction").notNull(), // in | out
    amount: bigint("amount", { mode: "number" }).notNull(),
    component: text("component").notNull(), // pokok | kode_unik | kelebihan | biaya_transfer | koreksi
    fund: text("fund").notNull(), // zakat | qurban | campaign | wakaf | fidyah | operasional | bagi_hasil | lainnya
    fundDetail: text("fund_detail"),
    cashAccountId: text("cash_account_id")
      .notNull()
      .references(() => cashAccounts.id),
    method: text("method").notNull(), // bank_transfer | qris | gateway | cash | other
    gatewayCode: text("gateway_code"),
    refType: text("ref_type").notNull(), // transaction_payment | disbursement | adjustment
    refId: text("ref_id").notNull(),
    transactionId: text("transaction_id"),
    campaignId: text("campaign_id"),
    reversesEntryId: text("reverses_entry_id"),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uqRef: unique("uq_cash_entries_ref").on(table.refType, table.refId, table.component),
    idxDate: index("idx_cash_entries_date").on(table.entryDate),
    idxFundDate: index("idx_cash_entries_fund_date").on(table.fund, table.entryDate),
    idxAccountDate: index("idx_cash_entries_account_date").on(table.cashAccountId, table.entryDate),
    idxTransaction: index("idx_cash_entries_transaction").on(table.transactionId),
    idxCampaign: index("idx_cash_entries_campaign").on(table.campaignId),
  })
);

export type CashAccount = typeof cashAccounts.$inferSelect;
export type NewCashAccount = typeof cashAccounts.$inferInsert;
export type CashEntry = typeof cashEntries.$inferSelect;
export type NewCashEntry = typeof cashEntries.$inferInsert;
