import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql, count, inArray } from "drizzle-orm";
import { donatur, fundraisers, jobTitles, jobCategories, incomeRanges, indonesiaProvinces, indonesiaRegencies, indonesiaDistricts, indonesiaVillages, mustahiqs, entityBankAccounts } from "@bantuanku/db";
import { requireRole } from "../../middleware/auth";
import { success } from "../../lib/response";
import { generateCSV, formatDate, formatCurrency } from "../../services/export";
import type { Env, Variables } from "../../types";

const statistics = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /donatur - Donatur statistics summary
statistics.get("/donatur", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

  // Total donatur terdaftar
  const [totalDonatur] = await db
    .select({ count: count() })
    .from(donatur);

  // Donatur yang pernah donasi (totalDonations > 0)
  const [donaturEverDonated] = await db
    .select({ count: count() })
    .from(donatur)
    .where(sql`${donatur.totalDonations} > 0`);

  // Donatur aktif: pernah donasi DAN donasi terakhir dalam 30 hari
  // Use COALESCE(paid_at, created_at) karena paid_at bisa NULL
  const [donaturActive] = await db
    .select({ count: count() })
    .from(donatur)
    .where(
      sql`${donatur.id} IN (
        SELECT DISTINCT t.donatur_id FROM transactions t
        WHERE t.donatur_id IS NOT NULL
        AND t.payment_status = 'paid'
        AND COALESCE(t.paid_at, t.created_at) >= ${thirtyDaysAgo}
      )`
    );

  // Donatur tidak aktif: belum pernah donasi ATAU donasi terakhir > 30 hari
  const donaturInactive = totalDonatur.count - donaturActive.count;

  // Donatur yang jadi Influencer (via donatur_id OR employee_id linked to donatur)
  const [donaturAsInfluencer] = await db
    .select({ count: count() })
    .from(donatur)
    .where(
      sql`(
        ${donatur.id} IN (SELECT f.donatur_id FROM fundraisers f WHERE f.donatur_id IS NOT NULL)
        OR ${donatur.id} IN (
          SELECT d.id FROM donatur d
          INNER JOIN employees e ON e.user_id = d.user_id
          INNER JOIN fundraisers f ON f.employee_id = e.id
          WHERE d.user_id IS NOT NULL
        )
      )`
    );

  // Total influencer (active)
  const [totalInfluencer] = await db
    .select({ count: count() })
    .from(fundraisers)
    .where(eq(fundraisers.status, "active"));

  // Influencer aktif: punya referral dalam 20 hari terakhir
  const [influencerActive] = await db
    .select({ count: count() })
    .from(fundraisers)
    .where(
      and(
        eq(fundraisers.status, "active"),
        sql`${fundraisers.id} IN (
          SELECT DISTINCT fr.fundraiser_id FROM fundraiser_referrals fr
          WHERE fr.created_at >= ${twentyDaysAgo}
        )`
      )
    );

  // Influencer tidak aktif: active tapi tidak pernah punya referral
  const [influencerNeverShared] = await db
    .select({ count: count() })
    .from(fundraisers)
    .where(
      and(
        eq(fundraisers.status, "active"),
        sql`${fundraisers.id} NOT IN (
          SELECT DISTINCT fr.fundraiser_id FROM fundraiser_referrals fr
        )`
      )
    );

  // Statistik berdasarkan profesi (job title)
  const jobStats = await db
    .select({
      jobTitleName: jobTitles.name,
      categoryName: jobCategories.name,
      count: count(),
    })
    .from(donatur)
    .innerJoin(jobTitles, eq(donatur.jobTitleId, jobTitles.id))
    .leftJoin(jobCategories, eq(jobTitles.categoryId, jobCategories.id))
    .groupBy(jobTitles.name, jobCategories.name)
    .orderBy(desc(count()));

  // Statistik berdasarkan income range
  const incomeStats = await db
    .select({
      label: incomeRanges.label,
      count: count(),
    })
    .from(donatur)
    .innerJoin(incomeRanges, eq(donatur.incomeRangeId, incomeRanges.id))
    .groupBy(incomeRanges.label, incomeRanges.displayOrder)
    .orderBy(incomeRanges.displayOrder);

  // Statistik berdasarkan provinsi
  const provinceStats = await db
    .select({
      name: indonesiaProvinces.name,
      count: count(),
    })
    .from(donatur)
    .innerJoin(indonesiaProvinces, eq(donatur.provinceCode, indonesiaProvinces.code))
    .groupBy(indonesiaProvinces.name)
    .orderBy(desc(count()));

  return success(c, {
    summary: {
      totalDonatur: totalDonatur.count,
      donaturActive: donaturActive.count,
      donaturInactive,
      donaturAsInfluencer: donaturAsInfluencer.count,
      totalInfluencer: totalInfluencer.count,
      influencerActive: influencerActive.count,
      influencerInactive: influencerNeverShared.count,
    },
    jobStats,
    incomeStats,
    provinceStats,
  });
});

// GET /donatur/export - Export donatur to CSV
statistics.get("/donatur/export", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(donatur.createdAt, new Date(startDate)));
  }
  if (endDate) {
    // End of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(donatur.createdAt, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: donatur.id,
      name: donatur.name,
      email: donatur.email,
      phone: donatur.phone,
      whatsappNumber: donatur.whatsappNumber,
      nik: donatur.nik,
      npwp: donatur.npwp,
      gender: donatur.gender,
      birthPlace: donatur.birthPlace,
      birthDate: donatur.birthDate,
      jobTitleName: jobTitles.name,
      jobCategoryName: jobCategories.name,
      incomeRangeLabel: incomeRanges.label,
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      detailAddress: donatur.detailAddress,
      totalDonations: donatur.totalDonations,
      totalAmount: donatur.totalAmount,
      isActive: donatur.isActive,
      lastLoginAt: donatur.lastLoginAt,
      hasAccount: sql<boolean>`(${donatur.userId} IS NOT NULL)`,
      createdAt: donatur.createdAt,
    })
    .from(donatur)
    .leftJoin(jobTitles, eq(donatur.jobTitleId, jobTitles.id))
    .leftJoin(jobCategories, eq(jobTitles.categoryId, jobCategories.id))
    .leftJoin(incomeRanges, eq(donatur.incomeRangeId, incomeRanges.id))
    .leftJoin(indonesiaProvinces, eq(donatur.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(donatur.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(donatur.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(donatur.villageCode, indonesiaVillages.code))
    .where(whereClause)
    .orderBy(desc(donatur.createdAt));

  const columns = [
    { header: "Nama", key: "name" },
    { header: "Email", key: "email" },
    { header: "Telepon", key: "phone" },
    { header: "WhatsApp", key: "whatsappNumber" },
    { header: "NIK", key: "nik" },
    { header: "NPWP", key: "npwp" },
    { header: "Jenis Kelamin", key: "gender", format: (v: unknown) => v === "laki-laki" ? "Laki-laki" : v === "perempuan" ? "Perempuan" : String(v ?? "") },
    { header: "Tempat Lahir", key: "birthPlace" },
    { header: "Tanggal Lahir", key: "birthDate", format: formatDate },
    { header: "Pekerjaan", key: "jobTitleName" },
    { header: "Kategori Pekerjaan", key: "jobCategoryName" },
    { header: "Penghasilan", key: "incomeRangeLabel" },
    { header: "Provinsi", key: "provinceName" },
    { header: "Kabupaten/Kota", key: "regencyName" },
    { header: "Kecamatan", key: "districtName" },
    { header: "Kelurahan/Desa", key: "villageName" },
    { header: "Alamat Detail", key: "detailAddress" },
    { header: "Total Donasi", key: "totalDonations" },
    { header: "Total Nominal", key: "totalAmount", format: formatCurrency },
    { header: "Status", key: "isActive", format: (v: unknown) => v ? "Aktif" : "Nonaktif" },
    { header: "Punya Akun Login", key: "hasAccount", format: (v: unknown) => v ? "Ya" : "Tidak" },
    { header: "Login Terakhir", key: "lastLoginAt", format: formatDate },
    { header: "Terdaftar", key: "createdAt", format: formatDate },
  ];

  const csv = generateCSV(data, columns);

  const filename = startDate && endDate
    ? `donatur-${startDate}-to-${endDate}.csv`
    : `donatur-all-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// GET /mustahiq - Mustahiq statistics summary
statistics.get("/mustahiq", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");

  // Total mustahiq
  const [totalMustahiq] = await db
    .select({ count: count() })
    .from(mustahiqs);

  // Mustahiq penerima manfaat (pernah menerima distribusi)
  const [mustahiqBeneficiary] = await db
    .select({ count: count() })
    .from(mustahiqs)
    .where(
      sql`${mustahiqs.id} IN (
        SELECT DISTINCT zd.mustahiq_id FROM zakat_distributions zd
        WHERE zd.mustahiq_id IS NOT NULL
      )`
    );

  // Statistik berdasarkan asnaf category
  const asnafStats = await db
    .select({
      category: mustahiqs.asnafCategory,
      count: count(),
    })
    .from(mustahiqs)
    .groupBy(mustahiqs.asnafCategory)
    .orderBy(desc(count()));

  // Statistik berdasarkan provinsi
  const provinceStats = await db
    .select({
      name: indonesiaProvinces.name,
      count: count(),
    })
    .from(mustahiqs)
    .innerJoin(indonesiaProvinces, eq(mustahiqs.provinceCode, indonesiaProvinces.code))
    .groupBy(indonesiaProvinces.name)
    .orderBy(desc(count()));

  // Statistik berdasarkan jenis kelamin
  const genderStats = await db
    .select({
      gender: mustahiqs.gender,
      count: count(),
    })
    .from(mustahiqs)
    .where(sql`${mustahiqs.gender} IS NOT NULL AND ${mustahiqs.gender} != ''`)
    .groupBy(mustahiqs.gender)
    .orderBy(desc(count()));

  return success(c, {
    summary: {
      totalMustahiq: totalMustahiq.count,
      mustahiqBeneficiary: mustahiqBeneficiary.count,
    },
    asnafStats,
    provinceStats,
    genderStats,
  });
});

// GET /mustahiq/export - Export mustahiq to CSV
statistics.get("/mustahiq/export", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(mustahiqs.createdAt, new Date(startDate)));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(mustahiqs.createdAt, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: mustahiqs.id,
      mustahiqId: mustahiqs.mustahiqId,
      name: mustahiqs.name,
      asnafCategory: mustahiqs.asnafCategory,
      nationalId: mustahiqs.nationalId,
      gender: mustahiqs.gender,
      birthPlace: mustahiqs.birthPlace,
      dateOfBirth: mustahiqs.dateOfBirth,
      motherName: mustahiqs.motherName,
      maritalStatus: mustahiqs.maritalStatus,
      dependents: mustahiqs.dependents,
      jobTitleName: jobTitles.name,
      jobCategoryName: jobCategories.name,
      incomeRangeLabel: incomeRanges.label,
      email: mustahiqs.email,
      phone: mustahiqs.phone,
      whatsappNumber: mustahiqs.whatsappNumber,
      website: mustahiqs.website,
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      detailAddress: mustahiqs.detailAddress,
      legacyBankName: mustahiqs.bankName,
      legacyBankAccount: mustahiqs.bankAccount,
      legacyBankAccountName: mustahiqs.bankAccountName,
      notes: mustahiqs.notes,
      isActive: mustahiqs.isActive,
      createdAt: mustahiqs.createdAt,
    })
    .from(mustahiqs)
    .leftJoin(jobTitles, eq(mustahiqs.jobTitleId, jobTitles.id))
    .leftJoin(jobCategories, eq(jobTitles.categoryId, jobCategories.id))
    .leftJoin(incomeRanges, eq(mustahiqs.incomeRangeId, incomeRanges.id))
    .leftJoin(indonesiaProvinces, eq(mustahiqs.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(mustahiqs.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(mustahiqs.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(mustahiqs.villageCode, indonesiaVillages.code))
    .where(whereClause)
    .orderBy(desc(mustahiqs.createdAt));

  // Ambil rekening bank dari entity_bank_accounts (data baru), fallback ke kolom legacy
  const mustahiqIds = data.map((m) => m.id);
  const entityBankData = mustahiqIds.length > 0
    ? await db
        .select()
        .from(entityBankAccounts)
        .where(and(
          eq(entityBankAccounts.entityType, "mustahiq"),
          inArray(entityBankAccounts.entityId, mustahiqIds)
        ))
    : [];

  const entityBankMap = new Map<string, typeof entityBankData[0]>();
  entityBankData.forEach((ba) => {
    if (!entityBankMap.has(ba.entityId)) entityBankMap.set(ba.entityId, ba);
  });

  const enrichedData = data.map((m) => {
    const eb = entityBankMap.get(m.id);
    return {
      ...m,
      bankName: eb?.bankName || m.legacyBankName || "",
      bankAccount: eb?.accountNumber || m.legacyBankAccount || "",
      bankAccountName: eb?.accountHolderName || m.legacyBankAccountName || "",
    };
  });

  const maritalLabels: Record<string, string> = {
    menikah: "Menikah",
    belum_menikah: "Belum Menikah",
    janda_cerai_hidup: "Janda (Cerai Hidup)",
    janda_cerai_mati: "Janda (Cerai Mati)",
    duda_cerai_hidup: "Duda (Cerai Hidup)",
    duda_cerai_mati: "Duda (Cerai Mati)",
  };

  const asnafLabels: Record<string, string> = {
    fakir: "Fakir",
    miskin: "Miskin",
    amil: "Amil",
    mualaf: "Mualaf",
    riqab: "Riqab",
    gharim: "Gharim",
    fisabilillah: "Fisabilillah",
    ibnus_sabil: "Ibnus Sabil",
  };

  const columns = [
    { header: "ID Mustahiq", key: "mustahiqId" },
    { header: "Nama", key: "name" },
    { header: "Kategori Asnaf", key: "asnafCategory", format: (v: unknown) => asnafLabels[String(v ?? "")] || String(v ?? "") },
    { header: "NIK", key: "nationalId" },
    { header: "Jenis Kelamin", key: "gender", format: (v: unknown) => v === "laki-laki" ? "Laki-laki" : v === "perempuan" ? "Perempuan" : String(v ?? "") },
    { header: "Tempat Lahir", key: "birthPlace" },
    { header: "Tanggal Lahir", key: "dateOfBirth", format: formatDate },
    { header: "Nama Ibu Kandung", key: "motherName" },
    { header: "Status Perkawinan", key: "maritalStatus", format: (v: unknown) => maritalLabels[String(v ?? "")] || String(v ?? "") },
    { header: "Jumlah Tanggungan", key: "dependents" },
    { header: "Pekerjaan", key: "jobTitleName" },
    { header: "Kategori Pekerjaan", key: "jobCategoryName" },
    { header: "Penghasilan", key: "incomeRangeLabel" },
    { header: "Email", key: "email" },
    { header: "Telepon", key: "phone" },
    { header: "WhatsApp", key: "whatsappNumber" },
    { header: "Website", key: "website" },
    { header: "Provinsi", key: "provinceName" },
    { header: "Kabupaten/Kota", key: "regencyName" },
    { header: "Kecamatan", key: "districtName" },
    { header: "Kelurahan/Desa", key: "villageName" },
    { header: "Alamat Detail", key: "detailAddress" },
    { header: "Bank", key: "bankName" },
    { header: "No Rekening", key: "bankAccount" },
    { header: "Nama Rekening", key: "bankAccountName" },
    { header: "Catatan", key: "notes" },
    { header: "Status", key: "isActive", format: (v: unknown) => v ? "Aktif" : "Nonaktif" },
    { header: "Terdaftar", key: "createdAt", format: formatDate },
  ];

  const csv = generateCSV(enrichedData, columns);

  const filename = startDate && endDate
    ? `mustahiq-${startDate}-to-${endDate}.csv`
    : `mustahiq-all-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

export default statistics;
