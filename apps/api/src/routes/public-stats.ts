import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  activityReports,
  campaigns,
  disbursements,
  mitra,
  qurbanPackagePeriods,
  qurbanPackages,
  qurbanPeriods,
  qurbanExecutions,
  qurbanSharedGroups,
  transactions,
  zakatDistributions,
  zakatPeriods,
  zakatTypes,
} from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const publicStats = new Hono<{ Bindings: Env; Variables: Variables }>();

publicStats.get("/", async (c) => {
  const db = c.get("db");

  const [
    totalCampaigns,
    totalDonors,
    universalDisbursed,
    legacyZakatDisbursed,
    totalPartners,
  ] = await Promise.all([
    // Count active campaigns
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),

    // Count unique paid donors from transactions (user_id preferred, fallback donor_email)
    db
      .select({
        count: sql<number>`count(distinct coalesce(nullif(${transactions.userId}, ''), nullif(lower(${transactions.donorEmail}), '')))`
      })
      .from(transactions)
      .where(eq(transactions.paymentStatus, "paid")),

    // Universal disbursements (all types) with status = 'paid'
    db
      .select({ sum: sql<number>`coalesce(sum(${disbursements.amount}), 0)` })
      .from(disbursements)
      .where(eq(disbursements.status, "paid")),

    // Legacy zakat distributions (old system) with status = 'disbursed'
    db
      .select({ sum: sql<number>`coalesce(sum(${zakatDistributions.amount}), 0)` })
      .from(zakatDistributions)
      .where(eq(zakatDistributions.status, "disbursed")),

    // Total active partners (verified/active collaborator state)
    db
      .select({ count: sql<number>`count(*)` })
      .from(mitra)
      .where(inArray(mitra.status, ["verified"])),
  ]);

  const totalDisbursed =
    Number(universalDisbursed[0]?.sum || 0) +
    Number(legacyZakatDisbursed[0]?.sum || 0);

  return success(c, {
    totalDonors: Number(totalDonors[0]?.count || 0),
    totalCampaigns: Number(totalCampaigns[0]?.count || 0),
    totalDisbursed,
    totalPartners: Number(totalPartners[0]?.count || 0),
  });
});

publicStats.get("/zakat-report", async (c) => {
  const db = c.get("db");
  const periodId = c.req.query("periodId");
  const zakatTypeId = c.req.query("zakatTypeId");
  const program = c.req.query("program");

  const conditions = [
    eq(transactions.paymentStatus, "paid"),
    eq(transactions.productType, "zakat"),
  ];

  if (periodId) {
    conditions.push(eq(zakatPeriods.id, periodId));
  }
  if (zakatTypeId) {
    conditions.push(eq(zakatTypes.id, zakatTypeId));
  }
  if (program) {
    conditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const rows = await db
    .select({
      id: transactions.id,
      paidAt: transactions.paidAt,
      donorName: transactions.donorName,
      amount: transactions.totalAmount,
      periodId: zakatPeriods.id,
      periodName: zakatPeriods.name,
      zakatTypeId: zakatTypes.id,
      zakatTypeName: zakatTypes.name,
      programKey: sql<string>`coalesce(${mitra.slug}, 'organization')`,
      programName: sql<string>`coalesce(${mitra.name}, 'Bantuanku')`,
    })
    .from(transactions)
    .innerJoin(zakatPeriods, eq(transactions.productId, zakatPeriods.id))
    .innerJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .leftJoin(mitra, eq(zakatTypes.createdBy, mitra.userId))
    .where(and(...conditions))
    .orderBy(desc(transactions.paidAt))
    .limit(200);

  const typeFilterConditions = [eq(zakatTypes.isActive, true)];
  if (program) {
    typeFilterConditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const types = await db
    .select({ id: zakatTypes.id, name: zakatTypes.name })
    .from(zakatTypes)
    .leftJoin(mitra, eq(zakatTypes.createdBy, mitra.userId))
    .where(and(...typeFilterConditions))
    .orderBy(zakatTypes.displayOrder, zakatTypes.name);

  const periodFilterConditions = [
    eq(zakatPeriods.status, "active"),
    eq(zakatTypes.isActive, true),
  ];
  if (program) {
    periodFilterConditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }
  if (zakatTypeId) {
    periodFilterConditions.push(eq(zakatTypes.id, zakatTypeId));
  }

  const periods = await db
    .select({ id: zakatPeriods.id, name: zakatPeriods.name })
    .from(zakatPeriods)
    .innerJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .leftJoin(mitra, eq(zakatTypes.createdBy, mitra.userId))
    .where(and(...periodFilterConditions))
    .orderBy(desc(zakatPeriods.year), zakatPeriods.name);

  const zakatCampaigns = await db
    .select({ id: campaigns.id, title: campaigns.title })
    .from(campaigns)
    .where(sql<boolean>`lower(coalesce(${campaigns.pillar}, '')) = 'zakat'`)
    .orderBy(desc(campaigns.createdAt))
    .limit(100);

  const programMap = new Map<string, string>();
  programMap.set("organization", "Bantuanku");
  rows.forEach((row) => {
    if (!programMap.has(row.programKey)) {
      programMap.set(row.programKey, row.programName);
    }
  });

  const programs = Array.from(programMap.entries()).map(([key, label]) => ({ key, label }));

  const activityConditions = [
    eq(activityReports.status, "published"),
    eq(activityReports.referenceType, "zakat_period"),
  ];

  if (periodId) {
    activityConditions.push(eq(zakatPeriods.id, periodId));
  }
  if (zakatTypeId) {
    activityConditions.push(eq(zakatTypes.id, zakatTypeId));
  }
  if (program) {
    activityConditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const activities = await db
    .select({
      id: activityReports.id,
      title: activityReports.title,
      activityDate: activityReports.activityDate,
      periodId: zakatPeriods.id,
      periodName: zakatPeriods.name,
      zakatTypeId: zakatTypes.id,
      zakatTypeName: zakatTypes.name,
      programKey: sql<string>`coalesce(${mitra.slug}, 'organization')`,
      programName: sql<string>`coalesce(${mitra.name}, 'Bantuanku')`,
    })
    .from(activityReports)
    .innerJoin(zakatPeriods, eq(activityReports.referenceId, zakatPeriods.id))
    .leftJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .leftJoin(mitra, eq(zakatTypes.createdBy, mitra.userId))
    .where(and(...activityConditions))
    .orderBy(desc(activityReports.activityDate))
    .limit(200);

  return success(c, {
    filters: {
      periods,
      types,
      campaigns: zakatCampaigns,
      programs,
    },
    rows: rows.map((row) => ({
      id: row.id,
      paidAt: row.paidAt,
      donorName: row.donorName,
      amount: Number(row.amount || 0),
      periodId: row.periodId,
      periodName: row.periodName,
      zakatTypeId: row.zakatTypeId,
      zakatTypeName: row.zakatTypeName,
      programKey: row.programKey,
      programName: row.programName,
    })),
    activities: activities.map((row) => ({
      id: row.id,
      title: row.title,
      activityDate: row.activityDate,
      periodId: row.periodId,
      periodName: row.periodName,
      zakatTypeId: row.zakatTypeId,
      zakatTypeName: row.zakatTypeName,
      programKey: row.programKey,
      programName: row.programName,
    })),
  });
});

publicStats.get("/zakat-activities", async (c) => {
  const db = c.get("db");
  const periodId = c.req.query("periodId");
  const zakatTypeId = c.req.query("zakatTypeId");
  const program = c.req.query("program");

  const conditions = [
    eq(activityReports.status, "published"),
    eq(activityReports.referenceType, "zakat_period"),
  ];

  if (periodId) {
    conditions.push(eq(zakatPeriods.id, periodId));
  }
  if (zakatTypeId) {
    conditions.push(eq(zakatTypes.id, zakatTypeId));
  }
  if (program) {
    conditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const rows = await db
    .select({
      id: activityReports.id,
      title: activityReports.title,
      activityDate: activityReports.activityDate,
      referenceType: activityReports.referenceType,
      referenceId: activityReports.referenceId,
      periodId: zakatPeriods.id,
      periodName: zakatPeriods.name,
      zakatTypeId: zakatTypes.id,
      zakatTypeName: zakatTypes.name,
      programKey: sql<string>`coalesce(${mitra.slug}, 'organization')`,
      programName: sql<string>`coalesce(${mitra.name}, 'Bantuanku')`,
    })
    .from(activityReports)
    .innerJoin(zakatPeriods, eq(activityReports.referenceId, zakatPeriods.id))
    .leftJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .leftJoin(mitra, eq(zakatTypes.createdBy, mitra.userId))
    .where(and(...conditions))
    .orderBy(desc(activityReports.activityDate))
    .limit(200);

  const periods = await db
    .select({ id: zakatPeriods.id, name: zakatPeriods.name })
    .from(zakatPeriods)
    .where(eq(zakatPeriods.status, "active"))
    .orderBy(desc(zakatPeriods.year));

  const types = await db
    .select({ id: zakatTypes.id, name: zakatTypes.name })
    .from(zakatTypes)
    .where(eq(zakatTypes.isActive, true))
    .orderBy(zakatTypes.displayOrder);

  const programMap = new Map<string, string>();
  programMap.set("organization", "Bantuanku");
  rows.forEach((row) => {
    if (!programMap.has(row.programKey)) {
      programMap.set(row.programKey, row.programName);
    }
  });
  const programs = Array.from(programMap.entries()).map(([key, label]) => ({ key, label }));

  return success(c, {
    filters: {
      periods,
      types,
      programs,
    },
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      activityDate: row.activityDate,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      periodId: row.periodId,
      periodName: row.periodName,
      zakatTypeId: row.zakatTypeId,
      zakatTypeName: row.zakatTypeName,
      programKey: row.programKey,
      programName: row.programName,
    })),
  });
});

publicStats.get("/qurban-report", async (c) => {
  const db = c.get("db");
  const periodId = c.req.query("periodId");
  const program = c.req.query("program");

  const conditions = [
    eq(transactions.paymentStatus, "paid"),
    eq(transactions.productType, "qurban"),
    eq(transactions.category, "qurban_payment"),
    sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`,
  ];

  if (periodId) {
    conditions.push(eq(qurbanPeriods.id, periodId));
  }
  if (program) {
    conditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const rows = await db
    .select({
      id: transactions.id,
      paidAt: transactions.paidAt,
      donorName: transactions.donorName,
      amount: transactions.totalAmount,
      quantity: transactions.quantity,
      periodId: qurbanPeriods.id,
      periodName: qurbanPeriods.name,
      packageName: qurbanPackages.name,
      animalType: qurbanPackages.animalType,
      programKey: sql<string>`coalesce(${mitra.slug}, 'organization')`,
      programName: sql<string>`coalesce(${mitra.name}, 'Bantuanku')`,
    })
    .from(transactions)
    .innerJoin(qurbanPackagePeriods, eq(transactions.productId, qurbanPackagePeriods.id))
    .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .innerJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .leftJoin(mitra, eq(qurbanPackages.createdBy, mitra.userId))
    .where(and(...conditions))
    .orderBy(desc(transactions.paidAt))
    .limit(200);

  const periods = await db
    .select({ id: qurbanPeriods.id, name: qurbanPeriods.name })
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.status, "active"))
    .orderBy(desc(qurbanPeriods.gregorianYear));

  const programMap = new Map<string, string>();
  programMap.set("organization", "Bantuanku");
  rows.forEach((row) => {
    if (!programMap.has(row.programKey)) {
      programMap.set(row.programKey, row.programName);
    }
  });

  const programs = Array.from(programMap.entries()).map(([key, label]) => ({ key, label }));

  const activityConditions = [
    eq(activityReports.status, "published"),
    eq(activityReports.referenceType, "qurban_period"),
  ];

  if (periodId) {
    activityConditions.push(eq(qurbanPeriods.id, periodId));
  }
  if (program) {
    activityConditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const activities = await db
    .select({
      id: activityReports.id,
      title: activityReports.title,
      activityDate: activityReports.activityDate,
      referenceType: activityReports.referenceType,
      referenceId: activityReports.referenceId,
      periodId: qurbanPeriods.id,
      periodName: qurbanPeriods.name,
      programKey: sql<string>`coalesce(${mitra.slug}, 'organization')`,
      programName: sql<string>`coalesce(${mitra.name}, 'Bantuanku')`,
    })
    .from(activityReports)
    .innerJoin(qurbanPeriods, eq(activityReports.referenceId, qurbanPeriods.id))
    .leftJoin(mitra, eq(qurbanPeriods.mitraId, mitra.id))
    .where(and(...activityConditions))
    .orderBy(desc(activityReports.activityDate))
    .limit(200);

  // --- Disbursements for matching periods ---
  const disbursementConditions: any[] = [
    eq(disbursements.status, "paid"),
    eq(disbursements.referenceType, "qurban_period"),
  ];
  if (periodId) {
    disbursementConditions.push(eq(disbursements.referenceId, periodId));
  }

  const disbursementRows = await db
    .select({
      id: disbursements.id,
      disbursementNumber: disbursements.disbursementNumber,
      recipientName: disbursements.recipientName,
      amount: disbursements.amount,
      category: disbursements.category,
      paidAt: disbursements.paidAt,
      referenceId: disbursements.referenceId,
    })
    .from(disbursements)
    .where(and(...disbursementConditions))
    .orderBy(desc(disbursements.paidAt))
    .limit(200);

  // --- Executions for matching periods ---
  // Get package period IDs for the matching periods
  const ppConditions: any[] = [];
  if (periodId) {
    ppConditions.push(eq(qurbanPackagePeriods.periodId, periodId));
  }
  const ppRows = await db
    .select({ id: qurbanPackagePeriods.id })
    .from(qurbanPackagePeriods)
    .where(ppConditions.length > 0 ? and(...ppConditions) : undefined);
  const ppIds = ppRows.map((p) => p.id);

  let executionRows: any[] = [];
  if (ppIds.length > 0) {
    // Get shared group IDs
    const groupRows = await db
      .select({ id: qurbanSharedGroups.id })
      .from(qurbanSharedGroups)
      .where(inArray(qurbanSharedGroups.packagePeriodId, ppIds));
    const groupIds = groupRows.map((g) => g.id);

    // Get paid transaction IDs
    const txRows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.productType, "qurban"),
          inArray(transactions.productId, ppIds),
          eq(transactions.paymentStatus, "paid"),
          sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`
        )
      );
    const txIds = txRows.map((t) => t.id);

    const { or } = await import("drizzle-orm");
    const exeConditions: any[] = [];
    if (groupIds.length > 0) exeConditions.push(inArray(qurbanExecutions.sharedGroupId, groupIds));
    if (txIds.length > 0) exeConditions.push(inArray(qurbanExecutions.transactionId, txIds));

    if (exeConditions.length > 0) {
      executionRows = await db
        .select({
          id: qurbanExecutions.id,
          executionNumber: qurbanExecutions.executionNumber,
          executionDate: qurbanExecutions.executionDate,
          location: qurbanExecutions.location,
          animalType: qurbanExecutions.animalType,
          animalWeight: qurbanExecutions.animalWeight,
          animalCondition: qurbanExecutions.animalCondition,
          distributionMethod: qurbanExecutions.distributionMethod,
          recipientCount: qurbanExecutions.recipientCount,
          photos: qurbanExecutions.photos,
        })
        .from(qurbanExecutions)
        .where(exeConditions.length === 1 ? exeConditions[0] : or(...exeConditions))
        .orderBy(desc(qurbanExecutions.executionDate))
        .limit(200);
    }
  }

  // --- Stats ---
  const totalGoats = rows.filter((r) => {
    const t = (r.animalType || "").toLowerCase();
    return t === "goat" || t === "kambing";
  }).reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  const totalCows = rows.filter((r) => {
    const t = (r.animalType || "").toLowerCase();
    return t === "cow" || t === "sapi";
  }).reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  return success(c, {
    filters: {
      periods,
      programs,
    },
    stats: {
      totalGoats,
      totalCows,
    },
    rows: rows.map((row) => ({
      id: row.id,
      paidAt: row.paidAt,
      donorName: row.donorName,
      amount: Number(row.amount || 0),
      quantity: Number(row.quantity || 0),
      periodId: row.periodId,
      periodName: row.periodName,
      packageName: row.packageName,
      animalType: row.animalType,
      programKey: row.programKey,
      programName: row.programName,
    })),
    disbursements: disbursementRows.map((d) => ({
      id: d.id,
      disbursementNumber: d.disbursementNumber,
      recipientName: d.recipientName,
      amount: Number(d.amount || 0),
      category: d.category,
      paidAt: d.paidAt,
    })),
    executions: executionRows.map((e: any) => ({
      id: e.id,
      executionNumber: e.executionNumber,
      executionDate: e.executionDate,
      location: e.location,
      animalType: e.animalType,
      animalWeight: e.animalWeight ? Number(e.animalWeight) : null,
      animalCondition: e.animalCondition,
      distributionMethod: e.distributionMethod,
      recipientCount: e.recipientCount,
      photos: e.photos,
    })),
    activities: activities.map((row) => ({
      id: row.id,
      title: row.title,
      activityDate: row.activityDate,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      periodId: row.periodId,
      periodName: row.periodName,
      programKey: row.programKey,
      programName: row.programName,
    })),
  });
});

publicStats.get("/qurban-activities", async (c) => {
  const db = c.get("db");
  const periodId = c.req.query("periodId");
  const program = c.req.query("program");

  const conditions = [
    eq(activityReports.status, "published"),
    eq(activityReports.referenceType, "qurban_period"),
  ];

  if (periodId) {
    conditions.push(eq(qurbanPeriods.id, periodId));
  }
  if (program) {
    conditions.push(sql<boolean>`coalesce(${mitra.slug}, 'organization') = ${program}`);
  }

  const rows = await db
    .select({
      id: activityReports.id,
      title: activityReports.title,
      activityDate: activityReports.activityDate,
      referenceType: activityReports.referenceType,
      referenceId: activityReports.referenceId,
      periodId: qurbanPeriods.id,
      periodName: qurbanPeriods.name,
      programKey: sql<string>`coalesce(${mitra.slug}, 'organization')`,
      programName: sql<string>`coalesce(${mitra.name}, 'Bantuanku')`,
    })
    .from(activityReports)
    .innerJoin(qurbanPeriods, eq(activityReports.referenceId, qurbanPeriods.id))
    .leftJoin(mitra, eq(qurbanPeriods.mitraId, mitra.id))
    .where(and(...conditions))
    .orderBy(desc(activityReports.activityDate))
    .limit(200);

  const periods = await db
    .select({ id: qurbanPeriods.id, name: qurbanPeriods.name })
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.status, "active"))
    .orderBy(desc(qurbanPeriods.gregorianYear));

  const programMap = new Map<string, string>();
  programMap.set("organization", "Bantuanku");
  rows.forEach((row) => {
    if (!programMap.has(row.programKey)) {
      programMap.set(row.programKey, row.programName);
    }
  });
  const programs = Array.from(programMap.entries()).map(([key, label]) => ({ key, label }));

  return success(c, {
    filters: {
      periods,
      programs,
    },
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      activityDate: row.activityDate,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      periodId: row.periodId,
      periodName: row.periodName,
      programKey: row.programKey,
      programName: row.programName,
    })),
  });
});

export default publicStats;
