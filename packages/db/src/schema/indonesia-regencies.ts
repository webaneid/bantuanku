import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { indonesiaProvinces } from "./indonesia-provinces";

export const indonesiaRegencies = pgTable("indonesia_regencies", {
  code: text("code").primaryKey(), // "1101" for Kab. Simeulue
  provinceCode: text("province_code")
    .notNull()
    .references(() => indonesiaProvinces.code),
  name: text("name").notNull(), // "KABUPATEN SIMEULUE"

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type IndonesiaRegency = typeof indonesiaRegencies.$inferSelect;
export type NewIndonesiaRegency = typeof indonesiaRegencies.$inferInsert;
