import { Hono } from "hono";
import { zakatDonations, zakatDistributions, zakatTypes, eq, and, sql } from "@bantuanku/db";
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
  const donationConditions = zakatTypeId ? eq(zakatDonations.zakatTypeId, zakatTypeId) : undefined;
  const distributionConditions = zakatTypeId ? eq(zakatDistributions.zakatTypeId, zakatTypeId) : undefined;

  // Get total donations statistics
  const donationsStats = await db
    .select({
      totalDonations: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${zakatDonations.amount}), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDonations.paymentStatus} = 'success' THEN ${zakatDonations.amount} ELSE 0 END), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDonations.paymentStatus} = 'pending' THEN ${zakatDonations.amount} ELSE 0 END), 0)`,
      paidCount: sql<number>`COUNT(CASE WHEN ${zakatDonations.paymentStatus} = 'success' THEN 1 END)`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${zakatDonations.paymentStatus} = 'pending' THEN 1 END)`,
    })
    .from(zakatDonations)
    .where(donationConditions);

  // Get total distributions statistics
  const distributionsStats = await db
    .select({
      totalDistributions: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${zakatDistributions.amount}), 0)`,
      disbursedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDistributions.status} = 'disbursed' THEN ${zakatDistributions.amount} ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDistributions.status} = 'approved' THEN ${zakatDistributions.amount} ELSE 0 END), 0)`,
      draftAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDistributions.status} = 'draft' THEN ${zakatDistributions.amount} ELSE 0 END), 0)`,
      disbursedCount: sql<number>`COUNT(CASE WHEN ${zakatDistributions.status} = 'disbursed' THEN 1 END)`,
      approvedCount: sql<number>`COUNT(CASE WHEN ${zakatDistributions.status} = 'approved' THEN 1 END)`,
      draftCount: sql<number>`COUNT(CASE WHEN ${zakatDistributions.status} = 'draft' THEN 1 END)`,
    })
    .from(zakatDistributions)
    .where(distributionConditions);

  // Get distributions by recipient category (8 Asnaf)
  const distributionsByCategory = await db
    .select({
      category: zakatDistributions.recipientCategory,
      totalAmount: sql<number>`COALESCE(SUM(${zakatDistributions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(zakatDistributions)
    .where(
      distributionConditions
        ? and(distributionConditions, eq(zakatDistributions.status, "disbursed"))
        : eq(zakatDistributions.status, "disbursed")
    )
    .groupBy(zakatDistributions.recipientCategory);

  // Get donations by zakat type
  const donationsByType = await db
    .select({
      zakatTypeId: zakatDonations.zakatTypeId,
      zakatTypeName: zakatTypes.name,
      zakatTypeSlug: zakatTypes.slug,
      totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDonations.paymentStatus} = 'success' THEN ${zakatDonations.amount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN ${zakatDonations.paymentStatus} = 'success' THEN 1 END)`,
    })
    .from(zakatDonations)
    .leftJoin(zakatTypes, eq(zakatDonations.zakatTypeId, zakatTypes.id))
    .where(donationConditions)
    .groupBy(zakatDonations.zakatTypeId, zakatTypes.name, zakatTypes.slug);

  // Get distributions by zakat type
  const distributionsByType = await db
    .select({
      zakatTypeId: zakatDistributions.zakatTypeId,
      zakatTypeName: zakatTypes.name,
      zakatTypeSlug: zakatTypes.slug,
      totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${zakatDistributions.status} = 'disbursed' THEN ${zakatDistributions.amount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN ${zakatDistributions.status} = 'disbursed' THEN 1 END)`,
    })
    .from(zakatDistributions)
    .leftJoin(zakatTypes, eq(zakatDistributions.zakatTypeId, zakatTypes.id))
    .where(distributionConditions)
    .groupBy(zakatDistributions.zakatTypeId, zakatTypes.name, zakatTypes.slug);

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
      donation: zakatDonations,
      zakatType: zakatTypes,
    })
    .from(zakatDonations)
    .leftJoin(zakatTypes, eq(zakatDonations.zakatTypeId, zakatTypes.id))
    .where(eq(zakatDonations.paymentStatus, "success"))
    .orderBy(sql`${zakatDonations.createdAt} DESC`)
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
      distribution: zakatDistributions,
      zakatType: zakatTypes,
    })
    .from(zakatDistributions)
    .leftJoin(zakatTypes, eq(zakatDistributions.zakatTypeId, zakatTypes.id))
    .where(eq(zakatDistributions.status, "disbursed"))
    .orderBy(sql`${zakatDistributions.disbursedAt} DESC`)
    .limit(limit);

  const enrichedData = recentDistributions.map((row) => ({
    ...row.distribution,
    zakatTypeName: row.zakatType?.name,
    zakatTypeSlug: row.zakatType?.slug,
  }));

  return c.json({
    success: true,
    data: enrichedData,
  });
});

export default app;
