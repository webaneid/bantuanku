import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { donations } from "./donation";

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceNumber: text("invoice_number").unique().notNull(),
  donationId: text("donation_id").notNull().references(() => donations.id),

  issuedAt: timestamp("issued_at", { precision: 3, mode: "date" }).notNull(),
  issuedBy: text("issued_by"),
  dueDate: timestamp("due_date", { precision: 3, mode: "date" }),

  subtotal: bigint("subtotal", { mode: "number" }).notNull(),
  feeAmount: bigint("fee_amount", { mode: "number" }).default(0).notNull(),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
  currency: text("currency").default("IDR").notNull(),

  payerName: text("payer_name").notNull(),
  payerEmail: text("payer_email"),
  payerPhone: text("payer_phone"),
  payerAddress: text("payer_address"),

  status: text("status").default("issued").notNull(),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),

  pdfUrl: text("pdf_url"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
