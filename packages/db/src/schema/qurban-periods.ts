import { pgTable, text, timestamp, integer, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";

export const qurbanPeriods = pgTable("qurban_periods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(), // "Qurban 1446 H / 2026"
  hijriYear: text("hijri_year").notNull(), // "1446"
  gregorianYear: integer("gregorian_year").notNull(), // 2026
  startDate: date("start_date", { mode: "date" }).notNull(), // Mulai penerimaan
  endDate: date("end_date", { mode: "date" }).notNull(), // Tutup penerimaan
  executionDate: date("execution_date", { mode: "date" }).notNull(), // Tanggal penyembelihan (Idul Adha)
  status: text("status").default("draft").notNull(), // draft, active, closed, executed
  description: text("description"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanPeriodsRelations = relations(qurbanPeriods, ({ many }) => ({
  packagePeriods: many(qurbanPackagePeriods), // Many-to-many relationship via junction table
}));

// Import after declaration to avoid circular dependency
import { qurbanPackagePeriods } from "./qurban-package-periods";

export type QurbanPeriod = typeof qurbanPeriods.$inferSelect;
export type NewQurbanPeriod = typeof qurbanPeriods.$inferInsert;
