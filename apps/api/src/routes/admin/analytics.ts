import { Hono } from "hono";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { campaigns, transactions, users } from "@bantuanku/db";
import { success } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";
import { addDaysWIB, APP_TIMEZONE, startOfDayWIB, endOfDayWIB } from "../../utils/timezone";

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
      date: sql<string>`date(${transactions.paidAt} AT TIME ZONE 'Asia/Jakarta')`,
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.paymentStatus, "paid"), gte(transactions.paidAt, startDate)))
    .groupBy(sql`date(${transactions.paidAt} AT TIME ZONE 'Asia/Jakarta')`)
    .orderBy(sql`date(${transactions.paidAt} AT TIME ZONE 'Asia/Jakarta')`);

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
    conditions.push(gte(transactions.createdAt, startOfDayWIB(startDate)));
  }
  if (endDate) {
    conditions.push(lte(transactions.createdAt, endOfDayWIB(endDate)));
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

  // dateFormat hanya salah satu dari 4 konstanta di atas (bukan input user), jadi aman
  // di-inline sebagai literal. Wajib literal (bukan parameter terikat): kalau tidak,
  // ekspresi di SELECT dan GROUP BY menjadi placeholder berbeda dan Postgres menolak
  // dengan "must appear in the GROUP BY clause".
  const bucket = (col: any) =>
    sql`to_char(${col} AT TIME ZONE ${sql.raw(`'${APP_TIMEZONE}'`)}, ${sql.raw(`'${dateFormat}'`)})`;

  const donationGrowth = await db
    .select({
      period: bucket(transactions.paidAt),
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      uniqueDonors: sql<number>`count(distinct ${transactions.donorName})`,
    })
    .from(transactions)
    .where(eq(transactions.paymentStatus, "paid"))
    .groupBy(bucket(transactions.paidAt))
    .orderBy(bucket(transactions.paidAt));

  const campaignGrowth = await db
    .select({
      period: bucket(campaigns.createdAt),
      totalCampaigns: sql<number>`count(*)`,
      activeCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'active')`,
    })
    .from(campaigns)
    .groupBy(bucket(campaigns.createdAt))
    .orderBy(bucket(campaigns.createdAt));

  const userGrowth = await db
    .select({
      period: bucket(users.createdAt),
      totalUsers: sql<number>`count(*)`,
    })
    .from(users)
    .groupBy(bucket(users.createdAt))
    .orderBy(bucket(users.createdAt));

  return success(c, {
    donationGrowth,
    campaignGrowth,
    userGrowth,
  });
});

export default analyticsAdmin;
