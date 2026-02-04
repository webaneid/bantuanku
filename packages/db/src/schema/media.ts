import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const media = pgTable("media", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  url: text("url").notNull(),
  path: text("path").notNull(),
  folder: text("folder").default("uploads").notNull(),
  category: text("category").default("general").notNull(), // general, financial, activity, document
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
