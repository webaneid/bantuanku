import { pgTable, text, timestamp, boolean, bigint, integer, jsonb } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const paymentGateways = pgTable("payment_gateways", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  type: text("type").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const paymentGatewayCredentials = pgTable("payment_gateway_credentials", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  gatewayId: text("gateway_id").notNull().references(() => paymentGateways.id, { onDelete: "cascade" }),
  environment: text("environment").notNull(),
  credentials: text("credentials").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  gatewayId: text("gateway_id").notNull().references(() => paymentGateways.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  icon: text("icon"),
  fee: jsonb("fee").$type<{ type: "fixed" | "percent"; value: number }>(),
  minAmount: bigint("min_amount", { mode: "number" }).default(10000),
  maxAmount: bigint("max_amount", { mode: "number" }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type NewPaymentGateway = typeof paymentGateways.$inferInsert;
export type PaymentGatewayCredential = typeof paymentGatewayCredentials.$inferSelect;
export type NewPaymentGatewayCredential = typeof paymentGatewayCredentials.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
