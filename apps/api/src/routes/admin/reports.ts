import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql, sum, inArray, or, like } from "drizzle-orm";
import {
  campaigns,
  transactions,
  disbursements,
  revenueShares,
  mitra,
  fundraisers,
  donatur,
  zakatPeriods,
  zakatTypes,
  qurbanPeriods,
  qurbanPackagePeriods,
  qurbanPackages,
  qurbanExecutions,
  qurbanSharedGroups,
  users,
  chartOfAccounts,
} from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";
import { RevenueShareService } from "../../services/revenue-share";

const reportsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const parsePagination = (pageRaw?: string, limitRaw?: string, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(limitRaw || String(defaultLimit), 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const INCOME_CATEGORIES = [
  "campaign_donation",
  "zakat_fitrah",
  "zakat_maal",
  "zakat_profesi",
  "zakat_pertanian",
  "zakat_peternakan",
  "zakat_bisnis",
  "qurban_payment",
  "qurban_savings",
  "qurban_admin_fee",
] as const;

const EXPENSE_CATEGORIES = [
  "zakat_to_fakir",
  "zakat_to_miskin",
  "zakat_to_amil",
  "zakat_to_mualaf",
  "zakat_to_riqab",
  "zakat_to_gharim",
  "zakat_to_fisabilillah",
  "zakat_to_ibnussabil",
  "campaign_to_beneficiary",
  "campaign_to_vendor",
  "qurban_purchase_sapi",
  "qurban_purchase_kambing",
  "qurban_execution_fee",
  "operational_salary",
  "operational_rent",
  "operational_utilities",
  "operational_internet",
  "operational_marketing",
  "operational_pg_fee",
  "operational_bank_fee",
  "operational_supplies",
  "operational_other",
  "vendor_general_payment",
  "revenue_share_mitra",
  "revenue_share_fundraiser",
  "revenue_share_developer",
] as const;

const ZAKAT_INCOME_CATEGORIES = [
  "zakat_fitrah",
  "zakat_maal",
  "zakat_profesi",
  "zakat_pertanian",
  "zakat_peternakan",
  "zakat_bisnis",
] as const;

const ZAKAT_EXPENSE_CATEGORIES = [
  "zakat_to_fakir",
  "zakat_to_miskin",
  "zakat_to_amil",
  "zakat_to_mualaf",
  "zakat_to_riqab",
  "zakat_to_gharim",
  "zakat_to_fisabilillah",
  "zakat_to_ibnussabil",
] as const;

const QURBAN_INCOME_CATEGORIES = [
  "qurban_payment",
  "qurban_savings",
  "qurban_admin_fee",
] as const;

const QURBAN_EXPENSE_CATEGORIES = [
  "qurban_purchase_sapi",
  "qurban_purchase_kambing",
  "qurban_execution_fee",
] as const;

const CAMPAIGN_INCOME_CATEGORIES = ["campaign_donation"] as const;
const CAMPAIGN_EXPENSE_CATEGORIES = ["campaign_to_beneficiary", "campaign_to_vendor"] as const;
const findInvalidCategories = (rows: Array<{ category: string | null | undefined }>, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  return Array.from(new Set(
    rows
      .map((r) => (r.category || "").trim())
      .filter((c) => c.length > 0 && !allowedSet.has(c))
  ));
};

reportsAdmin.get("/dashboard", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const txnConds = [eq(transactions.paymentStatus, "paid")];
  const disbConds = [eq(disbursements.status, "paid")];

  if (startDate) {
    txnConds.push(gte(transactions.paidAt, new Date(startDate)));
    disbConds.push(gte(disbursements.paidAt, new Date(startDate)));
  }

  if (endDate) {
    txnConds.push(lte(transactions.paidAt, new Date(endDate)));
    disbConds.push(lte(disbursements.paidAt, new Date(endDate)));
  }

  const [incomeSummary] = await db
    .select({
      totalIncome: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      donationCount: sql<number>`count(*)`,
      uniqueDonors: sql<number>`count(distinct ${transactions.userId})`,
    })
    .from(transactions)
    .where(and(...txnConds));

  const [expenseSummary] = await db
    .select({
      totalExpense: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
      disbursementCount: sql<number>`count(*)`,
    })
    .from(disbursements)
    .where(and(...disbConds));

  const [campaignSummary] = await db
    .select({
      totalCampaigns: sql<number>`count(*)`,
      activeCampaigns: sql<number>`count(*) filter (where ${campaigns.status} in ('active','published','ongoing'))`,
    })
    .from(campaigns);

  const totalIncome = Number(incomeSummary?.totalIncome || 0);
  const totalExpense = Number(expenseSummary?.totalExpense || 0);

  return success(c, {
    period: { startDate: startDate || null, endDate: endDate || null },
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      donationCount: Number(incomeSummary?.donationCount || 0),
      disbursementCount: Number(expenseSummary?.disbursementCount || 0),
      uniqueDonors: Number(incomeSummary?.uniqueDonors || 0),
      totalCampaigns: Number(campaignSummary?.totalCampaigns || 0),
      activeCampaigns: Number(campaignSummary?.activeCampaigns || 0),
    },
  });
});

reportsAdmin.get("/donations-summary", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [eq(transactions.paymentStatus, "paid")];

  if (startDate) {
    conditions.push(gte(transactions.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(transactions.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [summary] = await db
    .select({
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${transactions.totalAmount})`,
      totalFees: sql<number>`0`,
      avgDonation: sql<number>`avg(${transactions.totalAmount})`,
      uniqueDonors: sql<number>`count(distinct ${transactions.userId})`,
    })
    .from(transactions)
    .where(whereClause);

  const byCampaign = await db
    .select({
      campaignId: transactions.productId,
      campaignTitle: campaigns.title,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${transactions.totalAmount})`,
      donorCount: sql<number>`count(distinct ${transactions.userId})`,
    })
    .from(transactions)
    .innerJoin(campaigns, and(
      eq(transactions.productType, "campaign"),
      eq(transactions.productId, campaigns.id)
    ))
    .where(whereClause)
    .groupBy(transactions.productId, campaigns.title)
    .orderBy(desc(sql<number>`sum(${transactions.totalAmount})`))
    .limit(10);

  const byDate = await db
    .select({
      date: sql<string>`date(${transactions.createdAt})`,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${transactions.totalAmount})`,
    })
    .from(transactions)
    .where(whereClause)
    .groupBy(sql`date(${transactions.createdAt})`)
    .orderBy(sql`date(${transactions.createdAt})`);

  return success(c, {
    summary,
    byCampaign,
    byDate,
  });
});

reportsAdmin.get("/campaigns-performance", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(campaigns.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(campaigns.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const campaignRows = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      category: campaigns.category,
      pillar: campaigns.pillar,
      goal: campaigns.goal,
      donorCount: campaigns.donorCount,
      status: campaigns.status,
      createdAt: campaigns.createdAt,
      publishedAt: campaigns.publishedAt,
      daysActive: sql<number>`extract(day from (now() - ${campaigns.publishedAt}))`,
    })
    .from(campaigns)
    .where(whereClause);

  const collectedRows = await db
    .select({
      productId: transactions.productId,
      totalCollected: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      donorCount: sql<number>`count(distinct ${transactions.donorEmail})`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.paymentStatus, "paid"),
      eq(transactions.productType, "campaign")
    ))
    .groupBy(transactions.productId);

  const collectedMap = Object.fromEntries(collectedRows.map((r) => [r.productId, {
    totalCollected: Number(r.totalCollected),
    donorCount: Number(r.donorCount),
  }]));

  const performance = campaignRows
    .map((row) => {
      const collected = collectedMap[row.id]?.totalCollected || 0;
      const donors = collectedMap[row.id]?.donorCount || Number(row.donorCount || 0);
      const goal = Number(row.goal || 0);
      return {
        ...row,
        goal,
        collected,
        donorCount: donors,
        progressPercentage: goal > 0 ? (collected / goal) * 100 : 0,
      };
    })
    .sort((a, b) => b.collected - a.collected);

  const byCategoryMap = new Map<string, { totalCampaigns: number; totalGoal: number; totalCollected: number; totalDonors: number }>();
  const byPillarMap = new Map<string, { totalCampaigns: number; totalGoal: number; totalCollected: number; totalDonors: number }>();

  for (const item of performance) {
    const catKey = item.category || "lainnya";
    const pilKey = item.pillar || "lainnya";

    if (!byCategoryMap.has(catKey)) byCategoryMap.set(catKey, { totalCampaigns: 0, totalGoal: 0, totalCollected: 0, totalDonors: 0 });
    if (!byPillarMap.has(pilKey)) byPillarMap.set(pilKey, { totalCampaigns: 0, totalGoal: 0, totalCollected: 0, totalDonors: 0 });

    const cat = byCategoryMap.get(catKey)!;
    cat.totalCampaigns += 1;
    cat.totalGoal += Number(item.goal || 0);
    cat.totalCollected += Number(item.collected || 0);
    cat.totalDonors += Number(item.donorCount || 0);

    const pil = byPillarMap.get(pilKey)!;
    pil.totalCampaigns += 1;
    pil.totalGoal += Number(item.goal || 0);
    pil.totalCollected += Number(item.collected || 0);
    pil.totalDonors += Number(item.donorCount || 0);
  }

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.totalCollected - a.totalCollected);

  const byPillar = Array.from(byPillarMap.entries())
    .map(([pillar, v]) => ({ pillar, ...v }))
    .sort((a, b) => b.totalCollected - a.totalCollected);

  return success(c, {
    performance,
    byCategory,
    byPillar,
  });
});

reportsAdmin.get("/financial-statement", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  // Universal-source financial statement (no legacy ledger dependency)
  // Source of truth:
  // - Income: paid transactions (+ unique code)
  // - Expense: paid disbursements
  // - Liability: campaign titipan

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if ((startDate && !dateRegex.test(startDate)) || (endDate && !dateRegex.test(endDate))) {
    return error(c, "Invalid date format. Use YYYY-MM-DD", 400);
  }

  const txnStartFilter = startDate ? `AND COALESCE(t.paid_at, t.created_at) >= '${startDate}'::timestamp` : "";
  const txnEndFilter = endDate ? `AND COALESCE(t.paid_at, t.created_at) <= '${endDate} 23:59:59'::timestamp` : "";
  const disbStartFilter = startDate ? `AND COALESCE(d.paid_at, d.created_at) >= '${startDate}'::timestamp` : "";
  const disbEndFilter = endDate ? `AND COALESCE(d.paid_at, d.created_at) <= '${endDate} 23:59:59'::timestamp` : "";

  const aggResult = await db.execute(sql.raw(`
    WITH income_all AS (
      SELECT COALESCE(SUM(t.total_amount), 0)::numeric AS total
      FROM transactions t
      WHERE t.payment_status = 'paid'
      ${txnStartFilter}
      ${txnEndFilter}
    ),
    unique_income AS (
      SELECT COALESCE(SUM(t.unique_code), 0)::numeric AS total
      FROM transactions t
      WHERE t.payment_status = 'paid'
        AND t.unique_code > 0
      ${txnStartFilter}
      ${txnEndFilter}
    ),
    campaign_income AS (
      SELECT COALESCE(SUM(t.total_amount), 0)::numeric AS total
      FROM transactions t
      WHERE t.payment_status = 'paid'
        AND t.product_type = 'campaign'
      ${txnStartFilter}
      ${txnEndFilter}
    ),
    disb_all AS (
      SELECT COALESCE(SUM(d.amount), 0)::numeric AS total
      FROM disbursements d
      WHERE d.status = 'paid'
      ${disbStartFilter}
      ${disbEndFilter}
    ),
    disb_campaign AS (
      SELECT COALESCE(SUM(d.amount), 0)::numeric AS total
      FROM disbursements d
      WHERE d.status = 'paid'
        AND d.reference_type = 'campaign'
      ${disbStartFilter}
      ${disbEndFilter}
    )
    SELECT
      (SELECT total FROM income_all) AS income_all,
      (SELECT total FROM unique_income) AS unique_income,
      (SELECT total FROM campaign_income) AS campaign_income,
      (SELECT total FROM disb_all) AS disb_all,
      (SELECT total FROM disb_campaign) AS disb_campaign
  `));

  const agg: any = aggResult.rows[0] || {};

  const totalRevenue = Number(agg.income_all || 0) + Number(agg.unique_income || 0);
  const totalExpenses = Number(agg.disb_all || 0);
  const netIncome = totalRevenue - totalExpenses;

  const campaignLiability = Math.max(0, Number(agg.campaign_income || 0) - Number(agg.disb_campaign || 0));
  const totalLiabilities = campaignLiability;

  const totalAssets = netIncome;
  const totalEquity = totalAssets - totalLiabilities;

  const assets = [
    {
      accountCode: "1100",
      accountName: "Kas & Bank (Net)",
      accountType: "asset",
      totalDebit: totalAssets,
      totalCredit: 0,
      balance: totalAssets,
    },
  ];

  const liabilities = [
    {
      accountCode: "2100",
      accountName: "Titipan Dana Campaign",
      accountType: "liability",
      totalDebit: 0,
      totalCredit: campaignLiability,
      balance: campaignLiability,
    },
  ];

  const equity = [
    {
      accountCode: "3100",
      accountName: "Saldo Bersih Berjalan",
      accountType: "equity",
      totalDebit: 0,
      totalCredit: totalEquity,
      balance: totalEquity,
    },
  ];

  const revenue = [
    {
      accountCode: "4100",
      accountName: "Pendapatan Penerimaan Dana",
      accountType: "revenue",
      totalDebit: 0,
      totalCredit: totalRevenue,
      balance: totalRevenue,
    },
  ];

  const expenses = [
    {
      accountCode: "5100",
      accountName: "Beban Penyaluran & Operasional",
      accountType: "expense",
      totalDebit: totalExpenses,
      totalCredit: 0,
      balance: totalExpenses,
    },
  ];

  return success(c, {
    balanceSheet: {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    },
    incomeStatement: {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome,
    },
  });
});

reportsAdmin.get("/ledger-summary", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(disbursements.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(disbursements.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [summary] = await db
    .select({
      totalDisbursements: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${disbursements.amount})`,
      pending: sql<number>`count(*) filter (where ${disbursements.status} in ('draft','submitted'))`,
      processing: sql<number>`count(*) filter (where ${disbursements.status} = 'approved')`,
      completed: sql<number>`count(*) filter (where ${disbursements.status} = 'paid')`,
      cancelled: sql<number>`count(*) filter (where ${disbursements.status} = 'rejected')`,
    })
    .from(disbursements)
    .where(whereClause);

  const byCampaign = await db
    .select({
      campaignId: disbursements.referenceId,
      campaignTitle: campaigns.title,
      totalDisbursements: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${disbursements.amount})`,
    })
    .from(disbursements)
    .innerJoin(campaigns, and(
      eq(disbursements.referenceType, "campaign"),
      eq(disbursements.referenceId, campaigns.id)
    ))
    .where(whereClause)
    .groupBy(disbursements.referenceId, campaigns.title)
    .orderBy(desc(sql<number>`sum(${disbursements.amount})`))
    .limit(10);

  return success(c, {
    summary,
    byCampaign,
  });
});

reportsAdmin.get("/donor-analytics", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [eq(transactions.paymentStatus, "paid")];

  if (startDate) {
    conditions.push(gte(transactions.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(transactions.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const topDonors = await db
    .select({
      userId: transactions.userId,
      donorName: transactions.donorName,
      donorEmail: transactions.donorEmail,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${transactions.totalAmount})`,
      avgDonation: sql<number>`avg(${transactions.totalAmount})`,
      lastDonation: sql<Date>`max(${transactions.createdAt})`,
    })
    .from(transactions)
    .where(whereClause)
    .groupBy(transactions.userId, transactions.donorName, transactions.donorEmail)
    .orderBy(desc(sql<number>`sum(${transactions.totalAmount})`))
    .limit(20);

  const donorRetention = await db
    .select({
      month: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM')`,
      newDonors: sql<number>`0`,
      returningDonors: sql<number>`0`,
    })
    .from(transactions)
    .where(whereClause)
    .groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`);

  return success(c, {
    topDonors,
    donorRetention,
  });
});

/**
 * GET /admin/reports/liability-balance
 *
 * Get liability balance (saldo titipan dana) per campaign
 *
 * This report shows:
 * - Total donations received (credit to 2010)
 * - Total disbursements made (debit to 2010)
 * - Remaining liability (donations - disbursements)
 *
 * Based on ledger entries with account code 2010 (Titipan Dana Campaign)
 */
reportsAdmin.get("/liability-balance", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  try {
    // Query to calculate liability balance per campaign from CURRENT universal tables
    //
    // Logic:
    // - Donations: paid transactions (product_type = campaign)
    // - Disbursements: paid disbursements (reference_type = campaign)
    // - Remaining = donations - disbursements
    const result = await db.execute(sql`
      WITH donations_by_campaign AS (
        SELECT
          t.product_id::text AS campaign_id,
          COALESCE(SUM(t.total_amount), 0)::numeric AS total_donations,
          COUNT(t.id)::int AS donation_count
        FROM transactions t
        WHERE t.product_type = 'campaign'
          AND t.payment_status = 'paid'
        GROUP BY t.product_id
      ),
      disbursements_by_campaign AS (
        SELECT
          d.reference_id::text AS campaign_id,
          COALESCE(SUM(d.amount), 0)::numeric AS total_disbursements,
          COUNT(d.id)::int AS disbursement_count
        FROM disbursements d
        WHERE d.reference_type = 'campaign'
          AND d.status = 'paid'
        GROUP BY d.reference_id
      )
      SELECT
        c.id AS "campaignId",
        c.title AS "campaignTitle",
        COALESCE(dbc.total_donations, 0)::numeric AS "totalDonations",
        COALESCE(sbc.total_disbursements, 0)::numeric AS "totalDisbursements",
        (COALESCE(dbc.total_donations, 0) - COALESCE(sbc.total_disbursements, 0))::numeric AS "remainingLiability",
        COALESCE(dbc.donation_count, 0)::int AS "donationCount",
        COALESCE(sbc.disbursement_count, 0)::int AS "disbursementCount"
      FROM campaigns c
      LEFT JOIN donations_by_campaign dbc ON dbc.campaign_id = c.id
      LEFT JOIN disbursements_by_campaign sbc ON sbc.campaign_id = c.id
      WHERE (COALESCE(dbc.total_donations, 0) > 0 OR COALESCE(sbc.total_disbursements, 0) > 0)
      ORDER BY "remainingLiability" DESC
    `);

    // Convert BigInt to Number for JSON serialization
    const data = result.rows.map((row: any) => ({
      campaignId: row.campaignId,
      campaignTitle: row.campaignTitle,
      totalDonations: Number(row.totalDonations || 0),
      totalDisbursements: Number(row.totalDisbursements || 0),
      remainingLiability: Number(row.remainingLiability || 0),
      donationCount: Number(row.donationCount || 0),
      disbursementCount: Number(row.disbursementCount || 0),
    }));

    return success(c, data);
  } catch (err) {
    console.error("Liability balance report error:", err);
    return error(c, "Failed to generate liability balance report", 500);
  }
});

/**
 * GET /admin/reports/account-balance/:code
 *
 * Get balance for a specific ledger account
 * Useful for checking 2010 (Titipan Dana) or any other account
 */
reportsAdmin.get("/account-balance/:code", requireRole("super_admin", "admin_finance"), async (c) => {
  return error(c, "Legacy ledger account balance endpoint is deprecated. Use /admin/reports/financial-statement (universal source).", 410);
});

/**
 * GET /admin/reports/cash-flow
 *
 * Cash Flow Report - Mutasi Kas & Bank
 * Source of truth: transactions (kas masuk) + disbursements (kas keluar)
 */
reportsAdmin.get("/cash-flow", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const accountCode = c.req.query("accountCode");
    const refType = c.req.query("refType");
    const search = c.req.query("search");
    const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"), 50, 200);

    if (!startDate || !endDate) {
      return error(c, "startDate and endDate are required", 400);
    }

    // Validate date format to prevent SQL injection
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return error(c, "Invalid date format. Use YYYY-MM-DD", 400);
    }

    // Add time to make endDate inclusive (end of day)
    const endDateTime = `${endDate} 23:59:59`;

    const STANDARD_CASH_ACCOUNT_CODES = new Set(["6201", "6202", "6203", "6204", "6205", "6206", "6210"]);
    const normalizeBankId = (value?: string | null) => {
      if (!value) return null;
      return value.startsWith("bank_") ? value.replace("bank_", "") : value;
    };

    // Opening balance is always 0 for now (we don't track historical balance yet)
    const openingBalance = 0;

    // Get transactions from universal transactions table (kas masuk) and disbursements (kas keluar)
    console.log(`[Cash Flow] Querying from ${startDate} to ${endDateTime}, refType: ${refType}, search: ${search}`);
    const result = await db.execute(sql.raw(`
      SELECT * FROM (
        -- All Transactions (kas masuk) - campaign, zakat, qurban
        SELECT
          t.id as transaction_id,
          COALESCE(t.paid_at, t.created_at) as transaction_date,
          t.product_type as transaction_type,
          t.total_amount::numeric as kas_masuk,
          0::numeric as kas_keluar,
          '1020' as account_code,
          'Bank - Operasional' as account_name,
          t.donor_name,
          t.donor_email,
          t.payment_method_id as payment_method,
          t.bank_account_id as bank_account_id,
          t.product_name as campaign_title,
          NULL as purpose,
          NULL as recipient_name,
          NULL as source_bank_id,
          NULL as source_bank_name,
          NULL as source_bank_account,
          EXISTS(SELECT 1 FROM transaction_payments tp WHERE tp.transaction_id = t.id AND tp.payment_proof IS NOT NULL) as has_evidence
        FROM transactions t
        WHERE t.payment_status = 'paid'
          AND COALESCE(t.paid_at, t.created_at) >= '${startDate}'::timestamp
          AND COALESCE(t.paid_at, t.created_at) <= '${endDateTime}'::timestamp

        UNION ALL

        -- New Disbursements (kas keluar)
        SELECT
          d.id as transaction_id,
          COALESCE(d.paid_at, d.created_at) as transaction_date,
          CASE
            WHEN d.category LIKE 'zakat_to_%' THEN 'zakat_distribution'
            WHEN d.category LIKE 'qurban_%' THEN 'qurban_disbursement'
            WHEN d.category LIKE 'campaign_%' THEN 'campaign_disbursement'
            ELSE 'disbursement'
          END as transaction_type,
          0::numeric as kas_masuk,
          d.amount::numeric as kas_keluar,
          '1020' as account_code,
          'Bank - Operasional' as account_name,
          NULL as donor_name,
          NULL as donor_email,
          d.payment_method,
          d.bank_account_id as bank_account_id,
          COALESCE(d.reference_name, '') as campaign_title,
          d.purpose,
          d.recipient_name,
          d.source_bank_id,
          d.source_bank_name,
          d.source_bank_account,
          d.payment_proof IS NOT NULL as has_evidence
        FROM disbursements d
        WHERE d.status = 'paid'
          AND COALESCE(d.paid_at, d.created_at) >= '${startDate}'::timestamp
          AND COALESCE(d.paid_at, d.created_at) <= '${endDateTime}'::timestamp

        UNION ALL

        -- Kode Unik Income (kas masuk terpisah)
        SELECT
          t2.id as transaction_id,
          COALESCE(t2.paid_at, t2.created_at) as transaction_date,
          'unique_code' as transaction_type,
          t2.unique_code::numeric as kas_masuk,
          0::numeric as kas_keluar,
          '1020' as account_code,
          'Bank - Operasional' as account_name,
          t2.donor_name,
          t2.donor_email,
          t2.payment_method_id as payment_method,
          t2.bank_account_id as bank_account_id,
          t2.product_name as campaign_title,
          NULL as purpose,
          NULL as recipient_name,
          NULL as source_bank_id,
          NULL as source_bank_name,
          NULL as source_bank_account,
          false as has_evidence
        FROM transactions t2
        WHERE t2.payment_status = 'paid'
          AND t2.unique_code > 0
          AND COALESCE(t2.paid_at, t2.created_at) >= '${startDate}'::timestamp
          AND COALESCE(t2.paid_at, t2.created_at) <= '${endDateTime}'::timestamp
      ) AS all_transactions
      ORDER BY transaction_date DESC
    `));

    console.log(`[Cash Flow] Found ${result.rows.length} transactions`);

    // Step 3: Fetch bank accounts from settings to map payment_method_id
    const allSettings = await db.query.settings.findMany();
    const bankAccountsSetting = allSettings.find((s: any) =>
      s.category === "payment" && s.key === "payment_bank_accounts"
    );
    let bankAccounts: any[] = [];
    if (bankAccountsSetting?.value) {
      try {
        bankAccounts = JSON.parse(bankAccountsSetting.value);
      } catch (e) {
        console.error('[Cash Flow] Error parsing bank accounts:', e);
      }
    }
    const bankById = new Map<string, any>();
    for (const account of bankAccounts) {
      if (!account?.id) continue;
      bankById.set(String(account.id), account);
    }
    const coaRows = await db
      .select({
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
      })
      .from(chartOfAccounts)
      .where(inArray(chartOfAccounts.code, Array.from(STANDARD_CASH_ACCOUNT_CODES)));
    const coaNameByCode = new Map<string, string>();
    for (const coa of coaRows) {
      coaNameByCode.set(String(coa.code), String(coa.name));
    }

    // Step 4: Format transactions and calculate totals
    type CashFlowRow = {
      id: string;
      date: Date;
      type: string;
      description: string;
      kasIn: number;
      kasOut: number;
      debit: number;
      kredit: number;
      account: string;
      accountCode: string;
      paymentMethod: string;
      hasEvidence: boolean;
      refId: string;
      zakatTypeName: string | null;
    };

    const resolveAccountFromRow = (row: any) => {
      const paymentMethod = row.payment_method ? String(row.payment_method) : "";
      const transactionBankId = normalizeBankId(paymentMethod) || normalizeBankId(row.bank_account_id);
      let sourceBank = transactionBankId ? (bankById.get(transactionBankId) || null) : null;

      if (!sourceBank && row.source_bank_id) {
        const disbursementBankId = normalizeBankId(String(row.source_bank_id));
        sourceBank = disbursementBankId ? (bankById.get(disbursementBankId) || null) : null;
      }

      if (!sourceBank && row.source_bank_name && row.source_bank_account) {
        sourceBank = bankAccounts.find((b: any) =>
          b.bankName === row.source_bank_name && b.accountNumber === row.source_bank_account
        ) || null;
      }

      const fallbackIsGateway =
        paymentMethod.length > 0 &&
        !paymentMethod.startsWith("bank_") &&
        !paymentMethod.startsWith("manual_");
      const paymentMethodLower = paymentMethod.toLowerCase();
      const fallbackIsCash = paymentMethodLower.includes("cash");

      if (sourceBank?.coaCode && STANDARD_CASH_ACCOUNT_CODES.has(String(sourceBank.coaCode))) {
        const code = String(sourceBank.coaCode);
        return {
          accountCode: code,
          accountName: coaNameByCode.get(code) || `Akun ${code}`,
          paymentMethodLabel: `${sourceBank.bankName} - ${sourceBank.accountNumber}`,
        };
      }

      if (fallbackIsCash) {
        return {
          accountCode: "6210",
          accountName: coaNameByCode.get("6210") || "Cash",
          paymentMethodLabel: "Cash",
        };
      }

      if (fallbackIsGateway) {
        return {
          accountCode: "6206",
          accountName: coaNameByCode.get("6206") || "Payment Gateway",
          paymentMethodLabel: "Payment Gateway",
        };
      }

      return null;
    };

    const formattedTransactionsRaw: CashFlowRow[] = [];
    for (const row of result.rows as any[]) {
      const account = resolveAccountFromRow(row);
      if (!account) continue;

      const kasIn = Number(row.kas_masuk || 0);
      const kasOut = Number(row.kas_keluar || 0);

      let description = '';
      let paymentMethod = account.paymentMethodLabel || "";

      if (row.transaction_type === 'campaign') {
        description = `Donasi ${row.campaign_title || 'Campaign'} dari ${row.donor_name || row.donor_email || 'Anonim'}`;
      } else if (row.transaction_type === 'zakat') {
        description = `Pembayaran ${row.campaign_title || 'Zakat'} dari ${row.donor_name || row.donor_email || 'Anonim'}`;
      } else if (row.transaction_type === 'qurban') {
        description = `Pembayaran Qurban ${row.campaign_title || ''} dari ${row.donor_name || row.donor_email || 'Anonim'}`;
      } else if (row.transaction_type === 'qurban_savings_deposit') {
        description = `Setoran Tabungan Qurban ${row.campaign_title || ''} oleh ${row.donor_name || 'Anonim'}`;
      } else if (row.transaction_type === 'qurban_savings_withdrawal') {
        description = `Penarikan Tabungan Qurban ${row.campaign_title || ''} (${row.donor_name || '-'})`;
      } else if (row.transaction_type === 'disbursement') {
        description = `${row.purpose || 'Penyaluran'} ke ${row.recipient_name || '-'}`;
      } else if (row.transaction_type === 'zakat_distribution') {
        description = `Penyaluran ${row.campaign_title || 'Zakat'} - ${row.purpose || 'Asnaf'} ke ${row.recipient_name || '-'}`;
      } else if (row.transaction_type === 'qurban_disbursement') {
        description = `${row.purpose || 'Pembelian Qurban'} ke ${row.recipient_name || '-'}`;
      } else if (row.transaction_type === 'campaign_disbursement') {
        description = `${row.purpose || 'Penyaluran Campaign'} ${row.campaign_title || ''} ke ${row.recipient_name || '-'}`;
      } else if (row.transaction_type === 'unique_code') {
        description = `Kode Unik - ${row.campaign_title || 'Transaksi'} (${row.donor_name || 'Anonim'})`;
      } else {
        description = 'Transaksi';
        paymentMethod = paymentMethod || '-';
      }

      formattedTransactionsRaw.push({
        id: row.transaction_id,
        date: row.transaction_date,
        type: row.transaction_type,
        description,
        kasIn,
        kasOut,
        debit: kasOut,
        kredit: kasIn,
        account: account.accountName,
        accountCode: account.accountCode,
        paymentMethod,
        hasEvidence: Boolean(row.has_evidence),
        refId: row.transaction_id,
        zakatTypeName: row.campaign_title || null,
      });
    }

    const filteredByRefType = formattedTransactionsRaw.filter((row) => {
      if (!refType) return true;
      if (refType === "donation") {
        return row.kasIn > 0;
      }
      if (refType === "zakat_donation") {
        return row.type === "zakat";
      }
      if (refType === "disbursement") {
        return row.kasOut > 0;
      }
      if (refType === "zakat_distribution") {
        return row.type === "zakat_distribution";
      }
      return true;
    });

    const filteredByAccount = accountCode
      ? filteredByRefType.filter((row) => row.accountCode === accountCode)
      : filteredByRefType;

    const normalizedSearch = (search || "").trim().toLowerCase();
    const formattedTransactions = normalizedSearch.length
      ? filteredByAccount.filter((row) => {
          const searchable = [
            row.description,
            row.account,
            row.paymentMethod,
            row.type,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(normalizedSearch);
        })
      : filteredByAccount;

    let totalIn = 0;
    let totalOut = 0;
    for (const row of formattedTransactions) {
      totalIn += Number(row.kasIn || 0);
      totalOut += Number(row.kasOut || 0);
    }

    const closingBalance = openingBalance + totalIn - totalOut;
    const total = formattedTransactions.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const paginatedTransactions = formattedTransactions.slice(offset, offset + limit);

    const data = {
      summary: {
        openingBalance,
        totalIn,
        totalOut,
        closingBalance,
        transactionCount: total,
      },
      transactions: paginatedTransactions,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    };

    return success(c, data);
  } catch (err) {
    console.error("Cash flow report error:", err);
    return error(c, "Failed to generate cash flow report", 500);
  }
});

// Phase 3: Category-based Reports

/**
 * GET /admin/reports/cash-flow-by-category
 *
 * Cash flow with category breakdown (gabung sistem lama + baru)
 */
reportsAdmin.get("/cash-flow-by-category", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(transactions.paidAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(transactions.paidAt, new Date(endDate)));
  }

  const txnWhereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Income: dari transactions (dengan category)
  const income = await db
    .select({
      date: transactions.paidAt,
      amount: transactions.totalAmount,
      category: transactions.category,
      description: transactions.productName,
      type: sql<string>`'income'`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.paymentStatus, "paid"),
        txnWhereClause
      )
    );

  // Expense: dari disbursements baru (dengan category)
  const disbConditions = [];
  if (startDate) {
    disbConditions.push(gte(disbursements.paidAt, new Date(startDate)));
  }
  if (endDate) {
    disbConditions.push(lte(disbursements.paidAt, new Date(endDate)));
  }

  const disbWhereClause = disbConditions.length > 0 ? and(...disbConditions) : undefined;

  const expenseNew = await db
    .select({
      date: disbursements.paidAt,
      amount: disbursements.amount,
      category: disbursements.category,
      description: disbursements.purpose,
      type: sql<string>`'expense'`,
    })
    .from(disbursements)
    .where(
      and(
        eq(disbursements.status, "paid"),
        disbWhereClause
      )
    );

  const invalidIncomeCategories = findInvalidCategories(income, INCOME_CATEGORIES);
  const invalidExpenseCategories = findInvalidCategories(expenseNew, EXPENSE_CATEGORIES);
  if (invalidIncomeCategories.length > 0 || invalidExpenseCategories.length > 0) {
    return error(c, "Invalid category mapping detected for cash-flow-by-category", 422, {
      endpoint: "/admin/reports/cash-flow-by-category",
      invalidIncomeCategories,
      invalidExpenseCategories,
    });
  }

  // Unique Code Income
  const uniqueCodeIncome = await db
    .select({
      date: transactions.paidAt,
      amount: transactions.uniqueCode,
      category: sql<string>`'unique_code_income'`,
      description: transactions.productName,
      type: sql<string>`'income'`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.paymentStatus, "paid"),
        sql`${transactions.uniqueCode} > 0`,
        txnWhereClause
      )
    );

  // Gabungkan semua
  const allTransactions = [
    ...income.map(t => ({ ...t, date: t.date || new Date(), amount: Number(t.amount) })),
    ...uniqueCodeIncome.map(t => ({ ...t, date: t.date || new Date(), amount: Number(t.amount) })),
    ...expenseNew.map(t => ({ ...t, date: t.date || new Date(), amount: Number(t.amount) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Group by category
  const summary: Record<string, { income: number; expense: number }> = {};

  allTransactions.forEach((txn) => {
    if (!summary[txn.category]) {
      summary[txn.category] = { income: 0, expense: 0 };
    }
    if (txn.type === 'income') {
      summary[txn.category].income += txn.amount;
    } else {
      summary[txn.category].expense += txn.amount;
    }
  });

  const totalIncome = allTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return success(c, {
    summary: {
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
      byCategory: summary,
    },
    transactions: allTransactions,
  });
});

/**
 * GET /admin/reports/zakat
 *
 * Zakat report by category (8 asnaf)
 */
reportsAdmin.get("/zakat", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  // Zakat Income (by category)
  const incomeConditions = [
    eq(transactions.paymentStatus, "paid"),
    like(transactions.category, "zakat_%"),
  ];

  if (startDate) {
    incomeConditions.push(gte(transactions.paidAt, new Date(startDate)));
  }
  if (endDate) {
    incomeConditions.push(lte(transactions.paidAt, new Date(endDate)));
  }

  const zakatIncome = await db
    .select({
      category: transactions.category,
      total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...incomeConditions))
    .groupBy(transactions.category);

  // Zakat Expense (by asnaf)
  const expenseConditions = [
    eq(disbursements.status, "paid"),
    like(disbursements.category, "zakat_to_%"),
  ];

  if (startDate) {
    expenseConditions.push(gte(disbursements.paidAt, new Date(startDate)));
  }
  if (endDate) {
    expenseConditions.push(lte(disbursements.paidAt, new Date(endDate)));
  }

  const zakatExpense = await db
    .select({
      category: disbursements.category,
      total: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(disbursements)
    .where(and(...expenseConditions))
    .groupBy(disbursements.category);

  const invalidIncomeCategories = findInvalidCategories(zakatIncome, ZAKAT_INCOME_CATEGORIES);
  const invalidExpenseCategories = findInvalidCategories(zakatExpense, ZAKAT_EXPENSE_CATEGORIES);
  if (invalidIncomeCategories.length > 0 || invalidExpenseCategories.length > 0) {
    return error(c, "Invalid category mapping detected for zakat report", 422, {
      endpoint: "/admin/reports/zakat",
      invalidIncomeCategories,
      invalidExpenseCategories,
    });
  }

  const totalIncome = zakatIncome.reduce((sum, item) => sum + Number(item.total), 0);
  const totalExpense = zakatExpense.reduce((sum, item) => sum + Number(item.total), 0);
  const balance = totalIncome - totalExpense;

  const periodTypeConditions = [
    eq(transactions.paymentStatus, "paid"),
    eq(transactions.productType, "zakat"),
  ];

  if (startDate) {
    periodTypeConditions.push(gte(transactions.paidAt, new Date(startDate)));
  }
  if (endDate) {
    periodTypeConditions.push(lte(transactions.paidAt, new Date(endDate)));
  }

  const zakatPeriodByType = await db
    .select({
      periodId: zakatPeriods.id,
      periodName: zakatPeriods.name,
      periodYear: zakatPeriods.year,
      periodHijriYear: zakatPeriods.hijriYear,
      zakatTypeId: zakatTypes.id,
      zakatTypeName: zakatTypes.name,
      total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .innerJoin(zakatPeriods, eq(transactions.productId, zakatPeriods.id))
    .innerJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .where(and(...periodTypeConditions))
    .groupBy(
      zakatPeriods.id,
      zakatPeriods.name,
      zakatPeriods.year,
      zakatPeriods.hijriYear,
      zakatTypes.id,
      zakatTypes.name
    )
    .orderBy(desc(zakatPeriods.year), zakatPeriods.name, zakatTypes.name);

  return success(c, {
    summary: {
      totalIncome,
      totalExpense,
      balance,
    },
    income: zakatIncome.map(item => ({
      category: item.category,
      total: Number(item.total),
      count: Number(item.count),
    })),
    expense: zakatExpense.map(item => ({
      category: item.category,
      total: Number(item.total),
      count: Number(item.count),
    })),
    periodByType: zakatPeriodByType.map((item) => ({
      periodId: item.periodId,
      periodName: item.periodName,
      periodYear: item.periodYear,
      periodHijriYear: item.periodHijriYear,
      zakatTypeId: item.zakatTypeId,
      zakatTypeName: item.zakatTypeName,
      total: Number(item.total),
      count: Number(item.count),
    })),
  });
});

/**
 * GET /admin/reports/qurban
 *
 * Qurban report by category
 */
reportsAdmin.get("/qurban", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  // Qurban Income
  const incomeConditions = [
    eq(transactions.paymentStatus, "paid"),
    like(transactions.category, "qurban_%"),
  ];

  if (startDate) {
    incomeConditions.push(gte(transactions.paidAt, new Date(startDate)));
  }
  if (endDate) {
    incomeConditions.push(lte(transactions.paidAt, new Date(endDate)));
  }

  const qurbanIncome = await db
    .select({
      category: transactions.category,
      total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...incomeConditions))
    .groupBy(transactions.category);

  // Qurban Expense
  const expenseConditions = [
    eq(disbursements.status, "paid"),
    like(disbursements.category, "qurban_%"),
  ];

  if (startDate) {
    expenseConditions.push(gte(disbursements.paidAt, new Date(startDate)));
  }
  if (endDate) {
    expenseConditions.push(lte(disbursements.paidAt, new Date(endDate)));
  }

  const qurbanExpense = await db
    .select({
      category: disbursements.category,
      total: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(disbursements)
    .where(and(...expenseConditions))
    .groupBy(disbursements.category);

  const invalidIncomeCategories = findInvalidCategories(qurbanIncome, QURBAN_INCOME_CATEGORIES);
  const invalidExpenseCategories = findInvalidCategories(qurbanExpense, QURBAN_EXPENSE_CATEGORIES);
  if (invalidIncomeCategories.length > 0 || invalidExpenseCategories.length > 0) {
    return error(c, "Invalid category mapping detected for qurban report", 422, {
      endpoint: "/admin/reports/qurban",
      invalidIncomeCategories,
      invalidExpenseCategories,
    });
  }

  const totalIncome = qurbanIncome.reduce((sum, item) => sum + Number(item.total), 0);
  const totalExpense = qurbanExpense.reduce((sum, item) => sum + Number(item.total), 0);
  const balance = totalIncome - totalExpense;

  const qurbanPeriodAnimalConditions = [
    eq(transactions.paymentStatus, "paid"),
    eq(transactions.productType, "qurban"),
    eq(transactions.category, "qurban_payment"),
    sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`,
  ];

  if (startDate) {
    qurbanPeriodAnimalConditions.push(gte(transactions.paidAt, new Date(startDate)));
  }
  if (endDate) {
    qurbanPeriodAnimalConditions.push(lte(transactions.paidAt, new Date(endDate)));
  }

  const qurbanByPeriodAnimal = await db
    .select({
      periodId: qurbanPeriods.id,
      periodName: qurbanPeriods.name,
      gregorianYear: qurbanPeriods.gregorianYear,
      hijriYear: qurbanPeriods.hijriYear,
      animalType: qurbanPackages.animalType,
      animalCount: sql<number>`coalesce(sum(${transactions.quantity}), 0)`,
      transactionCount: sql<number>`count(*)`,
      totalCollected: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .innerJoin(qurbanPackagePeriods, eq(transactions.productId, qurbanPackagePeriods.id))
    .innerJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(and(...qurbanPeriodAnimalConditions))
    .groupBy(
      qurbanPeriods.id,
      qurbanPeriods.name,
      qurbanPeriods.gregorianYear,
      qurbanPeriods.hijriYear,
      qurbanPackages.animalType
    )
    .orderBy(desc(qurbanPeriods.gregorianYear), qurbanPeriods.name, qurbanPackages.animalType);

  return success(c, {
    summary: {
      totalIncome,
      totalExpense,
      balance,
    },
    income: qurbanIncome.map(item => ({
      category: item.category,
      total: Number(item.total),
      count: Number(item.count),
    })),
    expense: qurbanExpense.map(item => ({
      category: item.category,
      total: Number(item.total),
      count: Number(item.count),
    })),
    periodByAnimal: qurbanByPeriodAnimal.map((item) => ({
      periodId: item.periodId,
      periodName: item.periodName,
      gregorianYear: item.gregorianYear,
      hijriYear: item.hijriYear,
      animalType: item.animalType,
      animalCount: Number(item.animalCount),
      transactionCount: Number(item.transactionCount),
      totalCollected: Number(item.totalCollected),
    })),
  });
});

/**
 * GET /admin/reports/qurban-execution
 *
 * Qurban slaughter report (per individu / per ekor)
 */
reportsAdmin.get("/qurban-execution", requireRole("super_admin", "admin_finance"), async (c) => {
  try {
    const db = c.get("db");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const executionConditions = [];
    if (startDate) {
      executionConditions.push(gte(qurbanExecutions.executionDate, new Date(startDate)));
    }
    if (endDate) {
      executionConditions.push(lte(qurbanExecutions.executionDate, new Date(endDate)));
    }

    const baseQuery = db
      .select({
        id: qurbanExecutions.id,
        executionNumber: qurbanExecutions.executionNumber,
        executionDate: qurbanExecutions.executionDate,
        location: qurbanExecutions.location,
        butcherName: qurbanExecutions.butcherName,
        animalType: qurbanExecutions.animalType,
        animalWeight: qurbanExecutions.animalWeight,
        distributionMethod: qurbanExecutions.distributionMethod,
        recipientCount: qurbanExecutions.recipientCount,
        executedBy: qurbanExecutions.executedBy,
        sharedGroupId: qurbanExecutions.sharedGroupId,
        executorName: users.name,
        groupNumber: qurbanSharedGroups.groupNumber,
        groupSlotsFilled: qurbanSharedGroups.slotsFilled,
        groupPackagePeriodId: qurbanSharedGroups.packagePeriodId,
      })
      .from(qurbanExecutions)
      .leftJoin(users, eq(qurbanExecutions.executedBy, users.id))
      .leftJoin(qurbanSharedGroups, eq(qurbanExecutions.sharedGroupId, qurbanSharedGroups.id));

    const executions = executionConditions.length > 0
      ? await baseQuery.where(and(...executionConditions)).orderBy(desc(qurbanExecutions.executionDate))
      : await baseQuery.orderBy(desc(qurbanExecutions.executionDate));

    const packagePeriodIds = Array.from(
      new Set(
        executions
          .map((item) => item.groupPackagePeriodId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const packagePeriodRows = packagePeriodIds.length
      ? await db
          .select({
            packagePeriodId: qurbanPackagePeriods.id,
            packageName: qurbanPackages.name,
            periodName: qurbanPeriods.name,
            periodHijriYear: qurbanPeriods.hijriYear,
            periodGregorianYear: qurbanPeriods.gregorianYear,
          })
          .from(qurbanPackagePeriods)
          .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
          .innerJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
          .where(inArray(qurbanPackagePeriods.id, packagePeriodIds))
      : [];

    const packagePeriodMap = new Map(
      packagePeriodRows.map((row) => [row.packagePeriodId, row])
    );

    const normalizeAnimalType = (value: string | null | undefined) => {
      const raw = (value || "").toLowerCase();
      if (raw === "cow" || raw === "sapi") return "Sapi";
      if (raw === "goat" || raw === "kambing") return "Kambing";
      return value || "-";
    };

    const mappedExecutions = executions.map((item) => {
      const packagePeriodId = item.groupPackagePeriodId;
      const packageInfo = packagePeriodId ? packagePeriodMap.get(packagePeriodId) : undefined;
      const isShared = Boolean(item.sharedGroupId);

      return {
        id: item.id,
        executionNumber: item.executionNumber,
        executionDate: item.executionDate,
        location: item.location,
        butcherName: item.butcherName,
        animalType: normalizeAnimalType(item.animalType),
        animalWeight: item.animalWeight ? Number(item.animalWeight) : null,
        distributionMethod: item.distributionMethod,
        recipientCount: Number(item.recipientCount || 0),
        donorName: null,
        onBehalfOf: null,
        executorName: item.executorName || null,
        periodName: packageInfo?.periodName || null,
        periodHijriYear: packageInfo?.periodHijriYear || null,
        periodGregorianYear: packageInfo?.periodGregorianYear || null,
        packageName: packageInfo?.packageName || null,
        isShared,
        groupNumber: item.groupNumber || null,
        participantCount: Number(item.groupSlotsFilled || 0),
      };
    });

    const summary = mappedExecutions.reduce((acc, item) => {
      acc.totalExecutions += 1;
      acc.totalRecipients += Number(item.recipientCount || 0);
      if (item.animalType === "Sapi") acc.totalCow += 1;
      if (item.animalType === "Kambing") acc.totalGoat += 1;
      if (item.isShared) acc.sharedExecutions += 1;
      else acc.individualExecutions += 1;
      return acc;
    }, {
      totalExecutions: 0,
      totalRecipients: 0,
      totalCow: 0,
      totalGoat: 0,
      sharedExecutions: 0,
      individualExecutions: 0,
    });

    return success(c, {
      summary,
      executions: mappedExecutions,
    });
  } catch (err: any) {
    console.error("[reports/qurban-execution] failed", err);
    return error(c, err?.message || "Failed to load qurban execution report", 500);
  }
});

/**
 * GET /admin/reports/campaign
 *
 * Campaign report by category
 */
reportsAdmin.get("/campaign", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  // Campaign Income
  const incomeConditions = [
    eq(transactions.paymentStatus, "paid"),
    eq(transactions.category, "campaign_donation"),
  ];

  if (startDate) {
    incomeConditions.push(gte(transactions.paidAt, new Date(startDate)));
  }
  if (endDate) {
    incomeConditions.push(lte(transactions.paidAt, new Date(endDate)));
  }

  const campaignIncome = await db
    .select({
      productId: transactions.productId,
      productName: transactions.productName,
      total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...incomeConditions))
    .groupBy(transactions.productId, transactions.productName);

  // Campaign Expense
  const expenseConditions = [
    eq(disbursements.status, "paid"),
    like(disbursements.category, "campaign_%"),
  ];

  if (startDate) {
    expenseConditions.push(gte(disbursements.paidAt, new Date(startDate)));
  }
  if (endDate) {
    expenseConditions.push(lte(disbursements.paidAt, new Date(endDate)));
  }

  const campaignExpense = await db
    .select({
      productId: disbursements.referenceId,
      category: disbursements.category,
      total: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(disbursements)
    .where(and(...expenseConditions))
    .groupBy(disbursements.referenceId, disbursements.category);

  const invalidIncomeCategories = findInvalidCategories(
    campaignIncome.map((i) => ({ category: "campaign_donation" })),
    CAMPAIGN_INCOME_CATEGORIES
  );
  const invalidExpenseCategories = findInvalidCategories(campaignExpense, CAMPAIGN_EXPENSE_CATEGORIES);
  if (invalidIncomeCategories.length > 0 || invalidExpenseCategories.length > 0) {
    return error(c, "Invalid category mapping detected for campaign report", 422, {
      endpoint: "/admin/reports/campaign",
      invalidIncomeCategories,
      invalidExpenseCategories,
    });
  }

  const totalIncome = campaignIncome.reduce((sum, item) => sum + Number(item.total), 0);
  const totalExpense = campaignExpense.reduce((sum, item) => sum + Number(item.total), 0);
  const balance = totalIncome - totalExpense;

  return success(c, {
    summary: {
      totalIncome,
      totalExpense,
      balance,
    },
    income: campaignIncome.map(item => ({
      productId: item.productId,
      productName: item.productName,
      total: Number(item.total),
      count: Number(item.count),
    })),
    expense: campaignExpense.map(item => ({
      productId: item.productId,
      category: item.category,
      total: Number(item.total),
      count: Number(item.count),
    })),
  });
});

/**
 * GET /admin/reports/unique-codes
 *
 * Laporan Pendapatan Kode Unik
 */
reportsAdmin.get("/unique-codes", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions: any[] = [
    eq(transactions.paymentStatus, "paid"),
    sql`${transactions.uniqueCode} > 0`
  ];

  if (startDate) conditions.push(gte(transactions.paidAt, new Date(startDate)));
  if (endDate) conditions.push(lte(transactions.paidAt, new Date(endDate)));

  const [summary] = await db
    .select({
      totalAmount: sql<number>`coalesce(sum(${transactions.uniqueCode}), 0)`,
      transactionCount: sql<number>`count(*)`,
      avgUniqueCode: sql<number>`coalesce(avg(${transactions.uniqueCode}), 0)`,
    })
    .from(transactions)
    .where(and(...conditions));

  const byMonth = await db
    .select({
      month: sql<string>`to_char(${transactions.paidAt}, 'YYYY-MM')`,
      totalAmount: sql<number>`coalesce(sum(${transactions.uniqueCode}), 0)`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(sql`to_char(${transactions.paidAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.paidAt}, 'YYYY-MM')`);

  const byProductType = await db
    .select({
      productType: transactions.productType,
      totalAmount: sql<number>`coalesce(sum(${transactions.uniqueCode}), 0)`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.productType);

  const detail = await db
    .select({
      id: transactions.id,
      transactionNumber: transactions.transactionNumber,
      donorName: transactions.donorName,
      productName: transactions.productName,
      productType: transactions.productType,
      totalAmount: transactions.totalAmount,
      uniqueCode: transactions.uniqueCode,
      paidAt: transactions.paidAt,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.paidAt))
    .limit(100);

  return success(c, {
    summary: {
      totalAmount: Number(summary.totalAmount),
      transactionCount: Number(summary.transactionCount),
      avgUniqueCode: Math.round(Number(summary.avgUniqueCode)),
    },
    byMonth,
    byProductType,
    detail,
  });
});

/**
 * GET /admin/reports/revenue-sharing
 * Source of truth: revenue_shares snapshot generated from paid universal transactions
 */
reportsAdmin.get("/revenue-sharing", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"), 50, 100);
  const parseDateStart = (input?: string) => {
    if (!input) return undefined;
    const date = new Date(`${input}T00:00:00.000`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const parseDateEnd = (input?: string) => {
    if (!input) return undefined;
    const date = new Date(`${input}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const service = new RevenueShareService(db);
  const [listResult, summary] = await Promise.all([
    service.list({
      page,
      limit,
      dateFrom: parseDateStart(startDate),
      dateTo: parseDateEnd(endDate),
    }),
    service.summary({
      dateFrom: parseDateStart(startDate),
      dateTo: parseDateEnd(endDate),
    }),
  ]);

  return success(c, {
    summary,
    rows: listResult.data,
    pagination: listResult.pagination,
  });
});

// ============================================================
// Phase 3: Per-Entity Reports
// ============================================================

/**
 * GET /admin/reports/program-summary
 * All campaigns with income/expense/saldo
 */
reportsAdmin.get("/program-summary", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const { page, limit, offset } = parsePagination(c.req.query("page"), c.req.query("limit"), 20, 100);

  try {
    const dateFilter = (dateCol: any) => {
      const conds: any[] = [];
      if (startDate) conds.push(gte(dateCol, new Date(startDate)));
      if (endDate) conds.push(lte(dateCol, new Date(endDate)));
      return conds;
    };

    // All active campaigns
    const allCampaigns = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        category: campaigns.category,
        goal: campaigns.goal,
        donorCount: campaigns.donorCount,
        status: campaigns.status,
        mitraId: campaigns.mitraId,
      })
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));

    // Income per campaign in period
    const incomeConditions = [
      eq(transactions.paymentStatus, "paid"),
      eq(transactions.productType, "campaign"),
      ...dateFilter(transactions.paidAt),
    ];

    const incomeByProduct = await db
      .select({
        productId: transactions.productId,
        total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(and(...incomeConditions))
      .groupBy(transactions.productId);

    // Expense per campaign in period
    const expenseConditions = [
      eq(disbursements.status, "paid"),
      sql`${disbursements.referenceId} IS NOT NULL`,
      ...dateFilter(disbursements.paidAt),
    ];

    const expenseByRef = await db
      .select({
        referenceId: disbursements.referenceId,
        total: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(disbursements)
      .where(and(...expenseConditions))
      .groupBy(disbursements.referenceId);

    const incomeMap = Object.fromEntries(incomeByProduct.map(i => [i.productId, { total: Number(i.total), count: Number(i.count) }]));
    const expenseMap = Object.fromEntries(expenseByRef.map(e => [e.referenceId, { total: Number(e.total), count: Number(e.count) }]));

    // All-time collected from universal transactions (strict source)
    const collectedAllTime = await db
      .select({
        productId: transactions.productId,
        total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.paymentStatus, "paid"), eq(transactions.productType, "campaign")))
      .groupBy(transactions.productId);

    const collectedMap = Object.fromEntries(collectedAllTime.map(i => [i.productId, Number(i.total)]));

    const result = allCampaigns.map(c => {
      const income = incomeMap[c.id] || { total: 0, count: 0 };
      const expense = expenseMap[c.id] || { total: 0, count: 0 };
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        goal: Number(c.goal),
        collected: collectedMap[c.id] || 0,
        donorCount: Number(c.donorCount),
        status: c.status,
        mitraId: c.mitraId,
        periodIncome: income.total,
        periodIncomeCount: income.count,
        periodExpense: expense.total,
        periodExpenseCount: expense.count,
        periodBalance: income.total - expense.total,
      };
    });

    const totalIncome = result.reduce((s, r) => s + r.periodIncome, 0);
    const totalExpense = result.reduce((s, r) => s + r.periodExpense, 0);
    const total = result.length;
    const pagedCampaigns = result.slice(offset, offset + limit);

    return success(c, {
      summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense, campaignCount: result.length },
      campaigns: pagedCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("Program summary error:", err);
    return error(c, "Failed to generate program summary", 500);
  }
});

/**
 * GET /admin/reports/program-detail?campaignId=xxx&startDate=&endDate=
 * Detail income/expense/revenue-share for one campaign
 */
reportsAdmin.get("/program-detail", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const campaignId = c.req.query("campaignId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!campaignId) return error(c, "campaignId is required", 400);

  try {
    // Campaign info
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    if (!campaign) return error(c, "Campaign not found", 404);

    // Income transactions
    const incomeConds = [
      eq(transactions.paymentStatus, "paid"),
      eq(transactions.productId, campaignId),
      eq(transactions.productType, "campaign"),
    ];
    if (startDate) incomeConds.push(gte(transactions.paidAt, new Date(startDate)));
    if (endDate) incomeConds.push(lte(transactions.paidAt, new Date(endDate)));

    const incomeList = await db
      .select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        donorName: transactions.donorName,
        totalAmount: transactions.totalAmount,
        paymentMethodId: transactions.paymentMethodId,
        paidAt: transactions.paidAt,
      })
      .from(transactions)
      .where(and(...incomeConds))
      .orderBy(desc(transactions.paidAt))
      .limit(200);

    // Expense disbursements
    const expenseConds = [
      eq(disbursements.status, "paid"),
      eq(disbursements.referenceId, campaignId),
    ];
    if (startDate) expenseConds.push(gte(disbursements.paidAt, new Date(startDate)));
    if (endDate) expenseConds.push(lte(disbursements.paidAt, new Date(endDate)));

    const expenseList = await db
      .select({
        id: disbursements.id,
        disbursementNumber: disbursements.disbursementNumber,
        amount: disbursements.amount,
        category: disbursements.category,
        recipientName: disbursements.recipientName,
        purpose: disbursements.purpose,
        paidAt: disbursements.paidAt,
      })
      .from(disbursements)
      .where(and(...expenseConds))
      .orderBy(desc(disbursements.paidAt))
      .limit(200);

    const totalIncome = incomeList.reduce((s, t) => s + Number(t.totalAmount), 0);
    const totalExpense = expenseList.reduce((s, d) => s + Number(d.amount), 0);

    // All-time collected for strict universal source
    const [allTimeCollected] = await db
      .select({ total: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.paymentStatus, "paid"),
        eq(transactions.productType, "campaign"),
        eq(transactions.productId, campaignId),
      ));

    return success(c, {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        goal: Number(campaign.goal),
        collected: Number(allTimeCollected?.total || 0),
        donorCount: Number(campaign.donorCount),
        status: campaign.status,
      },
      summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
      income: incomeList.map(t => ({ ...t, totalAmount: Number(t.totalAmount) })),
      expense: expenseList.map(d => ({ ...d, amount: Number(d.amount) })),
    });
  } catch (err) {
    console.error("Program detail error:", err);
    return error(c, "Failed to generate program detail", 500);
  }
});

/**
 * GET /admin/reports/mitra-summary
 * All mitras with revenue share totals
 */
reportsAdmin.get("/mitra-summary", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const { page, limit, offset } = parsePagination(c.req.query("page"), c.req.query("limit"), 20, 100);

  try {
    const allMitras = await db
      .select({
        id: mitra.id,
        name: mitra.name,
        status: mitra.status,
      })
      .from(mitra)
      .orderBy(desc(mitra.createdAt));

    // Get campaign counts per mitra
    const campaignCounts = await db
      .select({
        mitraId: campaigns.mitraId,
        count: sql<number>`count(*)`,
      })
      .from(campaigns)
      .where(sql`${campaigns.mitraId} IS NOT NULL`)
      .groupBy(campaigns.mitraId);

    const countMap = Object.fromEntries(campaignCounts.map(c => [c.mitraId, Number(c.count)]));

    // Source of truth: revenue_shares (hasil bagi dari transaksi paid)
    const shareRows = await db
      .select({
        mitraId: revenueShares.mitraId,
        totalIncome: sql<number>`coalesce(sum(${revenueShares.donationAmount}), 0)`,
        totalShare: sql<number>`coalesce(sum(${revenueShares.mitraAmount}), 0)`,
      })
      .from(revenueShares)
      .where(and(
        sql`${revenueShares.mitraId} IS NOT NULL`,
        sql`${revenueShares.mitraAmount} > 0`
      ))
      .groupBy(revenueShares.mitraId);

    // Payout yang sudah/sedang diproses tetap dibaca dari universal disbursements
    const paidRows = await db
      .select({
        recipientId: disbursements.recipientId,
        totalPaid: sql<number>`coalesce(sum(case when ${disbursements.status} = 'paid' then ${disbursements.amount} else 0 end), 0)`,
      })
      .from(disbursements)
      .where(and(
        eq(disbursements.recipientType, "mitra"),
        eq(disbursements.category, "revenue_share_mitra"),
        inArray(disbursements.status, ["submitted", "approved", "paid"])
      ))
      .groupBy(disbursements.recipientId);

    const shareMap = Object.fromEntries(
      shareRows.map((r) => [
        r.mitraId,
        {
          totalIncome: Number(r.totalIncome),
          totalShare: Number(r.totalShare),
        },
      ])
    );
    const paidMap = Object.fromEntries(paidRows.map((r) => [r.recipientId, { totalPaid: Number(r.totalPaid) }]));

    const result = allMitras.map(m => ({
      id: m.id,
      name: m.name,
      status: m.status,
      campaignCount: countMap[m.id] || 0,
      totalIncome: shareMap[m.id]?.totalIncome || 0,
      totalRevenueShare: shareMap[m.id]?.totalShare || 0,
      totalPaid: paidMap[m.id]?.totalPaid || 0,
      remainingBalance: (shareMap[m.id]?.totalShare || 0) - (paidMap[m.id]?.totalPaid || 0),
    }));

    const totals = result.reduce((acc, m) => ({
      totalIncome: acc.totalIncome + m.totalIncome,
      totalRevenueShare: acc.totalRevenueShare + m.totalRevenueShare,
      totalPaid: acc.totalPaid + m.totalPaid,
      remainingBalance: acc.remainingBalance + m.remainingBalance,
    }), { totalIncome: 0, totalRevenueShare: 0, totalPaid: 0, remainingBalance: 0 });

    const total = result.length;
    const pagedMitras = result.slice(offset, offset + limit);

    return success(c, {
      summary: { ...totals, mitraCount: result.length },
      mitras: pagedMitras,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("Mitra summary error:", err);
    return error(c, "Failed to generate mitra summary", 500);
  }
});

/**
 * GET /admin/reports/mitra-detail?mitraId=xxx&startDate=&endDate=
 */
reportsAdmin.get("/mitra-detail", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const mitraId = c.req.query("mitraId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!mitraId) return error(c, "mitraId is required", 400);

  try {
    const [mitraData] = await db.select().from(mitra).where(eq(mitra.id, mitraId));
    if (!mitraData) return error(c, "Mitra not found", 404);

    // Source of truth: revenue_shares per transaksi paid
    const shareConds: any[] = [
      eq(revenueShares.mitraId, mitraId),
      sql`${revenueShares.mitraAmount} > 0`,
    ];
    if (startDate) shareConds.push(gte(revenueShares.calculatedAt, new Date(startDate)));
    if (endDate) shareConds.push(lte(revenueShares.calculatedAt, new Date(endDate)));

    const shares = await db
      .select({
        id: revenueShares.id,
        transactionId: revenueShares.transactionId,
        donationAmount: revenueShares.donationAmount,
        mitraAmount: revenueShares.mitraAmount,
        calculatedAt: revenueShares.calculatedAt,
        transactionNumber: sql<string>`coalesce(${transactions.transactionNumber}, '-')`,
        productName: sql<string>`coalesce(${transactions.productName}, '-')`,
        productType: sql<string>`coalesce(${transactions.productType}, '-')`,
      })
      .from(revenueShares)
      .leftJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .where(and(...shareConds))
      .orderBy(desc(revenueShares.calculatedAt))
      .limit(200);

    // Disbursements to mitra
    const disbConds: any[] = [
      eq(disbursements.status, "paid"),
      eq(disbursements.recipientType, "mitra"),
      eq(disbursements.recipientId, mitraId),
      eq(disbursements.category, "revenue_share_mitra"),
    ];
    if (startDate) disbConds.push(gte(disbursements.paidAt, new Date(startDate)));
    if (endDate) disbConds.push(lte(disbursements.paidAt, new Date(endDate)));

    const disbList = await db
      .select({
        id: disbursements.id,
        disbursementNumber: disbursements.disbursementNumber,
        amount: disbursements.amount,
        purpose: disbursements.purpose,
        paidAt: disbursements.paidAt,
      })
      .from(disbursements)
      .where(and(...disbConds))
      .orderBy(desc(disbursements.paidAt))
      .limit(100);

    const totalShare = shares.reduce((s, r) => s + Number(r.mitraAmount), 0);
    const totalPaid = disbList.reduce((s, d) => s + Number(d.amount), 0);

    return success(c, {
      mitra: { id: mitraData.id, name: mitraData.name, status: mitraData.status },
      summary: { totalShare, totalPaid, remaining: totalShare - totalPaid },
      revenueShares: shares.map(r => ({ ...r, donationAmount: Number(r.donationAmount), mitraAmount: Number(r.mitraAmount) })),
      disbursements: disbList.map(d => ({ ...d, amount: Number(d.amount) })),
    });
  } catch (err) {
    console.error("Mitra detail error:", err);
    return error(c, "Failed to generate mitra detail", 500);
  }
});

/**
 * GET /admin/reports/fundraiser-summary
 * All fundraisers with totals
 */
reportsAdmin.get("/fundraiser-summary", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const { page, limit, offset } = parsePagination(c.req.query("page"), c.req.query("limit"), 20, 100);

  try {
    const allFundraisers = await db
      .select({
        id: fundraisers.id,
        code: fundraisers.code,
        status: fundraisers.status,
        donaturId: fundraisers.donaturId,
        employeeId: fundraisers.employeeId,
      })
      .from(fundraisers)
      .orderBy(desc(fundraisers.createdAt));

    // Get names for fundraisers
    const donaturIds = allFundraisers.filter(f => f.donaturId).map(f => f.donaturId!);
    const employeeIds = allFundraisers.filter(f => f.employeeId).map(f => f.employeeId!);

    let donaturMap: Record<string, string> = {};
    let employeeMap: Record<string, string> = {};

    if (donaturIds.length > 0) {
      const donors = await db
        .select({ id: donatur.id, name: donatur.name })
        .from(donatur)
        .where(inArray(donatur.id, donaturIds));
      donaturMap = Object.fromEntries(donors.map(d => [d.id, d.name]));
    }

    if (employeeIds.length > 0) {
      const { employees } = await import("@bantuanku/db");
      const emps = await db
        .select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(inArray(employees.id, employeeIds));
      employeeMap = Object.fromEntries(emps.map(e => [e.id, e.name]));
    }

    const referralRows = await db
      .select({
        fundraiserId: transactions.referredByFundraiserId,
        totalReferrals: sql<number>`count(*)`,
        totalDonationAmount: sql<number>`coalesce(sum(${transactions.totalAmount}), 0)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.paymentStatus, "paid"),
        sql`${transactions.referredByFundraiserId} IS NOT NULL`
      ))
      .groupBy(transactions.referredByFundraiserId);

    const commissionRows = await db
      .select({
        recipientId: disbursements.recipientId,
        totalCommission: sql<number>`coalesce(sum(${disbursements.amount}), 0)`,
        totalPaid: sql<number>`coalesce(sum(case when ${disbursements.status} = 'paid' then ${disbursements.amount} else 0 end), 0)`,
      })
      .from(disbursements)
      .where(and(
        eq(disbursements.recipientType, "fundraiser"),
        eq(disbursements.category, "revenue_share_fundraiser"),
        inArray(disbursements.status, ["submitted", "approved", "paid"])
      ))
      .groupBy(disbursements.recipientId);

    const referralMap = Object.fromEntries(referralRows.map(r => [r.fundraiserId, { totalReferrals: Number(r.totalReferrals), totalDonationAmount: Number(r.totalDonationAmount) }]));
    const commissionMap = Object.fromEntries(commissionRows.map(r => [r.recipientId, { totalCommission: Number(r.totalCommission), totalPaid: Number(r.totalPaid) }]));

    const result = allFundraisers.map(f => ({
      id: f.id,
      code: f.code,
      name: f.donaturId ? (donaturMap[f.donaturId] || "-") : (f.employeeId ? (employeeMap[f.employeeId] || "-") : "-"),
      status: f.status,
      totalReferrals: referralMap[f.id]?.totalReferrals || 0,
      totalDonationAmount: referralMap[f.id]?.totalDonationAmount || 0,
      totalCommissionEarned: commissionMap[f.id]?.totalCommission || 0,
      totalPaid: commissionMap[f.id]?.totalPaid || 0,
      remainingBalance: (commissionMap[f.id]?.totalCommission || 0) - (commissionMap[f.id]?.totalPaid || 0),
    }));

    const totals = result.reduce((acc, f) => ({
      totalReferrals: acc.totalReferrals + f.totalReferrals,
      totalCommission: acc.totalCommission + f.totalCommissionEarned,
      totalPaid: acc.totalPaid + f.totalPaid,
      remainingBalance: acc.remainingBalance + f.remainingBalance,
    }), { totalReferrals: 0, totalCommission: 0, totalPaid: 0, remainingBalance: 0 });

    const total = result.length;
    const pagedFundraisers = result.slice(offset, offset + limit);

    return success(c, {
      summary: { ...totals, fundraiserCount: result.length },
      fundraisers: pagedFundraisers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("Fundraiser summary error:", err);
    return error(c, "Failed to generate fundraiser summary", 500);
  }
});

/**
 * GET /admin/reports/fundraiser-detail?fundraiserId=xxx&startDate=&endDate=
 */
reportsAdmin.get("/fundraiser-detail", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const fundraiserId = c.req.query("fundraiserId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!fundraiserId) return error(c, "fundraiserId is required", 400);

  try {
    const [fund] = await db.select().from(fundraisers).where(eq(fundraisers.id, fundraiserId));
    if (!fund) return error(c, "Fundraiser not found", 404);

    // Referrals from universal transactions
    const refConds: any[] = [
      eq(transactions.paymentStatus, "paid"),
      eq(transactions.referredByFundraiserId, fundraiserId),
    ];
    if (startDate) refConds.push(gte(transactions.paidAt, new Date(startDate)));
    if (endDate) refConds.push(lte(transactions.paidAt, new Date(endDate)));

    const refs = await db
      .select({
        id: transactions.id,
        transactionId: transactions.id,
        donationAmount: transactions.totalAmount,
        commissionPercentage: sql<number>`0`,
        commissionAmount: sql<number>`0`,
        status: transactions.paymentStatus,
        createdAt: transactions.paidAt,
        transactionNumber: transactions.transactionNumber,
        donorName: transactions.donorName,
        productName: transactions.productName,
      })
      .from(transactions)
      .where(and(...refConds))
      .orderBy(desc(transactions.paidAt))
      .limit(200);

    // Disbursements (payouts)
    const disbConds: any[] = [
      eq(disbursements.recipientType, "fundraiser"),
      eq(disbursements.recipientId, fundraiserId),
      eq(disbursements.category, "revenue_share_fundraiser"),
      inArray(disbursements.status, ["submitted", "approved", "paid"]),
    ];
    if (startDate) disbConds.push(gte(disbursements.createdAt, new Date(startDate)));
    if (endDate) disbConds.push(lte(disbursements.createdAt, new Date(endDate)));

    const disbList = await db
      .select({
        id: disbursements.id,
        disbursementNumber: disbursements.disbursementNumber,
        amount: disbursements.amount,
        status: disbursements.status,
        paidAt: disbursements.paidAt,
        createdAt: disbursements.createdAt,
      })
      .from(disbursements)
      .where(and(...disbConds))
      .orderBy(desc(disbursements.createdAt))
      .limit(100);

    // Get fundraiser name
    let fundraiserName = "-";
    if (fund.donaturId) {
      const [d] = await db.select({ name: donatur.name }).from(donatur).where(eq(donatur.id, fund.donaturId));
      if (d) fundraiserName = d.name;
    } else if (fund.employeeId) {
      const { employees } = await import("@bantuanku/db");
      const [e] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, fund.employeeId));
      if (e) fundraiserName = e.name;
    }

    const totalCommission = disbList.reduce((s, d: any) => s + Number(d.amount), 0);
    const totalPaid = disbList
      .filter((d: any) => d.status === "paid")
      .reduce((s, d: any) => s + Number(d.amount), 0);

    return success(c, {
      fundraiser: { id: fund.id, code: fund.code, name: fundraiserName, status: fund.status },
      summary: { totalReferrals: refs.length, totalCommission, totalPaid, remaining: totalCommission - totalPaid },
      referrals: refs.map(r => ({ ...r, donationAmount: Number(r.donationAmount), commissionAmount: Number(r.commissionAmount) })),
      disbursements: disbList.map((d: any) => ({ ...d, amount: Number(d.amount), paidAt: d.paidAt || d.createdAt })),
    });
  } catch (err) {
    console.error("Fundraiser detail error:", err);
    return error(c, "Failed to generate fundraiser detail", 500);
  }
});

/**
 * GET /admin/reports/rekening-summary
 * All bank accounts from settings with calculated balances
 */
reportsAdmin.get("/rekening-summary", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const { page, limit, offset } = parsePagination(c.req.query("page"), c.req.query("limit"), 20, 100);

  try {
    // Get bank accounts from settings
    const allSettings = await db.query.settings.findMany();
    const bankSetting = allSettings.find((s: any) => s.category === "payment" && s.key === "payment_bank_accounts");
    let bankAccounts: any[] = [];
    if (bankSetting?.value) {
      try { bankAccounts = JSON.parse(bankSetting.value); } catch (e) { /* ignore */ }
    }

    if (bankAccounts.length === 0) {
      return success(c, {
        accounts: [],
        summary: { totalIn: 0, totalOut: 0, totalBalance: 0 },
        pagination: { page, limit, total: 0, totalPages: 1 },
      });
    }

    // Kas masuk per rekening (from transactions)
    const inResult = await db.execute(sql`
      SELECT payment_method_id, coalesce(sum(total_amount), 0)::numeric as total_in, count(*) as tx_count
      FROM transactions
      WHERE payment_status = 'paid' AND payment_method_id LIKE 'bank_%'
      GROUP BY payment_method_id
    `);

    // Kas masuk from unique codes
    const ucResult = await db.execute(sql`
      SELECT payment_method_id, coalesce(sum(unique_code), 0)::numeric as total_uc
      FROM transactions
      WHERE payment_status = 'paid' AND unique_code > 0 AND payment_method_id LIKE 'bank_%'
      GROUP BY payment_method_id
    `);

    const inMap: Record<string, { totalIn: number; txCount: number }> = {};
    for (const row of inResult.rows as any[]) {
      inMap[row.payment_method_id] = { totalIn: Number(row.total_in), txCount: Number(row.tx_count) };
    }
    const ucMap: Record<string, number> = {};
    for (const row of ucResult.rows as any[]) {
      ucMap[row.payment_method_id] = Number(row.total_uc);
    }

    const accounts = bankAccounts.map((ba: any) => {
      const pmId = `bank_${ba.id}`;
      const income = inMap[pmId] || { totalIn: 0, txCount: 0 };
      const ucIncome = ucMap[pmId] || 0;
      const totalIn = income.totalIn + ucIncome;
      // Note: disbursements don't reliably link to bank account, so balance is income-only for now
      return {
        id: ba.id,
        bankName: ba.bankName,
        accountNumber: ba.accountNumber,
        accountName: ba.accountName,
        programs: ba.programs || [],
        totalIn,
        transactionCount: income.txCount,
        balance: totalIn,
      };
    });

    const totalIn = accounts.reduce((s, a) => s + a.totalIn, 0);

    const total = accounts.length;
    const pagedAccounts = accounts.slice(offset, offset + limit);

    return success(c, {
      accounts: pagedAccounts,
      summary: { totalIn, accountCount: accounts.length },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("Rekening summary error:", err);
    return error(c, "Failed to generate rekening summary", 500);
  }
});

/**
 * GET /admin/reports/rekening-detail?bankAccountId=xxx&startDate=&endDate=
 * Mutations for a specific bank account
 */
reportsAdmin.get("/rekening-detail", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const bankAccountId = c.req.query("bankAccountId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!bankAccountId || !startDate || !endDate) {
    return error(c, "bankAccountId, startDate, and endDate are required", 400);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return error(c, "Invalid date format. Use YYYY-MM-DD", 400);
  }

  try {
    const pmId = bankAccountId.startsWith("bank_") ? bankAccountId : `bank_${bankAccountId}`;
    const endDateTime = `${endDate} 23:59:59`;

    // Get bank account info from settings
    const allSettings = await db.query.settings.findMany();
    const bankSetting = allSettings.find((s: any) => s.category === "payment" && s.key === "payment_bank_accounts");
    let bankAccounts: any[] = [];
    if (bankSetting?.value) {
      try { bankAccounts = JSON.parse(bankSetting.value); } catch (e) { /* ignore */ }
    }
    const rawId = bankAccountId.replace(/^bank_/, "");
    const bankInfo = bankAccounts.find((b: any) => b.id === rawId);

    const result = await db.execute(sql.raw(`
      SELECT * FROM (
        SELECT
          t.id, COALESCE(t.paid_at, t.created_at) as date,
          t.total_amount::numeric as kas_masuk, 0::numeric as kas_keluar,
          t.product_type || ': ' || COALESCE(t.product_name, '') || ' - ' || COALESCE(t.donor_name, 'Anonim') as description,
          t.product_type as type
        FROM transactions t
        WHERE t.payment_status = 'paid'
          AND t.payment_method_id = '${pmId}'
          AND COALESCE(t.paid_at, t.created_at) >= '${startDate}'::timestamp
          AND COALESCE(t.paid_at, t.created_at) <= '${endDateTime}'::timestamp

        UNION ALL

        SELECT
          t2.id, COALESCE(t2.paid_at, t2.created_at) as date,
          t2.unique_code::numeric as kas_masuk, 0::numeric as kas_keluar,
          'Kode Unik - ' || COALESCE(t2.product_name, '') as description,
          'unique_code' as type
        FROM transactions t2
        WHERE t2.payment_status = 'paid'
          AND t2.unique_code > 0
          AND t2.payment_method_id = '${pmId}'
          AND COALESCE(t2.paid_at, t2.created_at) >= '${startDate}'::timestamp
          AND COALESCE(t2.paid_at, t2.created_at) <= '${endDateTime}'::timestamp
      ) AS mutations
      ORDER BY date ASC
    `));

    let runningBalance = 0;
    const mutations = (result.rows as any[]).map(row => {
      const kasIn = Number(row.kas_masuk || 0);
      const kasOut = Number(row.kas_keluar || 0);
      runningBalance += kasIn - kasOut;
      return {
        id: row.id,
        date: row.date,
        description: row.description,
        type: row.type,
        kasIn,
        kasOut,
        runningBalance,
      };
    });

    const totalIn = mutations.reduce((s, m) => s + m.kasIn, 0);
    const totalOut = mutations.reduce((s, m) => s + m.kasOut, 0);

    return success(c, {
      account: bankInfo || { id: rawId, bankName: rawId, accountNumber: "", accountName: "" },
      summary: { openingBalance: 0, totalIn, totalOut, closingBalance: totalIn - totalOut },
      mutations: mutations.reverse(),
    });
  } catch (err) {
    console.error("Rekening detail error:", err);
    return error(c, "Failed to generate rekening detail", 500);
  }
});

/**
 * GET /admin/reports/donor-detail?donorId=xxx&startDate=&endDate=
 * Transaction history for one donor
 */
reportsAdmin.get("/donor-detail", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const donorId = c.req.query("donorId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!donorId) return error(c, "donorId is required", 400);

  try {
    // Get donor info
    const [donor] = await db.select().from(donatur).where(eq(donatur.id, donorId));
    if (!donor) return error(c, "Donor not found", 404);

    // Transactions by this donor (match by email)
    const txConds: any[] = [
      eq(transactions.paymentStatus, "paid"),
      eq(transactions.donorEmail, donor.email),
    ];
    if (startDate) txConds.push(gte(transactions.paidAt, new Date(startDate)));
    if (endDate) txConds.push(lte(transactions.paidAt, new Date(endDate)));

    const txList = await db
      .select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        productType: transactions.productType,
        productName: transactions.productName,
        totalAmount: transactions.totalAmount,
        paymentMethodId: transactions.paymentMethodId,
        paidAt: transactions.paidAt,
        category: transactions.category,
      })
      .from(transactions)
      .where(and(...txConds))
      .orderBy(desc(transactions.paidAt))
      .limit(200);

    const totalAmount = txList.reduce((s, t) => s + Number(t.totalAmount), 0);

    // By product type
    const byType: Record<string, { count: number; total: number }> = {};
    for (const t of txList) {
      if (!byType[t.productType]) byType[t.productType] = { count: 0, total: 0 };
      byType[t.productType].count++;
      byType[t.productType].total += Number(t.totalAmount);
    }

    return success(c, {
      donor: { id: donor.id, name: donor.name, email: donor.email, phone: donor.phone },
      summary: { totalTransactions: txList.length, totalAmount, byProductType: byType },
      transactions: txList.map(t => ({ ...t, totalAmount: Number(t.totalAmount) })),
    });
  } catch (err) {
    console.error("Donor detail error:", err);
    return error(c, "Failed to generate donor detail", 500);
  }
});

/**
 * GET /admin/reports/consistency-check
 * Detect category mismatch against COA blueprint standards
 */
reportsAdmin.get("/consistency-check", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const txConds: any[] = [eq(transactions.paymentStatus, "paid")];
  const disbConds: any[] = [inArray(disbursements.status, ["submitted", "approved", "paid"])];

  if (startDate) {
    txConds.push(gte(transactions.paidAt, new Date(startDate)));
    disbConds.push(gte(disbursements.createdAt, new Date(startDate)));
  }
  if (endDate) {
    txConds.push(lte(transactions.paidAt, new Date(endDate)));
    disbConds.push(lte(disbursements.createdAt, new Date(endDate)));
  }

  const txCategoryRows = await db
    .select({ category: transactions.category, count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(...txConds))
    .groupBy(transactions.category);

  const disbCategoryRows = await db
    .select({ category: disbursements.category, count: sql<number>`count(*)` })
    .from(disbursements)
    .where(and(...disbConds))
    .groupBy(disbursements.category);

  const invalidTransactionCategories = txCategoryRows
    .filter((r) => !INCOME_CATEGORIES.includes((r.category || "") as any))
    .map((r) => ({ category: r.category, count: Number(r.count || 0) }));

  const invalidDisbursementCategories = disbCategoryRows
    .filter((r) => !EXPENSE_CATEGORIES.includes((r.category || "") as any))
    .map((r) => ({ category: r.category, count: Number(r.count || 0) }));

  const hasMismatch = invalidTransactionCategories.length > 0 || invalidDisbursementCategories.length > 0;

  return success(c, {
    period: { startDate: startDate || null, endDate: endDate || null },
    hasMismatch,
    standards: {
      incomeCategories: INCOME_CATEGORIES,
      expenseCategories: EXPENSE_CATEGORIES,
    },
    invalid: {
      transactions: invalidTransactionCategories,
      disbursements: invalidDisbursementCategories,
    },
  });
});

/**
 * GET /admin/reports/consistency-check/details
 * Paginated rows for invalid categories (transactions/disbursements)
 */
reportsAdmin.get("/consistency-check/details", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const sourceRaw = (c.req.query("source") || "all").toLowerCase();
  const search = (c.req.query("search") || "").trim();
  const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"), 20, 100);

  const source = ["all", "transactions", "disbursements"].includes(sourceRaw)
    ? (sourceRaw as "all" | "transactions" | "disbursements")
    : "all";

  const txConds: any[] = [eq(transactions.paymentStatus, "paid")];
  const disbConds: any[] = [inArray(disbursements.status, ["submitted", "approved", "paid"])];

  if (startDate) {
    txConds.push(gte(transactions.paidAt, new Date(startDate)));
    disbConds.push(gte(disbursements.createdAt, new Date(startDate)));
  }
  if (endDate) {
    txConds.push(lte(transactions.paidAt, new Date(endDate)));
    disbConds.push(lte(disbursements.createdAt, new Date(endDate)));
  }

  const txCategoryRows = await db
    .select({ category: transactions.category, count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(...txConds))
    .groupBy(transactions.category);

  const disbCategoryRows = await db
    .select({ category: disbursements.category, count: sql<number>`count(*)` })
    .from(disbursements)
    .where(and(...disbConds))
    .groupBy(disbursements.category);

  const invalidTransactionCategories = txCategoryRows
    .filter((r) => !INCOME_CATEGORIES.includes((r.category || "") as any))
    .map((r) => String(r.category || "").trim())
    .filter((category) => category.length > 0);

  const invalidDisbursementCategories = disbCategoryRows
    .filter((r) => !EXPENSE_CATEGORIES.includes((r.category || "") as any))
    .map((r) => String(r.category || "").trim())
    .filter((category) => category.length > 0);

  const unifiedRows: Array<{
    source: "transactions" | "disbursements";
    id: string;
    referenceNumber: string | null;
    category: string;
    status: string;
    amount: number;
    date: string | null;
    description: string;
  }> = [];

  if (source !== "disbursements" && invalidTransactionCategories.length > 0) {
    const txSearchConds = search
      ? [
          like(transactions.transactionNumber, `%${search}%`),
          like(transactions.productName, `%${search}%`),
          like(transactions.donorName, `%${search}%`),
          like(transactions.category, `%${search}%`),
        ]
      : [];

    const txRows = await db
      .select({
        id: transactions.id,
        referenceNumber: transactions.transactionNumber,
        category: transactions.category,
        status: transactions.paymentStatus,
        amount: transactions.totalAmount,
        paidAt: transactions.paidAt,
        createdAt: transactions.createdAt,
        description: transactions.productName,
      })
      .from(transactions)
      .where(and(
        ...txConds,
        inArray(transactions.category, invalidTransactionCategories as string[]),
        ...(txSearchConds.length ? [or(...txSearchConds)] : []),
      ))
      .orderBy(desc(transactions.paidAt), desc(transactions.createdAt));

    unifiedRows.push(...txRows.map((row) => ({
      source: "transactions" as const,
      id: String(row.id),
      referenceNumber: row.referenceNumber || null,
      category: String(row.category || ""),
      status: String(row.status || "paid"),
      amount: Number(row.amount || 0),
      date: (row.paidAt || row.createdAt || null)?.toISOString?.() || null,
      description: row.description || "Transaksi",
    })));
  }

  if (source !== "transactions" && invalidDisbursementCategories.length > 0) {
    const disbSearchConds = search
      ? [
          like(disbursements.disbursementNumber, `%${search}%`),
          like(disbursements.purpose, `%${search}%`),
          like(disbursements.recipientName, `%${search}%`),
          like(disbursements.category, `%${search}%`),
        ]
      : [];

    const disbRows = await db
      .select({
        id: disbursements.id,
        referenceNumber: disbursements.disbursementNumber,
        category: disbursements.category,
        status: disbursements.status,
        amount: disbursements.amount,
        paidAt: disbursements.paidAt,
        createdAt: disbursements.createdAt,
        description: disbursements.purpose,
      })
      .from(disbursements)
      .where(and(
        ...disbConds,
        inArray(disbursements.category, invalidDisbursementCategories as string[]),
        ...(disbSearchConds.length ? [or(...disbSearchConds)] : []),
      ))
      .orderBy(desc(disbursements.paidAt), desc(disbursements.createdAt));

    unifiedRows.push(...disbRows.map((row) => ({
      source: "disbursements" as const,
      id: String(row.id),
      referenceNumber: row.referenceNumber || null,
      category: String(row.category || ""),
      status: String(row.status || "submitted"),
      amount: Number(row.amount || 0),
      date: (row.paidAt || row.createdAt || null)?.toISOString?.() || null,
      description: row.description || "Pencairan",
    })));
  }

  unifiedRows.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });

  const total = unifiedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * limit;
  const rows = unifiedRows.slice(offset, offset + limit);

  return success(c, {
    period: { startDate: startDate || null, endDate: endDate || null },
    source,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
    invalidCategories: {
      transactions: invalidTransactionCategories,
      disbursements: invalidDisbursementCategories,
    },
    rows,
  });
});

export default reportsAdmin;
