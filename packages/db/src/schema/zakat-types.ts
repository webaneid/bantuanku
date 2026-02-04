import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const zakatTypes = pgTable("zakat_types", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  icon: text("icon"),
  hasCalculator: boolean("has_calculator").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type ZakatType = typeof zakatTypes.$inferSelect;
export type NewZakatType = typeof zakatTypes.$inferInsert;
