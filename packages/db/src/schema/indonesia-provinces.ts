import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const indonesiaProvinces = pgTable("indonesia_provinces", {
  code: text("code").primaryKey(), // "11" for Aceh
  name: text("name").notNull(), // "ACEH"

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type IndonesiaProvince = typeof indonesiaProvinces.$inferSelect;
export type NewIndonesiaProvince = typeof indonesiaProvinces.$inferInsert;
