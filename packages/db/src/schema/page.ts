import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const pages = pgTable("pages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),

  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),

  isPublished: boolean("is_published").default(true).notNull(),
  publishedAt: timestamp("published_at", { precision: 3, mode: "date" }),

  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
