import { Hono } from "hono";
import { disbursements, zakatTypes, eq, and, sql, transactions } from "@bantuanku/db";
import type { Env, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: semua endpoint zakat stats butuh auth
app.use("*", requireAuth);

/**
 * GET /admin/zakat/stats
 * Get comprehensive zakat statistics for dashboard
 */
app.get("/", async (c) => {
  const db = c.get("db");
  const zakatTypeId = c.req.query("zakatTypeId");

  // Build conditions for filtering by zakatTypeId if provided
  const donationConditions = zakatTypeId
    ? and(
        eq(transactions.productType, "zakat"),
        eq(transactions.productId, zakatTypeId)
      )
    : eq(transactions.productType, "zakat");
  const distributionZakatTypeId = sql`COALESCE(${disbursements.typeSpecificData} ->> 'zakatTypeId', ${disbursements.typeSpecificData} ->> 'zakat_type_id')`;
  const distributionAsnaf = sql`COALESCE(${disbursements.typeSpecificData} ->> 'asnaf', '-')`;
  const distributionConditions = zakatTypeId
    ? and(
        eq(disbursements.disbursementType, "zakat"),
        sql`${distributionZakatTypeId} = ${zakatTypeId}`
      )
    : eq(disbursements.disbursementType, "zakat");

  // Get total donations statistics from transactions table
  const donationsStats = await db
    .select({
      totalDonations: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${transactions.totalAmount}), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.paymentStatus} = 'paid' THEN ${transactions.totalAmount} ELSE 0 END), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.paymentStatus} = 'pending' THEN ${transactions.totalAmount} ELSE 0 END), 0)`,
      paidCount: sql<number>`COUNT(CASE WHEN ${transactions.paymentStatus} = 'paid' THEN 1 END)`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${transactions.paymentStatus} = 'pending' THEN 1 END)`,
    })
    .from(transactions)
    .where(donationConditions);

  // Get total distributions statistics
  const distributionsStats = await db
    .select({
      totalDistributions: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${disbursements.amount}), 0)`,
      disbursedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursements.status} = 'paid' THEN ${disbursements.amount} ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursements.status} = 'approved' THEN ${disbursements.amount} ELSE 0 END), 0)`,
      draftAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursements.status} = 'draft' THEN ${disbursements.amount} ELSE 0 END), 0)`,
      disbursedCount: sql<number>`COUNT(CASE WHEN ${disbursements.status} = 'paid' THEN 1 END)`,
      approvedCount: sql<number>`COUNT(CASE WHEN ${disbursements.status} = 'approved' THEN 1 END)`,
      draftCount: sql<number>`COUNT(CASE WHEN ${disbursements.status} = 'draft' THEN 1 END)`,
    })
    .from(disbursements)
    .where(distributionConditions);

  // Get distributions by recipient category (8 Asnaf)
  const distributionsByCategory = await db
    .select({
      category: sql<string>`${distributionAsnaf}`,
      totalAmount: sql<number>`COALESCE(SUM(${disbursements.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(disbursements)
    .where(and(distributionConditions, eq(disbursements.status, "paid")))
    .groupBy(distributionAsnaf);

  // Get donations by zakat type
  const donationsByType = await db
    .select({
      zakatTypeId: transactions.productId,
      zakatTypeName: zakatTypes.name,
      zakatTypeSlug: zakatTypes.slug,
      totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.paymentStatus} = 'paid' THEN ${transactions.totalAmount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN ${transactions.paymentStatus} = 'paid' THEN 1 END)`,
    })
    .from(transactions)
    .leftJoin(zakatTypes, eq(transactions.productId, zakatTypes.id))
    .where(donationConditions)
    .groupBy(transactions.productId, zakatTypes.name, zakatTypes.slug);

  // Get distributions by zakat type
  const distributionsByType = await db
    .select({
      zakatTypeId: sql<string>`${distributionZakatTypeId}`,
      zakatTypeName: zakatTypes.name,
      zakatTypeSlug: zakatTypes.slug,
      totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursements.status} = 'paid' THEN ${disbursements.amount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN ${disbursements.status} = 'paid' THEN 1 END)`,
    })
    .from(disbursements)
    .leftJoin(zakatTypes, sql`${distributionZakatTypeId} = ${zakatTypes.id}`)
    .where(distributionConditions)
    .groupBy(distributionZakatTypeId, zakatTypes.name, zakatTypes.slug);

  // Calculate balance (paid donations - disbursed distributions)
  const paidDonations = Number(donationsStats[0]?.paidAmount || 0);
  const disbursedDistributions = Number(distributionsStats[0]?.disbursedAmount || 0);
  const balance = paidDonations - disbursedDistributions;

  return c.json({
    success: true,
    data: {
      donations: {
        total: Number(donationsStats[0]?.totalDonations || 0),
        totalAmount: Number(donationsStats[0]?.totalAmount || 0),
        paidAmount: paidDonations,
        pendingAmount: Number(donationsStats[0]?.pendingAmount || 0),
        paidCount: Number(donationsStats[0]?.paidCount || 0),
        pendingCount: Number(donationsStats[0]?.pendingCount || 0),
      },
      distributions: {
        total: Number(distributionsStats[0]?.totalDistributions || 0),
        totalAmount: Number(distributionsStats[0]?.totalAmount || 0),
        disbursedAmount: disbursedDistributions,
        approvedAmount: Number(distributionsStats[0]?.approvedAmount || 0),
        draftAmount: Number(distributionsStats[0]?.draftAmount || 0),
        disbursedCount: Number(distributionsStats[0]?.disbursedCount || 0),
        approvedCount: Number(distributionsStats[0]?.approvedCount || 0),
        draftCount: Number(distributionsStats[0]?.draftCount || 0),
      },
      balance,
      distributionsByCategory: distributionsByCategory.map((item) => ({
        category: item.category,
        totalAmount: Number(item.totalAmount),
        count: Number(item.count),
      })),
      donationsByType: donationsByType.map((item) => ({
        zakatTypeId: item.zakatTypeId,
        zakatTypeName: item.zakatTypeName,
        zakatTypeSlug: item.zakatTypeSlug,
        totalAmount: Number(item.totalAmount),
        count: Number(item.count),
      })),
      distributionsByType: distributionsByType.map((item) => ({
        zakatTypeId: item.zakatTypeId,
        zakatTypeName: item.zakatTypeName,
        zakatTypeSlug: item.zakatTypeSlug,
        totalAmount: Number(item.totalAmount),
        count: Number(item.count),
      })),
    },
  });
});

/**
 * GET /admin/zakat/stats/recent-donations
 * Get recent zakat donations (last 10)
 */
app.get("/recent-donations", async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "10");

  const recentDonations = await db
    .select({
      donation: transactions,
      zakatType: zakatTypes,
    })
    .from(transactions)
    .leftJoin(zakatTypes, eq(transactions.productId, zakatTypes.id))
    .where(and(
      eq(transactions.productType, "zakat"),
      eq(transactions.paymentStatus, "paid")
    ))
    .orderBy(sql`${transactions.createdAt} DESC`)
    .limit(limit);

  const enrichedData = recentDonations.map((row) => ({
    ...row.donation,
    zakatTypeName: row.zakatType?.name,
    zakatTypeSlug: row.zakatType?.slug,
  }));

  return c.json({
    success: true,
    data: enrichedData,
  });
});

/**
 * GET /admin/zakat/stats/recent-distributions
 * Get recent zakat distributions (last 10)
 */
app.get("/recent-distributions", async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "10");

  const recentDistributions = await db
    .select({
      distribution: disbursements,
      zakatTypeName: sql<string>`COALESCE(${disbursements.typeSpecificData} ->> 'zakatTypeName', ${disbursements.typeSpecificData} ->> 'zakat_type_name', ${zakatTypes.name})`,
      zakatTypeSlug: sql<string>`COALESCE(${disbursements.typeSpecificData} ->> 'zakatTypeSlug', ${disbursements.typeSpecificData} ->> 'zakat_type_slug', ${zakatTypes.slug})`,
      recipientCategory: sql<string>`COALESCE(${disbursements.typeSpecificData} ->> 'asnaf', '-')`,
    })
    .from(disbursements)
    .leftJoin(zakatTypes, sql`COALESCE(${disbursements.typeSpecificData} ->> 'zakatTypeId', ${disbursements.typeSpecificData} ->> 'zakat_type_id') = ${zakatTypes.id}`)
    .where(and(eq(disbursements.disbursementType, "zakat"), eq(disbursements.status, "paid")))
    .orderBy(sql`COALESCE(${disbursements.paidAt}, ${disbursements.createdAt}) DESC`)
    .limit(limit);

  const enrichedData = recentDistributions.map((row) => ({
    id: row.distribution.id,
    referenceId: row.distribution.disbursementNumber,
    recipientName: row.distribution.recipientName,
    recipientCategory: row.recipientCategory,
    amount: row.distribution.amount,
    zakatTypeName: row.zakatTypeName,
    zakatTypeSlug: row.zakatTypeSlug,
    disbursedAt: row.distribution.paidAt,
    createdAt: row.distribution.createdAt,
  }));

  return c.json({
    success: true,
    data: enrichedData,
  });
});

export default app;
