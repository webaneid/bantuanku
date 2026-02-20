import { Hono } from "hono";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { campaigns, transactions, users } from "@bantuanku/db";
import { success } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";
import { addDaysWIB } from "../../utils/timezone";

const analyticsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

analyticsAdmin.get("/overview", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const period = c.req.query("period") || "30d";

  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "7d":
      startDate = addDaysWIB(now, -7);
      break;
    case "30d":
      startDate = addDaysWIB(now, -30);
      break;
    case "90d":
      startDate = addDaysWIB(now, -90);
      break;
    case "1y":
      startDate = addDaysWIB(now, -365);
      break;
    default:
      startDate = addDaysWIB(now, -30);
  }

  const [totalCampaigns] = await db.select({ count: sql<number>`count(*)` }).from(campaigns);

  const [activeCampaigns] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(eq(campaigns.status, "active"));

  const [totalDonations] = await db
    .select({
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.paymentStatus, "paid"), gte(transactions.paidAt, startDate)));

  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);

  const [newUsers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(gte(users.createdAt, startDate));

  const donationTrend = await db
    .select({
      date: sql<string>`date(${transactions.paidAt})`,
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.paymentStatus, "paid"), gte(transactions.paidAt, startDate)))
    .groupBy(sql`date(${transactions.paidAt})`)
    .orderBy(sql`date(${transactions.paidAt})`);

  return success(c, {
    totalCampaigns: Number(totalCampaigns.count),
    activeCampaigns: Number(activeCampaigns.count),
    totalDonations: Number(totalDonations.count),
    totalDonationAmount: Number(totalDonations.amount || 0),
    totalUsers: Number(totalUsers.count),
    newUsers: Number(newUsers.count),
    donationTrend,
  });
});

analyticsAdmin.get("/conversion", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions: any[] = [];
  if (startDate) {
    conditions.push(gte(transactions.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(transactions.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [conversionStats] = await db
    .select({
      totalCreated: sql<number>`count(*)`,
      totalPending: sql<number>`count(*) filter (where ${transactions.paymentStatus} = 'pending')`,
      totalPartial: sql<number>`count(*) filter (where ${transactions.paymentStatus} = 'partial')`,
      totalPaid: sql<number>`count(*) filter (where ${transactions.paymentStatus} = 'paid')`,
      totalFailed: sql<number>`count(*) filter (where ${transactions.paymentStatus} = 'failed')`,
      totalExpired: sql<number>`count(*) filter (where ${transactions.paymentStatus} = 'expired')`,
      conversionRate: sql<number>`case when count(*) > 0 then (count(*) filter (where ${transactions.paymentStatus} = 'paid')::float / count(*)::float * 100) else 0 end`,
    })
    .from(transactions)
    .where(whereClause);

  const byCampaign = await db
    .select({
      campaignId: transactions.productId,
      campaignTitle: campaigns.title,
      totalCreated: sql<number>`count(*)`,
      totalPaid: sql<number>`count(*) filter (where ${transactions.paymentStatus} = 'paid')`,
      conversionRate: sql<number>`case when count(*) > 0 then (count(*) filter (where ${transactions.paymentStatus} = 'paid')::float / count(*)::float * 100) else 0 end`,
    })
    .from(transactions)
    .innerJoin(campaigns, eq(transactions.productId, campaigns.id))
    .where(whereClause ? and(eq(transactions.productType, "campaign"), whereClause) : eq(transactions.productType, "campaign"))
    .groupBy(transactions.productId, campaigns.title)
    .orderBy(sql`case when count(*) > 0 then (count(*) filter (where ${transactions.paymentStatus} = 'paid')::float / count(*)::float * 100) else 0 end desc`)
    .limit(10);

  return success(c, {
    overall: conversionStats,
    byCampaign,
  });
});

analyticsAdmin.get("/growth", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const period = c.req.query("period") || "monthly";

  let dateFormat = "YYYY-MM";
  if (period === "daily") {
    dateFormat = "YYYY-MM-DD";
  } else if (period === "weekly") {
    dateFormat = "YYYY-IW";
  } else if (period === "yearly") {
    dateFormat = "YYYY";
  }

  const donationGrowth = await db
    .select({
      period: sql<string>`to_char(${transactions.paidAt}, ${dateFormat})`,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      uniqueDonors: sql<number>`count(distinct ${transactions.donorName})`,
    })
    .from(transactions)
    .where(eq(transactions.paymentStatus, "paid"))
    .groupBy(sql`to_char(${transactions.paidAt}, ${dateFormat})`)
    .orderBy(sql`to_char(${transactions.paidAt}, ${dateFormat})`);

  const campaignGrowth = await db
    .select({
      period: sql<string>`to_char(${campaigns.createdAt}, ${dateFormat})`,
      totalCampaigns: sql<number>`count(*)`,
      activeCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'active')`,
    })
    .from(campaigns)
    .groupBy(sql`to_char(${campaigns.createdAt}, ${dateFormat})`)
    .orderBy(sql`to_char(${campaigns.createdAt}, ${dateFormat})`);

  const userGrowth = await db
    .select({
      period: sql<string>`to_char(${users.createdAt}, ${dateFormat})`,
      totalUsers: sql<number>`count(*)`,
    })
    .from(users)
    .groupBy(sql`to_char(${users.createdAt}, ${dateFormat})`)
    .orderBy(sql`to_char(${users.createdAt}, ${dateFormat})`);

  return success(c, {
    donationGrowth,
    campaignGrowth,
    userGrowth,
  });
});

export default analyticsAdmin;
