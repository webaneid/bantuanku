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
  transactions,
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
    totalDisbursed,
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

    // Total amount disbursed (paid disbursements)
    db
      .select({ sum: sql<number>`coalesce(sum(${disbursements.amount}), 0)` })
      .from(disbursements)
      .where(eq(disbursements.status, "paid")),

    // Total active partners (verified/active collaborator state)
    db
      .select({ count: sql<number>`count(*)` })
      .from(mitra)
      .where(inArray(mitra.status, ["verified"])),
  ]);

  return success(c, {
    totalDonors: Number(totalDonors[0]?.count || 0),
    totalCampaigns: Number(totalCampaigns[0]?.count || 0),
    totalDisbursed: Number(totalDisbursed[0]?.sum || 0),
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

  return success(c, {
    filters: {
      periods,
      programs,
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
  });
});

export default publicStats;
