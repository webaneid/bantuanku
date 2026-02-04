import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at", { precision: 3, mode: "date" }),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
