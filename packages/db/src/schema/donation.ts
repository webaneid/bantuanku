import { pgTable, text, timestamp, boolean, bigint, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { campaigns } from "./campaign";
import { users } from "./user";
import { donatur } from "./donatur";
import { paymentMethods, paymentGateways } from "./payment";

export const donations = pgTable("donations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  referenceId: text("reference_id").unique().notNull(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  userId: text("user_id").references(() => users.id), // Legacy - untuk backward compatibility
  donaturId: text("donatur_id").references(() => donatur.id), // New - gunakan ini untuk donasi baru
  source: text("source").notNull(),

  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),

  amount: bigint("amount", { mode: "number" }).notNull(),
  feeAmount: bigint("fee_amount", { mode: "number" }).default(0).notNull(),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(), // Total yang sudah dibayar

  paymentMethodId: text("payment_method_id"), // Simpan sebagai string (code dari settings), bukan foreign key
  paymentStatus: text("payment_status").default("pending").notNull(),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),
  expiredAt: timestamp("expired_at", { precision: 3, mode: "date" }),

  message: text("message"),
  note: text("note"),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  donationId: text("donation_id").notNull().references(() => donations.id),
  gatewayId: text("gateway_id").notNull().references(() => paymentGateways.id),
  methodId: text("method_id"), // Simpan sebagai string (code dari settings), bukan foreign key

  externalId: text("external_id"),
  externalStatus: text("external_status"),

  amount: bigint("amount", { mode: "number" }).notNull(),
  feeAmount: bigint("fee_amount", { mode: "number" }).default(0),

  paymentCode: text("payment_code"),
  paymentUrl: text("payment_url"),
  qrCode: text("qr_code"),

  status: text("status").default("pending").notNull(),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),
  expiredAt: timestamp("expired_at", { precision: 3, mode: "date" }),

  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  webhookPayload: jsonb("webhook_payload"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Import after declaration to avoid circular dependency
import { donationPayments } from "./donation-payments";

// Relations
export const donationsRelations = relations(donations, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [donations.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [donations.userId],
    references: [users.id],
  }),
  donaturProfile: one(donatur, {
    fields: [donations.donaturId],
    references: [donatur.id],
  }),
  // paymentMethod tidak ada lagi, paymentMethodId sekarang string code dari settings
  payment: many(payments), // For payment gateway transactions
  manualPayments: many(donationPayments), // For manual transfer/upload proof
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  donation: one(donations, {
    fields: [payments.donationId],
    references: [donations.id],
  }),
  gateway: one(paymentGateways, {
    fields: [payments.gatewayId],
    references: [paymentGateways.id],
  }),
  // method tidak ada lagi, methodId sekarang string code dari settings
}));

export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
