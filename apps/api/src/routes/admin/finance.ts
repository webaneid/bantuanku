import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { ledgerEntries, ledgerLines, ledgerAccounts, ledger, campaigns, createId, generateReferenceId } from "@bantuanku/db";
import { createDisbursementLedgerEntry, getAccountBalance } from "../../services/ledger";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const finance = new Hono<{ Bindings: Env; Variables: Variables }>();

finance.use("*", requireRole("super_admin", "admin_finance"));

finance.get("/accounts", async (c) => {
  const db = c.get("db");

  const accounts = await db.query.ledgerAccounts.findMany({
    where: eq(ledgerAccounts.isActive, true),
    orderBy: [ledgerAccounts.code],
  });

  const accountsWithBalance = await Promise.all(
    accounts.map(async (account) => {
      const balanceData = await getAccountBalance(db, account.code);
      return {
        ...account,
        balance: balanceData?.balance || 0,
      };
    })
  );

  return success(c, accountsWithBalance);
});

finance.get("/ledger", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const refType = c.req.query("refType");
  const refId = c.req.query("refId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const offset = (page - 1) * limit;
  const conditions = [];

  if (refType) conditions.push(eq(ledgerEntries.refType, refType));
  if (refId) conditions.push(eq(ledgerEntries.refId, refId));
  if (startDate) conditions.push(gte(ledgerEntries.postedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(ledgerEntries.postedAt, new Date(endDate)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, countResult] = await Promise.all([
    db.query.ledgerEntries.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(ledgerEntries.postedAt)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(ledgerEntries)
      .where(whereClause),
  ]);

  const entriesWithLines = await Promise.all(
    entries.map(async (entry) => {
      const lines = await db.query.ledgerLines.findMany({
        where: eq(ledgerLines.entryId, entry.id),
      });
      return { ...entry, lines };
    })
  );

  return paginated(c, entriesWithLines, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

finance.get("/ledger", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const status = c.req.query("status");

  const offset = (page - 1) * limit;
  const conditions = [];

  if (status) conditions.push(eq(ledger.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.ledger.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(ledger.createdAt)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(ledger)
      .where(whereClause),
  ]);

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

const createDisbursementSchema = z.object({
  campaignId: z.string().optional(),
  amount: z.number().min(1000),
  recipientName: z.string().min(2),
  recipientBank: z.string().optional(),
  recipientAccount: z.string().optional(),
  recipientPhone: z.string().optional(),
  purpose: z.string().min(5),
  description: z.string().optional(),
});

finance.post("/ledger", zValidator("json", createDisbursementSchema), async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  if (body.campaignId) {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, body.campaignId),
    });
    if (!campaign) {
      return error(c, "Campaign not found", 404);
    }
  }

  const disbursementId = createId();
  const referenceId = generateReferenceId("DSB");

  await db.insert(ledger).values({
    id: disbursementId,
    referenceId,
    ...body,
    status: "pending",
    requestedBy: user!.id,
    requestedAt: new Date(),
  });

  return success(c, { id: disbursementId, referenceId }, "Disbursement created", 201);
});

finance.get("/ledger/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const disbursement = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!disbursement) {
    return error(c, "Disbursement not found", 404);
  }

  return success(c, disbursement);
});

finance.post("/ledger/:id/approve", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const user = c.get("user");

  const disbursement = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!disbursement) {
    return error(c, "Disbursement not found", 404);
  }

  if (disbursement.status !== "pending") {
    return error(c, "Disbursement is not pending", 400);
  }

  await db
    .update(ledger)
    .set({
      status: "approved",
      approvedBy: user!.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ledger.id, id));

  return success(c, null, "Disbursement approved");
});

finance.post("/ledger/:id/reject", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json();

  const disbursement = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!disbursement) {
    return error(c, "Disbursement not found", 404);
  }

  if (disbursement.status !== "pending") {
    return error(c, "Disbursement is not pending", 400);
  }

  await db
    .update(ledger)
    .set({
      status: "rejected",
      rejectedBy: user!.id,
      rejectedAt: new Date(),
      rejectionReason: body.reason,
      updatedAt: new Date(),
    })
    .where(eq(ledger.id, id));

  return success(c, null, "Disbursement rejected");
});

finance.post("/ledger/:id/complete", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json();

  const disbursement = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!disbursement) {
    return error(c, "Disbursement not found", 404);
  }

  if (disbursement.status !== "approved") {
    return error(c, "Disbursement is not approved", 400);
  }

  await db
    .update(ledger)
    .set({
      status: "completed",
      completedAt: new Date(),
      proofUrl: body.proofUrl,
      updatedAt: new Date(),
    })
    .where(eq(ledger.id, id));

  await createDisbursementLedgerEntry(db, {
    disbursementId: disbursement.id,
    amount: disbursement.amount,
    purpose: disbursement.purpose,
    recipientName: disbursement.recipientName,
    createdBy: user!.id,
  });

  return success(c, null, "Disbursement completed");
});

finance.get("/summary", async (c) => {
  const db = c.get("db");

  const cashBalance = await getAccountBalance(db, "1010");
  const donationRevenue = await getAccountBalance(db, "4010");
  const programExpense = await getAccountBalance(db, "5010");

  const pendingDisbursements = await db
    .select({ count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(amount), 0)` })
    .from(ledger)
    .where(eq(ledger.status, "pending"));

  return success(c, {
    cashBalance: cashBalance?.balance || 0,
    totalDonationRevenue: donationRevenue?.balance || 0,
    totalProgramExpense: programExpense?.balance || 0,
    pendingDisbursementsCount: Number(pendingDisbursements[0]?.count || 0),
    pendingDisbursementsAmount: Number(pendingDisbursements[0]?.total || 0),
  });
});

export default finance;
