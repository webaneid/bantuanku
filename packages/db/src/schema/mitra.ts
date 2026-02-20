import { pgTable, text, timestamp, integer, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";

export const mitra = pgTable("mitra", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Identitas
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  logoUrl: text("logo_url"),

  // Penanggung Jawab
  picName: text("pic_name").notNull(),
  picPosition: text("pic_position"),

  // Kontak
  email: text("email").notNull(),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),

  // Alamat (Indonesia Address System)
  detailAddress: text("detail_address"),
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),

  // Dokumen Pendukung
  ktpUrl: text("ktp_url"),
  bankBookUrl: text("bank_book_url"),
  npwpUrl: text("npwp_url"),

  // Status
  status: text("status").default("pending").notNull(),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { precision: 3, mode: "date" }),
  rejectionReason: text("rejection_reason"),

  // Keuangan
  totalPrograms: integer("total_programs").default(0),
  totalDonationReceived: bigint("total_donation_received", { mode: "number" }).default(0),
  totalRevenueEarned: bigint("total_revenue_earned", { mode: "number" }).default(0),
  currentBalance: bigint("current_balance", { mode: "number" }).default(0),
  totalWithdrawn: bigint("total_withdrawn", { mode: "number" }).default(0),

  // User
  userId: text("user_id").references(() => users.id),

  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const mitraRelations = relations(mitra, ({ one }) => ({
  verifiedByUser: one(users, {
    fields: [mitra.verifiedBy],
    references: [users.id],
    relationName: "mitraVerifiedBy",
  }),
  user: one(users, {
    fields: [mitra.userId],
    references: [users.id],
    relationName: "mitraUser",
  }),
}));

export type Mitra = typeof mitra.$inferSelect;
export type NewMitra = typeof mitra.$inferInsert;
