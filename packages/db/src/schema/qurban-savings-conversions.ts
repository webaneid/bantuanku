import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { qurbanSavings } from "./qurban-savings";
import { users } from "./user";

export const qurbanSavingsConversions = pgTable("qurban_savings_conversions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  savingsId: text("savings_id")
    .references(() => qurbanSavings.id, { onDelete: "cascade" })
    .notNull(),

  // Nilai tabungan yang dialokasikan saat konversi (non-cash)
  convertedAmount: bigint("converted_amount", { mode: "number" }).notNull(),

  // Snapshot referensi order saat konversi
  orderId: text("order_id"),
  orderNumber: text("order_number"),
  orderTransactionId: text("order_transaction_id"),

  // Referensi data lama untuk idempotent backfill (optional)
  sourceLegacyTransactionId: text("source_legacy_transaction_id"),

  notes: text("notes"),
  convertedBy: text("converted_by").references(() => users.id),
  convertedAt: timestamp("converted_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanSavingsConversionsRelations = relations(qurbanSavingsConversions, ({ one }) => ({
  savings: one(qurbanSavings, {
    fields: [qurbanSavingsConversions.savingsId],
    references: [qurbanSavings.id],
  }),
  converter: one(users, {
    fields: [qurbanSavingsConversions.convertedBy],
    references: [users.id],
  }),
}));

export type QurbanSavingsConversion = typeof qurbanSavingsConversions.$inferSelect;
export type NewQurbanSavingsConversion = typeof qurbanSavingsConversions.$inferInsert;
