import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { zakatTypes } from "./zakat-types";
import { mitra } from "./mitra";

export const zakatPeriods = pgTable("zakat_periods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  zakatTypeId: text("zakat_type_id")
    .references(() => zakatTypes.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  hijriYear: text("hijri_year"),
  startDate: timestamp("start_date", { precision: 3, mode: "date" }).notNull(),
  endDate: timestamp("end_date", { precision: 3, mode: "date" }).notNull(),
  executionDate: timestamp("execution_date", { precision: 3, mode: "date" }),
  status: text("status").default("draft").notNull(),
  description: text("description"),
  mitraId: text("mitra_id").references(() => mitra.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const zakatPeriodsRelations = relations(zakatPeriods, ({ one }) => ({
  zakatType: one(zakatTypes, {
    fields: [zakatPeriods.zakatTypeId],
    references: [zakatTypes.id],
  }),
  mitra: one(mitra, {
    fields: [zakatPeriods.mitraId],
    references: [mitra.id],
  }),
}));

export type ZakatPeriod = typeof zakatPeriods.$inferSelect;
export type NewZakatPeriod = typeof zakatPeriods.$inferInsert;
