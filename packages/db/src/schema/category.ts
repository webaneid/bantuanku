import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
