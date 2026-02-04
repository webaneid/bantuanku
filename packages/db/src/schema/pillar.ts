import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const pillars = pgTable("pillars", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
