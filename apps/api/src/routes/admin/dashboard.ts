import { Hono } from "hono";
import { eq, sql, and, gte, lte, desc, like } from "drizzle-orm";
import { transactions, campaigns, disbursements } from "@bantuanku/db";
import { success } from "../../lib/response";
import type { Env, Variables } from "../../types";
import { getStartOfMonthWIB, addDaysWIB } from "../../utils/timezone";

const dashboard = new Hono<{ Bindings: Env; Variables: Variables }>();

dashboard.get("/stats", async (c) => {
  const db = c.get("db");

  const now = new Date();
  const startOfMonth = getStartOfMonthWIB(now);

  const [
    totalDonations,
    totalAmount,
    totalCampaigns,
    monthlyDonations,
    monthlyAmount,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.paymentStatus, "paid")),
    db
      .select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
      .from(transactions)
      .where(eq(transactions.paymentStatus, "paid")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.paymentStatus, "paid"),
          gte(transactions.paidAt, startOfMonth)
        )
      ),
    db
      .select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.paymentStatus, "paid"),
          gte(transactions.paidAt, startOfMonth)
        )
      ),
  ]);

  return success(c, {
    totalDonations: Number(totalDonations[0]?.count || 0),
    totalAmount: Number(totalAmount[0]?.sum || 0),
    totalCampaigns: Number(totalCampaigns[0]?.count || 0),
    monthlyDonations: Number(monthlyDonations[0]?.count || 0),
    monthlyAmount: Number(monthlyAmount[0]?.sum || 0),
  });
});

dashboard.get("/recent-donations", async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "10");

  const data = await db
    .select({
      id: transactions.id,
      referenceId: transactions.transactionNumber,
      donorName: transactions.donorName,
      isAnonymous: transactions.isAnonymous,
      amount: transactions.totalAmount,
      paidAt: transactions.paidAt,
      productId: transactions.productId,
      productType: transactions.productType,
      productName: transactions.productName,
    })
    .from(transactions)
    .where(eq(transactions.paymentStatus, "paid"))
    .orderBy(desc(transactions.paidAt))
    .limit(limit);

  return success(c, data);
});

// Phase 3: Category-based dashboard stats
dashboard.get("/stats-by-category", async (c) => {
  const db = c.get("db");

  // Income by category
  const incomeByCategory = await db
    .select({
      category: transactions.category,
      total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(eq(transactions.paymentStatus, "paid"))
    .groupBy(transactions.category);

  // Expense by category
  const expenseByCategory = await db
    .select({
      category: disbursements.category,
      total: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(disbursements)
    .where(eq(disbursements.status, "paid"))
    .groupBy(disbursements.category);

  // Summary by product type
  const zakatIncome = incomeByCategory
    .filter(item => item.category.startsWith('zakat_'))
    .reduce((sum, item) => sum + Number(item.total), 0);

  const campaignIncome = incomeByCategory
    .filter(item => item.category === 'campaign_donation')
    .reduce((sum, item) => sum + Number(item.total), 0);

  const qurbanIncome = incomeByCategory
    .filter(item => item.category.startsWith('qurban_'))
    .reduce((sum, item) => sum + Number(item.total), 0);

  const zakatExpense = expenseByCategory
    .filter(item => item.category.startsWith('zakat_to_'))
    .reduce((sum, item) => sum + Number(item.total), 0);

  const campaignExpense = expenseByCategory
    .filter(item => item.category.startsWith('campaign_'))
    .reduce((sum, item) => sum + Number(item.total), 0);

  const qurbanExpense = expenseByCategory
    .filter(item => item.category.startsWith('qurban_purchase_') || item.category === 'qurban_execution_fee')
    .reduce((sum, item) => sum + Number(item.total), 0);

  const operationalExpense = expenseByCategory
    .filter(item => item.category.startsWith('operational_'))
    .reduce((sum, item) => sum + Number(item.total), 0);

  return success(c, {
    income: {
      zakat: zakatIncome,
      campaign: campaignIncome,
      qurban: qurbanIncome,
      total: zakatIncome + campaignIncome + qurbanIncome,
      byCategory: incomeByCategory.map(item => ({
        category: item.category,
        total: Number(item.total),
        count: Number(item.count),
      })),
    },
    expense: {
      zakat: zakatExpense,
      campaign: campaignExpense,
      qurban: qurbanExpense,
      operational: operationalExpense,
      total: zakatExpense + campaignExpense + qurbanExpense + operationalExpense,
      byCategory: expenseByCategory.map(item => ({
        category: item.category,
        total: Number(item.total),
        count: Number(item.count),
      })),
    },
    balance: {
      zakat: zakatIncome - zakatExpense,
      campaign: campaignIncome - campaignExpense,
      qurban: qurbanIncome - qurbanExpense,
      operational: -operationalExpense,
      total: (zakatIncome + campaignIncome + qurbanIncome) - (zakatExpense + campaignExpense + qurbanExpense + operationalExpense),
    },
  });
});

// Enhanced stats: KPI + trend + period comparison in one request
dashboard.get("/enhanced-stats", async (c) => {
  const db = c.get("db");
  const period = c.req.query("period") || "30d";

  const now = new Date();

  let currentStart: Date;
  let previousStart: Date;
  switch (period) {
    case "7d":
      currentStart = addDaysWIB(now, -7);
      previousStart = addDaysWIB(now, -14);
      break;
    case "90d":
      currentStart = addDaysWIB(now, -90);
      previousStart = addDaysWIB(now, -180);
      break;
    default: // 30d
      currentStart = addDaysWIB(now, -30);
      previousStart = addDaysWIB(now, -60);
      break;
  }

  const [
    currentPeriodStats,
    previousPeriodStats,
    totalAllTime,
    activeCampaigns,
    totalDonors,
    pendingDisbursements,
    dailyTrend,
  ] = await Promise.all([
    db.select({
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    }).from(transactions)
      .where(and(eq(transactions.paymentStatus, "paid"), gte(transactions.paidAt, currentStart))),

    db.select({
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    }).from(transactions)
      .where(and(
        eq(transactions.paymentStatus, "paid"),
        gte(transactions.paidAt, previousStart),
        lte(transactions.paidAt, currentStart)
      )),

    db.select({
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    }).from(transactions)
      .where(eq(transactions.paymentStatus, "paid")),

    db.select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),

    db.select({
      count: sql<number>`count(distinct ${transactions.donorName})`,
    }).from(transactions)
      .where(eq(transactions.paymentStatus, "paid")),

    db.select({
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
    }).from(disbursements)
      .where(eq(disbursements.status, "submitted")),

    db.select({
      date: sql<string>`date(${transactions.paidAt})`,
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    }).from(transactions)
      .where(and(eq(transactions.paymentStatus, "paid"), gte(transactions.paidAt, currentStart)))
      .groupBy(sql`date(${transactions.paidAt})`)
      .orderBy(sql`date(${transactions.paidAt})`),
  ]);

  const currentAmount = Number(currentPeriodStats[0]?.amount || 0);
  const previousAmount = Number(previousPeriodStats[0]?.amount || 0);
  const currentCount = Number(currentPeriodStats[0]?.count || 0);
  const previousCount = Number(previousPeriodStats[0]?.count || 0);

  const amountChange = previousAmount > 0
    ? ((currentAmount - previousAmount) / previousAmount) * 100
    : currentAmount > 0 ? 100 : 0;

  const countChange = previousCount > 0
    ? ((currentCount - previousCount) / previousCount) * 100
    : currentCount > 0 ? 100 : 0;

  return success(c, {
    period: {
      current: { transactions: currentCount, amount: currentAmount },
      previous: { transactions: previousCount, amount: previousAmount },
      changes: {
        amountPercent: Math.round(amountChange * 10) / 10,
        countPercent: Math.round(countChange * 10) / 10,
      },
    },
    totals: {
      allTimeTransactions: Number(totalAllTime[0]?.count || 0),
      allTimeAmount: Number(totalAllTime[0]?.amount || 0),
      activeCampaigns: Number(activeCampaigns[0]?.count || 0),
      uniqueDonors: Number(totalDonors[0]?.count || 0),
      pendingDisbursements: Number(pendingDisbursements[0]?.count || 0),
      pendingDisbursementsAmount: Number(pendingDisbursements[0]?.amount || 0),
    },
    trend: dailyTrend.map(d => ({
      date: d.date,
      count: Number(d.count),
      amount: Number(d.amount),
    })),
  });
});

export default dashboard;
