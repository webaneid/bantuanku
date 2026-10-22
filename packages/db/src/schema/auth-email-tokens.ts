import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

// Token sekali pakai yang dikirim lewat email/redirect (verifikasi email, reset password,
// kode tukar login Google). Hanya hash SHA-256 yang disimpan; token mentah tidak pernah masuk DB.
export const authEmailTokens = pgTable(
  "auth_email_tokens",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    purpose: text("purpose").notNull(), // 'verify_email' | 'reset_password' | 'google_exchange'
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { precision: 3, mode: "date", withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { precision: 3, mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("auth_email_tokens_token_hash_idx").on(t.tokenHash),
    userPurposeIdx: index("auth_email_tokens_user_purpose_idx").on(t.userId, t.purpose),
  })
);

export type AuthEmailToken = typeof authEmailTokens.$inferSelect;
export type NewAuthEmailToken = typeof authEmailTokens.$inferInsert;
