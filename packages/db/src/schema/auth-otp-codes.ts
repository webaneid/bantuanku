import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

export const authOtpCodes = pgTable("auth_otp_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { precision: 3, mode: "date", withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { precision: 3, mode: "date", withTimezone: true }),
  attemptCount: integer("attempt_count").default(0).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export type AuthOtpCode = typeof authOtpCodes.$inferSelect;
export type NewAuthOtpCode = typeof authOtpCodes.$inferInsert;
