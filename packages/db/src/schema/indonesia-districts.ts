import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { indonesiaRegencies } from "./indonesia-regencies";

export const indonesiaDistricts = pgTable("indonesia_districts", {
  code: text("code").primaryKey(), // "1101010" for Teupah Selatan
  regencyCode: text("regency_code")
    .notNull()
    .references(() => indonesiaRegencies.code),
  name: text("name").notNull(), // "TEUPAH SELATAN"

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type IndonesiaDistrict = typeof indonesiaDistricts.$inferSelect;
export type NewIndonesiaDistrict = typeof indonesiaDistricts.$inferInsert;
