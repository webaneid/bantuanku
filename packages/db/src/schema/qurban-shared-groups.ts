import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { qurbanPackages } from "./qurban-packages";
import { qurbanPackagePeriods } from "./qurban-package-periods";

export const qurbanSharedGroups = pgTable("qurban_shared_groups", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // New field for package-period junction
  packagePeriodId: text("package_period_id")
    .references(() => qurbanPackagePeriods.id, { onDelete: "cascade" }),

  // Legacy field for backward compatibility
  packageId: text("package_id")
    .references(() => qurbanPackages.id, { onDelete: "cascade" })
    .notNull(),

  groupNumber: integer("group_number").notNull(), // Sapi ke-berapa (1, 2, 3, dst)
  maxSlots: integer("max_slots").notNull(), // Copy dari package.maxSlots
  slotsFilled: integer("slots_filled").default(0).notNull(), // Berapa orang sudah join
  status: text("status").default("open").notNull(), // open, full, confirmed, executed

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanSharedGroupsRelations = relations(qurbanSharedGroups, ({ one, many }) => ({
  // New relationship with package-period junction
  packagePeriod: one(qurbanPackagePeriods, {
    fields: [qurbanSharedGroups.packagePeriodId],
    references: [qurbanPackagePeriods.id],
  }),
  // Legacy relationship for backward compatibility
  package: one(qurbanPackages, {
    fields: [qurbanSharedGroups.packageId],
    references: [qurbanPackages.id],
  }),
  orders: many(qurbanOrders),
  executions: many(qurbanExecutions),
}));

// Import after declaration
import { qurbanOrders } from "./qurban-orders";
import { qurbanExecutions } from "./qurban-executions";

export type QurbanSharedGroup = typeof qurbanSharedGroups.$inferSelect;
export type NewQurbanSharedGroup = typeof qurbanSharedGroups.$inferInsert;
