import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  avatar: text("avatar"),
  emailVerifiedAt: timestamp("email_verified_at", { precision: 3, mode: "date" }),
  phoneVerifiedAt: timestamp("phone_verified_at", { precision: 3, mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(),
  isDeveloper: boolean("is_developer").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at", { precision: 3, mode: "date" }),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

// Import userRoles from role module (defined there to avoid circular dependency)
// The relation is defined in role.ts using userRolesRelations

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
