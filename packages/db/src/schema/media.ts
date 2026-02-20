import { pgTable, text, timestamp, bigint, jsonb, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export type MediaVariant = {
  variant: "thumbnail" | "medium" | "large" | "square" | "original";
  width: number;
  height: number;
  mimeType: string;
  size: number;
  path: string;
  url: string;
};

export const media = pgTable("media", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  url: text("url").notNull(),
  path: text("path").notNull(),
  width: integer("width"),
  height: integer("height"),
  variants: jsonb("variants").$type<Record<string, MediaVariant>>(),
  originalLocalPath: text("original_local_path"),
  originalLocalExpiresAt: timestamp("original_local_expires_at", { precision: 3, mode: "date" }),
  folder: text("folder").default("uploads").notNull(),
  category: text("category").default("general").notNull(), // general, financial, activity, document
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
