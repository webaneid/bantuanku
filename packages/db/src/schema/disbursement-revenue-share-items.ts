import { pgTable, text, bigint, timestamp, unique } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { disbursements } from "./disbursements";
import { revenueShares } from "./revenue-shares";

export const disbursementRevenueShareItems = pgTable(
  "disbursement_revenue_share_items",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    disbursementId: text("disbursement_id")
      .notNull()
      .references(() => disbursements.id, { onDelete: "cascade" }),
    revenueShareId: text("revenue_share_id")
      .notNull()
      .references(() => revenueShares.id, { onDelete: "cascade" }),
    shareType: text("share_type").notNull(), // mitra | fundraiser | developer
    allocatedAmount: bigint("allocated_amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    disbursementRevenueUnique: unique("uq_disbursement_revenue_share_item").on(
      table.disbursementId,
      table.revenueShareId,
      table.shareType
    ),
  })
);

export type DisbursementRevenueShareItem = typeof disbursementRevenueShareItems.$inferSelect;
export type NewDisbursementRevenueShareItem = typeof disbursementRevenueShareItems.$inferInsert;
