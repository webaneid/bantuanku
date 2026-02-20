import { pgTable, text, timestamp, boolean, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";
import { users } from "./user";

export const donatur = pgTable("donatur", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),

  // Address - using Indonesia Address System
  detailAddress: text("detail_address"), // Street, house number, RT/RW, etc.
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),

  userId: text("user_id").references(() => users.id),
  avatar: text("avatar"),

  // Stats
  totalDonations: bigint("total_donations", { mode: "number" }).default(0).notNull(),
  totalAmount: bigint("total_amount", { mode: "number" }).default(0).notNull(),

  // Verification
  emailVerifiedAt: timestamp("email_verified_at", { precision: 3, mode: "date" }),
  phoneVerifiedAt: timestamp("phone_verified_at", { precision: 3, mode: "date" }),

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),

  // Timestamps
  lastLoginAt: timestamp("last_login_at", { precision: 3, mode: "date" }),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const donaturRelations = relations(donatur, ({ one }) => ({
  province: one(indonesiaProvinces, {
    fields: [donatur.provinceCode],
    references: [indonesiaProvinces.code],
  }),
  regency: one(indonesiaRegencies, {
    fields: [donatur.regencyCode],
    references: [indonesiaRegencies.code],
  }),
  district: one(indonesiaDistricts, {
    fields: [donatur.districtCode],
    references: [indonesiaDistricts.code],
  }),
  village: one(indonesiaVillages, {
    fields: [donatur.villageCode],
    references: [indonesiaVillages.code],
  }),
}));

export type Donatur = typeof donatur.$inferSelect;
export type NewDonatur = typeof donatur.$inferInsert;
