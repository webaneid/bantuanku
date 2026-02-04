import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { donations } from "./donation";
import { users } from "./user";

export const donationEvidences = pgTable("donation_evidences", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  donationId: text("donation_id").notNull().references(() => donations.id, { onDelete: "cascade" }),

  type: text("type").notNull(), // proof_of_payment, receipt, other
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),

  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { precision: 3, mode: "date" }).defaultNow().notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const donationEvidencesRelations = relations(donationEvidences, ({ one }) => ({
  donation: one(donations, {
    fields: [donationEvidences.donationId],
    references: [donations.id],
  }),
  uploader: one(users, {
    fields: [donationEvidences.uploadedBy],
    references: [users.id],
  }),
}));

export type DonationEvidence = typeof donationEvidences.$inferSelect;
export type NewDonationEvidence = typeof donationEvidences.$inferInsert;
