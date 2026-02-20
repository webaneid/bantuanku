import { Hono } from "hono";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { campaigns, transactions, ledger, users, ledgerEntries, ledgerLines, ledgerAccounts } from "@bantuanku/db";
import { requireRole } from "../../middleware/auth";
import {
  generateCSV,
  campaignExportColumns,
  donationExportColumns,
  disbursementExportColumns,
  userExportColumns,
  ledgerExportColumns,
} from "../../services/export";
import type { Env, Variables } from "../../types";

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
    conditions.push(gte(campaigns.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(campaigns.createdAt, new Date(endDate)));
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
    conditions.push(gte(transactions.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(transactions.createdAt, new Date(endDate)));
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

exportAdmin.get("/ledger", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  const status = c.req.query("status");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (status) {
    conditions.push(eq(ledger.status, status));
  }

  if (startDate) {
    conditions.push(gte(ledger.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(ledger.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.ledger.findMany({
    where: whereClause,
    orderBy: [desc(ledger.createdAt)],
  });

  const csv = generateCSV(data, disbursementExportColumns);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="ledger-${new Date().toISOString().split("T")[0]}.csv"`,
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
    conditions.push(gte(users.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(users.createdAt, new Date(endDate)));
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

  const entryConditions = [];

  if (startDate) {
    entryConditions.push(gte(ledgerEntries.postedAt, new Date(startDate)));
  }

  if (endDate) {
    entryConditions.push(lte(ledgerEntries.postedAt, new Date(endDate)));
  }

  const entryWhereClause = entryConditions.length > 0 ? and(...entryConditions) : undefined;

  const entries = await db.query.ledgerEntries.findMany({
    where: entryWhereClause,
    orderBy: [desc(ledgerEntries.postedAt)],
  });

  const entryIds = entries.map((e) => e.id);

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
    .where(accountCode ? eq(ledgerAccounts.code, accountCode) : undefined)
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
