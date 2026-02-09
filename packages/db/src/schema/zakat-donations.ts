import { pgTable, text, timestamp, boolean, bigint, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { zakatTypes } from "./zakat-types";
import { donatur } from "./donatur";

export const zakatDonations = pgTable("zakat_donations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  referenceId: text("reference_id").unique().notNull(),
  zakatTypeId: text("zakat_type_id")
    .references(() => zakatTypes.id)
    .notNull(),

  // Donatur
  donaturId: text("donatur_id").references(() => donatur.id),
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),

  // Jumlah
  amount: bigint("amount", { mode: "number" }).notNull(),
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(),

  // Kalkulator data (JSON untuk menyimpan input kalkulator)
  calculatorData: jsonb("calculator_data"),
  calculatedZakat: bigint("calculated_zakat", { mode: "number" }),

  // Payment
  paymentMethodId: text("payment_method_id"),
  paymentStatus: text("payment_status").default("pending").notNull(),
  paymentGateway: text("payment_gateway"),
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at", { precision: 3, mode: "date" }),

  // Metadata
  notes: text("notes"),
  message: text("message"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const zakatDonationsRelations = relations(zakatDonations, ({ one, many }) => ({
  zakatType: one(zakatTypes, {
    fields: [zakatDonations.zakatTypeId],
    references: [zakatTypes.id],
  }),
  donatur: one(donatur, {
    fields: [zakatDonations.donaturId],
    references: [donatur.id],
  }),
  manualPayments: many(zakatPayments),
}));

// Import after declaration
import { zakatPayments } from "./zakat-payments";

export type ZakatDonation = typeof zakatDonations.$inferSelect;
export type NewZakatDonation = typeof zakatDonations.$inferInsert;
