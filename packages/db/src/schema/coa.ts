import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // asset, liability, equity, income, expense
  category: text("category"), // cash, bank, receivable, payable, revenue, cogs, operating_expense, etc
  normalBalance: text("normal_balance").notNull(), // debit, credit
  parentId: text("parent_id"),
  level: integer("level").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // true = tidak bisa dihapus
  description: text("description"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const coaRelations = relations(chartOfAccounts, ({ one, many }) => ({
  parent: one(chartOfAccounts, {
    fields: [chartOfAccounts.parentId],
    references: [chartOfAccounts.id],
    relationName: "coaHierarchy",
  }),
  children: many(chartOfAccounts, {
    relationName: "coaHierarchy",
  }),
}));

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
