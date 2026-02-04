import { pgTable, text, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { zakatDistributions } from "./zakat-distributions";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";

export const mustahiqs = pgTable("mustahiqs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Basic Info (only name is required)
  name: text("name").notNull(),
  mustahiqId: text("mustahiq_id").unique(), // ID number if any
  
  // Asnaf Category (required) - 8 categories
  asnafCategory: text("asnaf_category").notNull(), // fakir, miskin, amil, mualaf, riqab, gharim, fisabilillah, ibnus_sabil

  // Contact Info (optional)
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),
  
  // Address (using centralized Indonesia address system)
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),
  detailAddress: text("detail_address"), // Street name, house number, RT/RW, etc.
  
  // DEPRECATED: Legacy address field - will be removed after migration
  address: text("address"), // Keep for backward compatibility during migration

  // Personal Details (optional)
  nationalId: text("national_id"), // NIK/KTP
  dateOfBirth: date("date_of_birth", { mode: "date" }),
  gender: text("gender"), // male, female

  // Banking Info - Legacy (will be deprecated, use entity_bank_accounts table instead)
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankAccountName: text("bank_account_name"),

  // Additional Info
  notes: text("notes"),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const mustahiqsRelations = relations(mustahiqs, ({ many, one }) => ({
  distributions: many(zakatDistributions),
  province: one(indonesiaProvinces, {
    fields: [mustahiqs.provinceCode],
    references: [indonesiaProvinces.code],
  }),
  regency: one(indonesiaRegencies, {
    fields: [mustahiqs.regencyCode],
    references: [indonesiaRegencies.code],
  }),
  district: one(indonesiaDistricts, {
    fields: [mustahiqs.districtCode],
    references: [indonesiaDistricts.code],
  }),
  village: one(indonesiaVillages, {
    fields: [mustahiqs.villageCode],
    references: [indonesiaVillages.code],
  }),
}));

export type Mustahiq = typeof mustahiqs.$inferSelect;
export type NewMustahiq = typeof mustahiqs.$inferInsert;
