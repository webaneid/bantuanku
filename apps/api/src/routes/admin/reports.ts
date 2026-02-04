import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql, sum, inArray, or, like } from "drizzle-orm";
import {
  campaigns,
  donations,
  ledger,
  users,
  ledgerAccounts,
  ledgerLines,
  ledgerEntries,
  paymentMethods,
  evidences,
  settings,
  qurbanPayments,
  qurbanOrders,
  qurbanPackages,
  qurbanSavingsTransactions,
  qurbanSavings,
} from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const reportsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

reportsAdmin.get("/donations-summary", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [eq(donations.paymentStatus, "success")];

  if (startDate) {
    conditions.push(gte(donations.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(donations.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [summary] = await db
    .select({
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${donations.amount})`,
      totalFees: sql<number>`sum(${donations.feeAmount})`,
      avgDonation: sql<number>`avg(${donations.amount})`,
      uniqueDonors: sql<number>`count(distinct ${donations.userId})`,
    })
    .from(donations)
    .where(whereClause);

  const byCampaign = await db
    .select({
      campaignId: donations.campaignId,
      campaignTitle: campaigns.title,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${donations.amount})`,
      donorCount: sql<number>`count(distinct ${donations.userId})`,
    })
    .from(donations)
    .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
    .where(whereClause)
    .groupBy(donations.campaignId, campaigns.title)
    .orderBy(desc(sql<number>`sum(${donations.amount})`))
    .limit(10);

  const byDate = await db
    .select({
      date: sql<string>`date(${donations.createdAt})`,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${donations.amount})`,
    })
    .from(donations)
    .where(whereClause)
    .groupBy(sql`date(${donations.createdAt})`)
    .orderBy(sql`date(${donations.createdAt})`);

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

  const performance = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      category: campaigns.category,
      pillar: campaigns.pillar,
      goal: campaigns.goal,
      collected: campaigns.collected,
      donorCount: campaigns.donorCount,
      progressPercentage: sql<number>`(${campaigns.collected}::float / ${campaigns.goal}::float * 100)`,
      status: campaigns.status,
      createdAt: campaigns.createdAt,
      publishedAt: campaigns.publishedAt,
      daysActive: sql<number>`extract(day from (now() - ${campaigns.publishedAt}))`,
    })
    .from(campaigns)
    .where(whereClause)
    .orderBy(desc(campaigns.collected));

  const byCategory = await db
    .select({
      category: campaigns.category,
      totalCampaigns: sql<number>`count(*)`,
      totalGoal: sql<number>`sum(${campaigns.goal})`,
      totalCollected: sql<number>`sum(${campaigns.collected})`,
      totalDonors: sql<number>`sum(${campaigns.donorCount})`,
    })
    .from(campaigns)
    .where(whereClause)
    .groupBy(campaigns.category)
    .orderBy(desc(sql<number>`sum(${campaigns.collected})`));

  const byPillar = await db
    .select({
      pillar: campaigns.pillar,
      totalCampaigns: sql<number>`count(*)`,
      totalGoal: sql<number>`sum(${campaigns.goal})`,
      totalCollected: sql<number>`sum(${campaigns.collected})`,
      totalDonors: sql<number>`sum(${campaigns.donorCount})`,
    })
    .from(campaigns)
    .where(whereClause)
    .groupBy(campaigns.pillar)
    .orderBy(desc(sql<number>`sum(${campaigns.collected})`));

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

  const conditions = [];

  if (startDate) {
    conditions.push(gte(ledgerEntries.postedAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(ledgerEntries.postedAt, new Date(endDate)));
  }

  const entryWhereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const balanceSheet = await db
    .select({
      accountCode: ledgerAccounts.code,
      accountName: ledgerAccounts.name,
      accountType: ledgerAccounts.type,
      totalDebit: sql<number>`sum(${ledgerLines.debit})`,
      totalCredit: sql<number>`sum(${ledgerLines.credit})`,
      balance: sql<number>`sum(${ledgerLines.debit}) - sum(${ledgerLines.credit})`,
    })
    .from(ledgerLines)
    .innerJoin(ledgerEntries, eq(ledgerLines.entryId, ledgerEntries.id))
    .innerJoin(ledgerAccounts, eq(ledgerLines.accountId, ledgerAccounts.id))
    .where(entryWhereClause)
    .groupBy(ledgerAccounts.code, ledgerAccounts.name, ledgerAccounts.type)
    .orderBy(ledgerAccounts.code);

  const assets = balanceSheet.filter((a) => a.accountType === "asset");
  const liabilities = balanceSheet.filter((a) => a.accountType === "liability");
  const equity = balanceSheet.filter((a) => a.accountType === "equity");
  const revenue = balanceSheet.filter((a) => a.accountType === "revenue");
  const expenses = balanceSheet.filter((a) => a.accountType === "expense");

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalEquity = equity.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalRevenue = revenue.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + Number(a.balance), 0);
  const netIncome = totalRevenue - totalExpenses;

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
    conditions.push(gte(ledger.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(ledger.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [summary] = await db
    .select({
      totalDisbursements: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${ledger.amount})`,
      pending: sql<number>`count(*) filter (where ${ledger.status} = 'pending')`,
      processing: sql<number>`count(*) filter (where ${ledger.status} = 'processing')`,
      completed: sql<number>`count(*) filter (where ${ledger.status} = 'completed')`,
      cancelled: sql<number>`count(*) filter (where ${ledger.status} = 'cancelled')`,
    })
    .from(ledger)
    .where(whereClause);

  const byCampaign = await db
    .select({
      campaignId: ledger.campaignId,
      campaignTitle: campaigns.title,
      totalDisbursements: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${ledger.amount})`,
    })
    .from(ledger)
    .innerJoin(campaigns, eq(ledger.campaignId, campaigns.id))
    .where(whereClause)
    .groupBy(ledger.campaignId, campaigns.title)
    .orderBy(desc(sql<number>`sum(${ledger.amount})`))
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

  const conditions = [eq(donations.paymentStatus, "success")];

  if (startDate) {
    conditions.push(gte(donations.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(donations.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const topDonors = await db
    .select({
      userId: donations.userId,
      donorName: donations.donorName,
      donorEmail: donations.donorEmail,
      totalDonations: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${donations.amount})`,
      avgDonation: sql<number>`avg(${donations.amount})`,
      lastDonation: sql<Date>`max(${donations.createdAt})`,
    })
    .from(donations)
    .where(whereClause)
    .groupBy(donations.userId, donations.donorName, donations.donorEmail)
    .orderBy(desc(sql<number>`sum(${donations.amount})`))
    .limit(20);

  const donorRetention = await db
    .select({
      month: sql<string>`to_char(${donations.createdAt}, 'YYYY-MM')`,
      newDonors: sql<number>`count(distinct ${donations.userId}) filter (where ${donations.userId} not in (select user_id from donations d2 where d2.created_at < ${donations.createdAt}))`,
      returningDonors: sql<number>`count(distinct ${donations.userId}) filter (where ${donations.userId} in (select user_id from donations d2 where d2.created_at < ${donations.createdAt}))`,
    })
    .from(donations)
    .where(whereClause)
    .groupBy(sql`to_char(${donations.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${donations.createdAt}, 'YYYY-MM')`);

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
    // Query to calculate liability balance per campaign
    //
    // Logic:
    // - Donations: Credit to 2010 (increase liability)
    // - Disbursements: Debit to 2010 (decrease liability)
    // - Remaining = Credits - Debits
    const result = await db.execute(sql`
      WITH campaign_transactions AS (
        SELECT
          c.id as campaign_id,
          c.title as campaign_title,

          -- Donations (credits to 2010)
          COALESCE(SUM(CASE)
            WHEN le.ref_type = 'donation' AND ll.credit > 0 AND la.code = '2010'
            THEN ll.credit
            ELSE 0
          END), 0) as total_donations,

          -- Count of donations
          COUNT(DISTINCT CASE
            WHEN le.ref_type = 'donation' AND ll.credit > 0 AND la.code = '2010'
            THEN le.id
          END) as donation_count,

          -- Disbursements (debits to 2010)
          COALESCE(SUM(CASE
            WHEN le.ref_type = 'disbursement' AND ll.debit > 0 AND la.code = '2010'
            THEN ll.debit
            ELSE 0
          END), 0) as total_disbursements,

          -- Count of disbursements
          COUNT(DISTINCT CASE
            WHEN le.ref_type = 'disbursement' AND ll.debit > 0 AND la.code = '2010'
            THEN le.id
          END) as disbursement_count

        FROM campaigns c
        LEFT JOIN donations d ON d.campaign_id = c.id AND d.payment_status = 'success'
        LEFT JOIN ledger_entries le ON (
          (le.ref_type = 'donation' AND le.ref_id = d.id) OR
          (le.ref_type = 'disbursement' AND le.ref_id IN (
            SELECT l.id FROM ledger l WHERE l.campaign_id = c.id
          ))
        )
        LEFT JOIN ledger_lines ll ON ll.entry_id = le.id
        LEFT JOIN ledger_accounts la ON la.id = ll.account_id

        WHERE c.is_active = true

        GROUP BY c.id, c.title
      )
      SELECT
        campaign_id as "campaignId",
        campaign_title as "campaignTitle",
        total_donations::numeric as "totalDonations",
        total_disbursements::numeric as "totalDisbursements",
        (total_donations - total_disbursements)::numeric as "remainingLiability",
        donation_count as "donationCount",
        disbursement_count as "disbursementCount"
      FROM campaign_transactions
      WHERE total_donations > 0 OR total_disbursements > 0
      ORDER BY (total_donations - total_disbursements) DESC
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
  const db = c.get("db");
  const code = c.req.param("code");

  try {
    const result = await db.execute(sql`
      SELECT
        la.code,
        la.name,
        la.type,
        la.normal_side as "normalSide",
        COALESCE(SUM(ll.debit), 0)::numeric as "totalDebit",
        COALESCE(SUM(ll.credit), 0)::numeric as "totalCredit",
        CASE
          WHEN la.normal_side = 'debit' THEN (COALESCE(SUM(ll.debit), 0) - COALESCE(SUM(ll.credit), 0))
          ELSE (COALESCE(SUM(ll.credit), 0) - COALESCE(SUM(ll.debit), 0))
        END::numeric as balance
      FROM ledger_accounts la
      LEFT JOIN ledger_lines ll ON ll.account_id = la.id
      WHERE la.code = ${code}
      GROUP BY la.id, la.code, la.name, la.type, la.normal_side
    `);

    if (result.rows.length === 0) {
      return error(c, `Account with code ${code} not found`, 404);
    }

    const row: any = result.rows[0];
    const data = {
      code: row.code,
      name: row.name,
      type: row.type,
      normalSide: row.normalSide,
      totalDebit: Number(row.totalDebit || 0),
      totalCredit: Number(row.totalCredit || 0),
      balance: Number(row.balance || 0),
    };

    return success(c, data);
  } catch (err) {
    console.error("Account balance error:", err);
    return error(c, "Failed to get account balance", 500);
  }
});

/**
 * GET /admin/reports/cash-flow
 *
 * Cash Flow Report - Mutasi Kas & Bank
 * Shows money in/out based on ledger entries for cash/bank accounts (1010, 1020)
 */
reportsAdmin.get("/cash-flow", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const accountCode = c.req.query("accountCode");
    const refType = c.req.query("refType");
    const search = c.req.query("search");

    if (!startDate || !endDate) {
      return error(c, "startDate and endDate are required", 400);
    }

    // Add time to make endDate inclusive (end of day)
    const endDateTime = `${endDate} 23:59:59`;

    // Build filters
    const refTypeFilter = refType === 'donation'
      ? `AND 'donation' IS NOT NULL`
      : refType === 'disbursement'
        ? `AND 'disbursement' IS NOT NULL`
        : '';

    const searchFilter = search ? `
      AND (
        donor_name ILIKE '%${search}%'
        OR donor_email ILIKE '%${search}%'
        OR campaign_title ILIKE '%${search}%'
        OR purpose ILIKE '%${search}%'
        OR recipient_name ILIKE '%${search}%'
      )
    ` : '';

    // Opening balance is always 0 for now (we don't track historical balance yet)
    const openingBalance = 0;

    // Get transactions from both donations (success) and disbursements (paid)
    console.log(`[Cash Flow] Querying from ${startDate} to ${endDateTime}, refType: ${refType}, search: ${search}`);
    const result = await db.execute(sql.raw(`
      -- Regular Donations (kas masuk)
      SELECT
        d.id as transaction_id,
        COALESCE(d.paid_at, d.created_at) as transaction_date,
        'donation' as transaction_type,
        d.amount as kas_masuk,
        0 as kas_keluar,
        '1020' as account_code,
        'Bank - Operasional' as account_name,
        d.donor_name,
        d.donor_email,
        d.payment_method_id as payment_method,
        c.title as campaign_title,
        NULL as purpose,
        NULL as recipient_name,
        EXISTS(SELECT 1 FROM donation_evidences de WHERE de.donation_id = d.id) as has_evidence
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      WHERE d.payment_status = 'success'
        AND COALESCE(d.paid_at, d.created_at) >= '${startDate}'::timestamp
        AND COALESCE(d.paid_at, d.created_at) <= '${endDateTime}'::timestamp
        ${refType === 'disbursement' || refType === 'zakat_distribution' ? 'AND FALSE' : ''}
        ${searchFilter}

      UNION ALL

      -- Zakat Donations (kas masuk)
      SELECT
        zd.id as transaction_id,
        COALESCE(zd.paid_at, zd.created_at) as transaction_date,
        'zakat_donation' as transaction_type,
        zd.amount as kas_masuk,
        0 as kas_keluar,
        '1020' as account_code,
        'Bank - Operasional' as account_name,
        zd.donor_name,
        zd.donor_email,
        zd.payment_method_id as payment_method,
        zt.name as campaign_title,
        NULL as purpose,
        NULL as recipient_name,
        CASE WHEN zd.payment_reference IS NOT NULL THEN true ELSE false END as has_evidence
      FROM zakat_donations zd
      LEFT JOIN zakat_types zt ON zd.zakat_type_id = zt.id
      WHERE zd.payment_status = 'success'
        AND COALESCE(zd.paid_at, zd.created_at) >= '${startDate}'::timestamp
        AND COALESCE(zd.paid_at, zd.created_at) <= '${endDateTime}'::timestamp
        ${refType === 'disbursement' || refType === 'donation' ? 'AND FALSE' : ''}
        ${searchFilter}

      UNION ALL

      -- Regular Disbursements (kas keluar)
      SELECT
        l.id as transaction_id,
        COALESCE(l.paid_at, l.created_at) as transaction_date,
        'disbursement' as transaction_type,
        0 as kas_masuk,
        l.amount as kas_keluar,
        '1020' as account_code,
        'Bank - Operasional' as account_name,
        NULL as donor_name,
        NULL as donor_email,
        l.payment_method,
        c.title as campaign_title,
        l.purpose,
        l.recipient_name,
        EXISTS(SELECT 1 FROM evidences e WHERE e.disbursement_id = l.id) as has_evidence
      FROM ledger l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.status = 'paid'
        AND l.purpose NOT LIKE 'Penerimaan Zakat%'
        AND COALESCE(l.paid_at, l.created_at) >= '${startDate}'::timestamp
        AND COALESCE(l.paid_at, l.created_at) <= '${endDateTime}'::timestamp
        ${refType === 'donation' || refType === 'zakat_donation' ? 'AND FALSE' : ''}
        ${searchFilter}

      UNION ALL

      -- Zakat Distributions (kas keluar)
      SELECT
        zdi.id as transaction_id,
        COALESCE(zdi.disbursed_at, zdi.created_at) as transaction_date,
        'zakat_distribution' as transaction_type,
        0 as kas_masuk,
        zdi.amount as kas_keluar,
        '1020' as account_code,
        'Bank - Operasional' as account_name,
        NULL as donor_name,
        NULL as donor_email,
        NULL as payment_method,
        zt.name as campaign_title,
        zdi.purpose as purpose,
        zdi.recipient_name,
        false as has_evidence
      FROM zakat_distributions zdi
      LEFT JOIN zakat_types zt ON zdi.zakat_type_id = zt.id
      WHERE zdi.status = 'disbursed'
        AND zdi.disbursed_at IS NOT NULL
        AND zdi.disbursed_at >= '${startDate}'::timestamp
        AND zdi.disbursed_at <= '${endDateTime}'::timestamp
        ${refType === 'donation' || refType === 'disbursement' || refType === 'zakat_donation' ? 'AND FALSE' : ''}
        ${searchFilter}

      UNION ALL

      -- Qurban Payments (kas masuk)
      SELECT
        qp.id as transaction_id,
        COALESCE(qp.payment_date, qp.created_at) as transaction_date,
        'qurban_payment' as transaction_type,
        qp.amount as kas_masuk,
        0 as kas_keluar,
        '1020' as account_code,
        'Bank - Operasional' as account_name,
        qo.donor_name,
        qo.donor_email,
        qp.payment_channel as payment_method,
        qpkg.name as campaign_title,
        NULL as purpose,
        NULL as recipient_name,
        CASE WHEN qp.payment_proof IS NOT NULL THEN true ELSE false END as has_evidence
      FROM qurban_payments qp
      LEFT JOIN qurban_orders qo ON qo.id = qp.order_id
      LEFT JOIN qurban_packages qpkg ON qpkg.id = qo.package_id
      WHERE qp.status = 'verified'
        AND COALESCE(qp.payment_date, qp.created_at) >= '${startDate}'::timestamp
        AND COALESCE(qp.payment_date, qp.created_at) <= '${endDateTime}'::timestamp
        ${refType === 'disbursement' || refType === 'zakat_distribution' ? 'AND FALSE' : ''}
        ${searchFilter}

      UNION ALL

      -- Qurban Savings Transactions (kas masuk/keluar)
      SELECT
        qst.id as transaction_id,
        COALESCE(qst.transaction_date, qst.created_at) as transaction_date,
        CASE
          WHEN qst.transaction_type = 'deposit' THEN 'qurban_savings_deposit'
          WHEN qst.transaction_type = 'withdrawal' THEN 'qurban_savings_withdrawal'
          ELSE 'qurban_savings'
        END as transaction_type,
        CASE WHEN qst.transaction_type = 'withdrawal' THEN 0 ELSE qst.amount END as kas_masuk,
        CASE WHEN qst.transaction_type = 'withdrawal' THEN qst.amount ELSE 0 END as kas_keluar,
        '1020' as account_code,
        'Bank - Operasional' as account_name,
        qs.donor_name,
        qs.donor_email,
        qst.payment_channel as payment_method,
        qpkg.name as campaign_title,
        qst.transaction_type as purpose,
        NULL as recipient_name,
        CASE WHEN qst.payment_proof IS NOT NULL THEN true ELSE false END as has_evidence
      FROM qurban_savings_transactions qst
      LEFT JOIN qurban_savings qs ON qs.id = qst.savings_id
      LEFT JOIN qurban_packages qpkg ON qpkg.id = qs.target_package_id
      WHERE qst.status = 'verified'
        AND qst.transaction_type != 'conversion' -- conversion tidak masuk cash flow (sudah tercatat saat deposit)
        AND COALESCE(qst.transaction_date, qst.created_at) >= '${startDate}'::timestamp
        AND COALESCE(qst.transaction_date, qst.created_at) <= '${endDateTime}'::timestamp
        ${refType === 'disbursement' ? 'AND FALSE' : ''}
        ${searchFilter}

      ORDER BY transaction_date DESC
    `));

    console.log(`[Cash Flow] Found ${result.rows.length} transactions`);
    if (result.rows.length > 0) {
      console.log(`[Cash Flow] Sample transaction:`, result.rows[0]);
      console.log(`[Cash Flow] Transaction types:`, [...new Set(result.rows.map((r: any) => r.transaction_type))]);
      
      // Debug specific ID
      const specificTx = result.rows.find((r: any) => r.transaction_id === 'mvc98xqjtr7fu16frals4');
      if (specificTx) {
        console.log(`[Cash Flow] Found ID mvc98xqjtr7fu16frals4:`, specificTx);
      }
    }

    // Debug: Check zakat data separately
    const zakatCheck = await db.execute(sql.raw(`
      SELECT 
        id, 
        donor_name, 
        amount, 
        payment_status,
        paid_at,
        created_at,
        COALESCE(paid_at, created_at) as transaction_date,
        COALESCE(paid_at, created_at) >= '${startDate}'::timestamp as in_start_range,
        COALESCE(paid_at, created_at) <= '${endDate}'::timestamp as in_end_range
      FROM zakat_donations 
      WHERE payment_status = 'success'
      LIMIT 5
    `));
    console.log(`[Cash Flow] Zakat donations sample with date check:`, zakatCheck.rows);

    const zakatDistCheck = await db.execute(sql.raw(`
      SELECT COUNT(*) as count FROM zakat_distributions WHERE status IN ('disbursed', 'approved')
    `));
    console.log(`[Cash Flow] Total zakat distributions:`, zakatDistCheck.rows[0]);

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

    // Step 4: Format transactions and calculate totals
    let totalIn = 0;
    let totalOut = 0;

    const formattedTransactions = result.rows.map((row: any) => {
      const kasIn = Number(row.kas_masuk || 0);
      const kasOut = Number(row.kas_keluar || 0);

      totalIn += kasIn;
      totalOut += kasOut;

      let description = '';
      let paymentMethod = '';

      // Helper to map bank/channel id to readable label
      const mapBankLabel = (val: string | null) => {
        if (!val) return '';
        const bankId = val.startsWith('bank_') ? val.replace('bank_', '') : val;
        const bank = bankAccounts.find((b: any) => b.id === bankId);
        return bank ? `${bank.bankName} - ${bank.accountNumber}` : val;
      };

      if (row.transaction_type === 'donation') {
        description = `Donasi ${row.campaign_title || 'Campaign'} dari ${row.donor_name || row.donor_email || 'Anonim'}`;

        // Map payment_method_id to bank name
        if (row.payment_method && bankAccounts.length > 0) {
          const bank = bankAccounts.find((b: any) => b.id === row.payment_method);
          paymentMethod = bank ? `${bank.bankName} - ${bank.accountNumber}` : row.payment_method;
        } else {
          paymentMethod = row.payment_method || 'Transfer Bank';
        }
      } else if (row.transaction_type === 'zakat_donation') {
        description = `Pembayaran ${row.campaign_title || 'Zakat'} dari ${row.donor_name || row.donor_email || 'Anonim'}`;

        // Map payment_method_id to bank name
        if (row.payment_method && bankAccounts.length > 0) {
          const bank = bankAccounts.find((b: any) => b.id === row.payment_method);
          paymentMethod = bank ? `${bank.bankName} - ${bank.accountNumber}` : row.payment_method;
        } else {
          paymentMethod = row.payment_method || 'Transfer Bank';
        }
      } else if (row.transaction_type === 'qurban_payment') {
        description = `Pembayaran Qurban ${row.campaign_title || ''} dari ${row.donor_name || row.donor_email || 'Anonim'}`;
        paymentMethod = mapBankLabel(row.payment_method) || row.payment_method || 'Transfer Bank';
      } else if (row.transaction_type === 'qurban_savings_deposit') {
        description = `Setoran Tabungan Qurban ${row.campaign_title || ''} oleh ${row.donor_name || 'Anonim'}`;
        paymentMethod = mapBankLabel(row.payment_method) || row.payment_method || 'Transfer Bank';
      } else if (row.transaction_type === 'qurban_savings_withdrawal') {
        description = `Penarikan Tabungan Qurban ${row.campaign_title || ''} (${row.donor_name || '-'})`;
        paymentMethod = mapBankLabel(row.payment_method) || row.payment_method || 'Transfer Bank';
      } else if (row.transaction_type === 'disbursement') {
        description = `${row.purpose || 'Penyaluran'} ke ${row.recipient_name || '-'}`;
        paymentMethod = row.payment_method || 'Transfer Bank';
      } else if (row.transaction_type === 'zakat_distribution') {
        description = `Penyaluran ${row.campaign_title || 'Zakat'} - ${row.purpose || 'Asnaf'} ke ${row.recipient_name || '-'}`;
        paymentMethod = 'Transfer Bank';
      } else {
        description = 'Transaksi';
        paymentMethod = '-';
      }

      return {
        id: row.transaction_id,
        date: row.transaction_date,
        type: row.transaction_type,
        description,
        kasIn,
        kasOut,
        account: row.account_name,
        accountCode: row.account_code,
        paymentMethod,
        hasEvidence: Boolean(row.has_evidence),
        refId: row.transaction_id,
        zakatTypeName: row.campaign_title || null,
      };
    });

    const closingBalance = openingBalance + totalIn - totalOut;

    const data = {
      summary: {
        openingBalance,
        totalIn,
        totalOut,
        closingBalance,
        transactionCount: formattedTransactions.length,
      },
      transactions: formattedTransactions,
    };

    return success(c, data);
  } catch (err) {
    console.error("Cash flow report error:", err);
    return error(c, "Failed to generate cash flow report", 500);
  }
});

export default reportsAdmin;
