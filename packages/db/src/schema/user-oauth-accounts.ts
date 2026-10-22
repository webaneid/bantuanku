import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./user";

// Akun penyedia identitas eksternal (Google) yang ditautkan ke users.
export const userOauthAccounts = pgTable(
  "user_oauth_accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'google'
    providerAccountId: text("provider_account_id").notNull(), // claim `sub`
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerAccountIdx: uniqueIndex("user_oauth_accounts_provider_account_idx").on(t.provider, t.providerAccountId),
  })
);

export type UserOauthAccount = typeof userOauthAccounts.$inferSelect;
