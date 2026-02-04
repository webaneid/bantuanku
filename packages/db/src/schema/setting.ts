import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const settings = pgTable("settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  type: text("type").default("string").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
