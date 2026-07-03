import { eq, and, or, desc } from "drizzle-orm";
import { donatur, employees, fundraisers, entityBankAccounts, settings } from "@bantuanku/db";

export async function getDefaultSourceBankFromSettings(db: any) {
  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
  const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

  if (!bankAccountsSetting?.value) {
    throw new Error("Rekening sumber belum dikonfigurasi admin");
  }

  let bankAccounts: any[] = [];
  try {
    bankAccounts = JSON.parse(bankAccountsSetting.value);
  } catch {
    throw new Error("Konfigurasi rekening sumber tidak valid");
  }

  if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
    throw new Error("Rekening sumber belum tersedia");
  }

  const preferred = bankAccounts.find((acc: any) => {
    const programs = Array.isArray(acc.programs) && acc.programs.length > 0 ? acc.programs : ["general"];
    return programs.includes("general");
  });

  return preferred || bankAccounts[0];
}

export async function findMyFundraiser(db: any, user: { id: string; email?: string }) {
  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.email, user.email || ""),
  });

  const [empRecord] = await db
    .select()
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  const conditions = [];
  if (donaturRecord) conditions.push(eq(fundraisers.donaturId, donaturRecord.id));
  if (empRecord) conditions.push(eq(fundraisers.employeeId, empRecord.id));

  if (conditions.length === 0) {
    return { donaturRecord, empRecord, fundraiser: null };
  }

  const fundraiser = await db.query.fundraisers.findFirst({
    where: conditions.length === 1 ? conditions[0] : or(...conditions),
  });

  return { donaturRecord, empRecord, fundraiser };
}

export async function getMyBankAccounts(db: any, donaturRecord: any, empRecord: any) {
  const conditions = [];
  if (donaturRecord) {
    conditions.push(
      and(eq(entityBankAccounts.entityType, "donatur"), eq(entityBankAccounts.entityId, donaturRecord.id))
    );
  }
  if (empRecord) {
    conditions.push(
      and(eq(entityBankAccounts.entityType, "employee"), eq(entityBankAccounts.entityId, empRecord.id))
    );
  }
  if (conditions.length === 0) return [];

  return db
    .select()
    .from(entityBankAccounts)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .orderBy(desc(entityBankAccounts.createdAt));
}
