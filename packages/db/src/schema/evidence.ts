import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { ledger } from "./ledger";
import { users } from "./user";

export const evidences = pgTable("evidences", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  disbursementId: text("disbursement_id").notNull().references(() => ledger.id, { onDelete: "cascade" }),

  type: text("type").notNull(), // receipt, invoice, photo, document
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  amount: bigint("amount", { mode: "number" }),

  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { precision: 3, mode: "date" }).defaultNow().notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const evidencesRelations = relations(evidences, ({ one }) => ({
  ledgerEntry: one(ledger, {
    fields: [evidences.disbursementId],
    references: [ledger.id],
  }),
  uploader: one(users, {
    fields: [evidences.uploadedBy],
    references: [users.id],
  }),
}));

export type Evidence = typeof evidences.$inferSelect;
export type NewEvidence = typeof evidences.$inferInsert;
