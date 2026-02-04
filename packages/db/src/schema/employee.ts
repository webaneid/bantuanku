import { pgTable, text, timestamp, boolean, bigint, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { ledger } from "./ledger";
import { users } from "./user";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";

export const employees = pgTable("employees", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // Basic Info
  employeeId: text("employee_id").unique(), // NIP/Employee Number
  name: text("name").notNull(),
  position: text("position").notNull(), // staff, coordinator, manager, director, etc
  department: text("department"), // program, finance, fundraising, admin, etc
  employmentType: text("employment_type"), // permanent, contract, freelance, volunteer

  // Contact Info
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),

  // Address - using Indonesia Address System
  detailAddress: text("detail_address"), // Street, house number, RT/RW, etc.
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),

  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),

  // Employment Details
  joinDate: date("join_date", { mode: "date" }),
  endDate: date("end_date", { mode: "date" }), // for contract employees
  salary: bigint("salary", { mode: "number" }), // monthly salary
  allowance: bigint("allowance", { mode: "number" }), // tunjangan

  // Banking Info - Legacy (will be deprecated, use entity_bank_accounts table instead)
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankAccountName: text("bank_account_name"),

  // Tax & Legal
  taxId: text("tax_id"), // NPWP
  nationalId: text("national_id"), // NIK/KTP

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),

  // User Account Link
  userId: text("user_id").references(() => users.id),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const employeesRelations = relations(employees, ({ many }) => ({
  ledgerEntries: many(ledger),
}));

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
