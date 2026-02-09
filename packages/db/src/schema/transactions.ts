import { pgTable, text, timestamp, integer, bigint, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { donatur } from "./donatur";

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  transactionNumber: text("transaction_number").unique().notNull(),

  // Product Reference (Polymorphic)
  productType: text("product_type").notNull(), // 'campaign', 'zakat', 'qurban'
  productId: text("product_id").notNull(),

  // Product Snapshot (Denormalized for display)
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  productImage: text("product_image"),

  // Order Details
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
  subtotal: bigint("subtotal", { mode: "number" }).notNull(),
  adminFee: bigint("admin_fee", { mode: "number" }).default(0),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(),

  // Donor Information
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone"),
  isAnonymous: boolean("is_anonymous").default(false),

  // User Association (for logged-in users)
  userId: text("user_id").references(() => users.id),
  donaturId: text("donatur_id").references(() => donatur.id),

  // Payment
  paymentMethodId: text("payment_method_id"),
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, partial, paid, cancelled
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),

  // Type-Specific Data (Conditional Fields as JSON)
  typeSpecificData: jsonb("type_specific_data"),

  message: text("message"),
  notes: text("notes"),

  // Ledger Integration
  ledgerEntryId: text("ledger_entry_id"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Import after declaration to avoid circular dependency
import { transactionPayments } from "./transaction-payments";

export const transactionsRelations = relations(transactions, ({ many, one }) => ({
  payments: many(transactionPayments),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  donatur: one(donatur, {
    fields: [transactions.donaturId],
    references: [donatur.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
