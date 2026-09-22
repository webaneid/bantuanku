import { Hono } from "hono";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { campaigns, transactions, users, ledgerEntries, ledgerLines, ledgerAccounts } from "@bantuanku/db";
import { requireRole } from "../../middleware/auth";
import {
  generateCSV,
  campaignExportColumns,
  donationExportColumns,
  userExportColumns,
  ledgerExportColumns,
} from "../../services/export";
import type { Env, Variables } from "../../types";
import { startOfDayWIB, endOfDayWIB } from "../../utils/timezone";

const exportAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

exportAdmin.get("/campaigns", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");

  const status = c.req.query("status");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (status) {
    conditions.push(eq(campaigns.status, status));
  }

  if (startDate) {
    conditions.push(gte(campaigns.createdAt, startOfDayWIB(startDate)));
  }

  if (endDate) {
    conditions.push(lte(campaigns.createdAt, endOfDayWIB(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.campaigns.findMany({
    where: whereClause,
    orderBy: [desc(campaigns.createdAt)],
  });

  const csv = generateCSV(data, campaignExportColumns);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="campaigns-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

exportAdmin.get("/donations", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  const campaignId = c.req.query("campaignId");
  const paymentStatus = c.req.query("paymentStatus");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (campaignId) {
    conditions.push(and(
      eq(transactions.productType, "campaign"),
      eq(transactions.productId, campaignId)
    ));
  }

  if (paymentStatus) {
    conditions.push(eq(transactions.paymentStatus, paymentStatus));
  }

  if (startDate) {
    conditions.push(gte(transactions.createdAt, startOfDayWIB(startDate)));
  }

  if (endDate) {
    conditions.push(lte(transactions.createdAt, endOfDayWIB(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select()
    .from(transactions)
    .where(whereClause)
    .orderBy(desc(transactions.createdAt));

  const csv = generateCSV(data, donationExportColumns);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="donations-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

exportAdmin.get("/users", requireRole("super_admin"), async (c) => {
  const db = c.get("db");

  const status = c.req.query("status");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (status) {
    conditions.push(eq(users.isActive, status === "active"));
  }

  if (startDate) {
    conditions.push(gte(users.createdAt, startOfDayWIB(startDate)));
  }

  if (endDate) {
    conditions.push(lte(users.createdAt, endOfDayWIB(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.users.findMany({
    where: whereClause,
    orderBy: [desc(users.createdAt)],
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  const csv = generateCSV(data, userExportColumns);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="users-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

exportAdmin.get("/ledger", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const accountCode = c.req.query("accountCode");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(ledgerEntries.postedAt, startOfDayWIB(startDate)));
  }

  if (endDate) {
    conditions.push(lte(ledgerEntries.postedAt, endOfDayWIB(endDate)));
  }

  if (accountCode) {
    conditions.push(eq(ledgerAccounts.code, accountCode));
  }

  const lines = await db
    .select({
      entryId: ledgerLines.entryId,
      entryNumber: ledgerEntries.entryNumber,
      postedAt: ledgerEntries.postedAt,
      accountCode: ledgerAccounts.code,
      accountName: ledgerAccounts.name,
      debit: ledgerLines.debit,
      credit: ledgerLines.credit,
      memo: ledgerEntries.memo,
      refType: ledgerEntries.refType,
      status: ledgerEntries.status,
    })
    .from(ledgerLines)
    .innerJoin(ledgerEntries, eq(ledgerLines.entryId, ledgerEntries.id))
    .innerJoin(ledgerAccounts, eq(ledgerLines.accountId, ledgerAccounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ledgerEntries.postedAt));

  const csv = generateCSV(lines, ledgerExportColumns);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="ledger-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

export default exportAdmin;
