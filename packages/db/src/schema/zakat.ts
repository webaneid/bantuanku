import { pgTable, text, timestamp, boolean, bigint, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";
import { donations } from "./donation";

export const zakatCalculatorConfigs = pgTable("zakat_calculator_configs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  type: text("type").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),

  nisabValue: bigint("nisab_value", { mode: "number" }),
  nisabUnit: text("nisab_unit"),
  nisabGoldGram: decimal("nisab_gold_gram", { precision: 10, scale: 2 }),

  rateBps: integer("rate_bps"),

  config: jsonb("config"),

  isActive: boolean("is_active").default(true).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const zakatCalculationLogs = pgTable("zakat_calculation_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id),
  calculatorType: text("calculator_type").notNull(),

  inputData: jsonb("input_data").notNull(),
  nisabValue: bigint("nisab_value", { mode: "number" }),
  resultAmount: bigint("result_amount", { mode: "number" }).notNull(),

  donationId: text("donation_id").references(() => donations.id),
  isConverted: boolean("is_converted").default(false).notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type ZakatCalculatorConfig = typeof zakatCalculatorConfigs.$inferSelect;
export type NewZakatCalculatorConfig = typeof zakatCalculatorConfigs.$inferInsert;
export type ZakatCalculationLog = typeof zakatCalculationLogs.$inferSelect;
export type NewZakatCalculationLog = typeof zakatCalculationLogs.$inferInsert;
