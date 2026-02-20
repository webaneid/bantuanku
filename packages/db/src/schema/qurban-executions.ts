import { pgTable, text, timestamp, integer, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { users } from "./user";
import { qurbanSharedGroups } from "./qurban-shared-groups";
import { transactions } from "./transactions";

export const qurbanExecutions = pgTable("qurban_executions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  executionNumber: text("execution_number").unique().notNull(), // EXE-QBN-2026-00001

  // Grup Info (jika shared) atau Transaction Info (jika individual)
  sharedGroupId: text("shared_group_id").references(() => qurbanSharedGroups.id), // Jika sapi patungan
  transactionId: text("transaction_id").references(() => transactions.id), // Jika individual (kambing atau sapi utuh)

  // Execution Details
  executionDate: timestamp("execution_date", { precision: 3, mode: "date" }).notNull(),
  location: text("location").notNull(), // Lokasi penyembelihan
  butcherName: text("butcher_name"), // Nama jagal/panitia

  // Animal Details
  animalType: text("animal_type").notNull(), // cow/goat
  animalWeight: decimal("animal_weight", { precision: 10, scale: 2 }), // Berat hewan (kg)
  animalCondition: text("animal_condition"), // Kondisi hewan

  // Distribution
  distributionMethod: text("distribution_method"), // 'direct_pickup', 'distribution', 'donation'
  distributionNotes: text("distribution_notes"),

  // Media
  photos: text("photos"), // JSON array of photo URLs
  videoUrl: text("video_url"),

  // Recipients (jika distribusi ke mustahiq)
  recipientCount: integer("recipient_count"),
  recipientList: text("recipient_list"), // JSON array of recipient names

  executedBy: text("executed_by").references(() => users.id), // Admin yang input laporan
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const qurbanExecutionsRelations = relations(qurbanExecutions, ({ one }) => ({
  sharedGroup: one(qurbanSharedGroups, {
    fields: [qurbanExecutions.sharedGroupId],
    references: [qurbanSharedGroups.id],
  }),
  transaction: one(transactions, {
    fields: [qurbanExecutions.transactionId],
    references: [transactions.id],
  }),
  executor: one(users, {
    fields: [qurbanExecutions.executedBy],
    references: [users.id],
  }),
}));

export type QurbanExecution = typeof qurbanExecutions.$inferSelect;
export type NewQurbanExecution = typeof qurbanExecutions.$inferInsert;
