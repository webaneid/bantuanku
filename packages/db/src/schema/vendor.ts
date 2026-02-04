import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { ledger } from "./ledger";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Basic Info
  name: text("name").notNull(),
  type: text("type").notNull(), // supplier, contractor, service_provider, consultant, etc
  category: text("category"), // construction, catering, printing, transportation, etc

  // Contact Info
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),
  address: text("address"), // Legacy - will be deprecated

  // Address - using Indonesia Address System
  detailAddress: text("detail_address"), // Street, house number, RT/RW, etc.
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),

  // Banking Info - Legacy (will be deprecated, use entity_bank_accounts table instead)
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankAccountName: text("bank_account_name"),

  // Tax & Legal
  taxId: text("tax_id"), // NPWP
  businessLicense: text("business_license"),

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const vendorsRelations = relations(vendors, ({ many }) => ({
  ledgerEntries: many(ledger),
}));

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
