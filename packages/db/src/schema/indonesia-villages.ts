import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { indonesiaDistricts } from "./indonesia-districts";

export const indonesiaVillages = pgTable("indonesia_villages", {
  code: text("code").primaryKey(), // "1101010001" for Latiung
  districtCode: text("district_code")
    .notNull()
    .references(() => indonesiaDistricts.code),
  name: text("name").notNull(), // "LATIUNG"
  postalCode: text("postal_code"), // Kode pos (nullable karena tidak semua village punya)

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type IndonesiaVillage = typeof indonesiaVillages.$inferSelect;
export type NewIndonesiaVillage = typeof indonesiaVillages.$inferInsert;
