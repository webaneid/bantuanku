import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import {
  activityReports,
  transactions,
  settings,
  donatur,
  campaigns,
  zakatPeriods,
  zakatDistributions,
  qurbanPeriods,
  createId,
  generateSlug,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  users,
} from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import { WhatsAppService } from "../../services/whatsapp";
import type { Env, Variables } from "../../types";

// Helper to generate a unique slug for activity reports
const generateUniqueSlug = async (db: any, title: string, excludeId?: string): Promise<string> => {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 0;
  while (true) {
    const existing = await db.query.activityReports.findFirst({
      where: eq(activityReports.slug, slug),
      columns: { id: true },
    });
    if (!existing || existing.id === excludeId) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
};

// Helper to get frontend URL: env first, fallback to organization_website setting
const getFrontendUrl = async (db: any, env?: Env): Promise<string> => {
  if (env?.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/+$/, "");
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "organization_website"),
  });
  return (row?.value || "").replace(/\/+$/, "");
};

// Cek apakah target referensi (campaign/zakat period/zakat distribution/qurban period) masih ada.
// referenceId polymorphic tidak punya FK di DB, jadi laporan bisa menempel ke ID yang sudah
// dihapus tanpa terdeteksi (lihat lesson learned "Audit Activity Reports" 2026-09-22).
const referenceExists = async (db: any, referenceType: string, referenceId: string): Promise<boolean> => {
  switch (referenceType) {
    case "campaign": {
      const row = await db.query.campaigns.findFirst({ where: eq(campaigns.id, referenceId), columns: { id: true } });
      return !!row;
    }
    case "zakat_period": {
      const row = await db.query.zakatPeriods.findFirst({ where: eq(zakatPeriods.id, referenceId), columns: { id: true } });
      return !!row;
    }
    case "zakat_disbursement": {
      const row = await db.query.zakatDistributions.findFirst({ where: eq(zakatDistributions.id, referenceId), columns: { id: true } });
      return !!row;
    }
    case "qurban_period": {
      const row = await db.query.qurbanPeriods.findFirst({ where: eq(qurbanPeriods.id, referenceId), columns: { id: true } });
      return !!row;
    }
    default:
      return false;
  }
};

// Send WA notification without blocking the HTTP response (report publish can have many recipients)
const notifyReportPublished = async (
  db: any,
  env: Env | undefined,
  report: { referenceId: string; referenceName: string | null; title: string; activityDate: Date | string; description: string; slug: string }
): Promise<void> => {
  const wa = new WhatsAppService(db, env?.FRONTEND_URL);
  const frontendUrl = await getFrontendUrl(db, env);
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").substring(0, 200);

  // Only registered donatur can opt out; guest transactions (no donaturId) have no opt-out to honor
  const donorTransactions = await db
    .select({
      donorPhone: transactions.donorPhone,
      donorName: transactions.donorName,
      waOptOut: donatur.waOptOut,
    })
    .from(transactions)
    .leftJoin(donatur, eq(transactions.donaturId, donatur.id))
    .where(and(eq(transactions.productId, report.referenceId), eq(transactions.paymentStatus, "paid")));

  const uniqueDonors = new Map<string, string>();
  for (const tx of donorTransactions) {
    if (tx.donorPhone && tx.waOptOut !== true && !uniqueDonors.has(tx.donorPhone)) {
      uniqueDonors.set(tx.donorPhone, tx.donorName);
    }
  }

  const recipients = Array.from(uniqueDonors.entries()).map(([phone, name]) => ({
    phone,
    variables: {
      customer_name: name,
      product_name: report.referenceName || "",
      report_title: report.title,
      report_date: wa.formatDate(new Date(report.activityDate)),
      report_description: stripHtml(report.description || ""),
      report_url: `${frontendUrl}/laporan/${report.slug}`,
    },
  }));

  if (recipients.length > 0) {
    await wa.sendBulk(recipients, "wa_tpl_report_published");
  }
};

const activityReportsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const createSchema = z.object({
  referenceType: z.enum(["campaign", "zakat_period", "zakat_disbursement", "qurban_period"]),
  referenceId: z.string(),
  referenceName: z.string().optional(),
  title: z.string().min(10, "Judul harus minimal 10 karakter").max(200, "Judul maksimal 200 karakter"),
  activityDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal kegiatan tidak valid"),
  description: z.string().min(50, "Deskripsi harus minimal 50 karakter"),
  gallery: z.array(z.string()).max(20).optional().default([]),
  videoUrl: z.preprocess((val) => val === '' ? null : val, z.string().url("URL video tidak valid").nullable().optional()),
  typeSpecificData: z.record(z.any()).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  // Address - Indonesia Address System
  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  postalCode: z.string().optional().nullable(), // From AddressForm, not stored in DB
  // SEO fields
  focusKeyphrase: z.string().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  canonicalUrl: z.string().optional(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(160).optional(),
  ogImageUrl: z.string().optional(),
  seoScore: z.number().optional(),
});

const updateSchema = createSchema.partial().extend({
  slug: z.string().regex(SLUG_PATTERN, "Slug hanya boleh huruf kecil, angka, dan tanda hubung").optional(),
});

// GET /admin/activity-reports - List all activity reports
activityReportsAdmin.get("/", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const referenceType = c.req.query("reference_type");
  const referenceId = c.req.query("reference_id");
  const status = c.req.query("status");

  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");

  const conditions = [];

  // Program coordinator can only see reports they created
  if (isCoordinator) {
    conditions.push(eq(activityReports.createdBy, user!.id));
  }

  if (referenceType) {
    conditions.push(eq(activityReports.referenceType, referenceType));
  }
  if (referenceId) {
    conditions.push(eq(activityReports.referenceId, referenceId));
  }
  if (status) {
    conditions.push(eq(activityReports.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db.query.activityReports.findMany({
    where: whereClause,
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [desc(activityReports.activityDate)],
  });

  return success(c, results);
});

// GET /admin/activity-reports/:id - Get single activity report
activityReportsAdmin.get("/:id", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const results = await db
    .select({
      id: activityReports.id,
      slug: activityReports.slug,
      referenceType: activityReports.referenceType,
      referenceId: activityReports.referenceId,
      referenceName: activityReports.referenceName,
      title: activityReports.title,
      activityDate: activityReports.activityDate,
      description: activityReports.description,
      gallery: activityReports.gallery,
      videoUrl: activityReports.videoUrl,
      typeSpecificData: activityReports.typeSpecificData,
      status: activityReports.status,
      publishedAt: activityReports.publishedAt,
      createdBy: activityReports.createdBy,
      createdAt: activityReports.createdAt,
      updatedAt: activityReports.updatedAt,
      campaignId: activityReports.campaignId,
      // Address fields
      detailAddress: activityReports.detailAddress,
      provinceCode: activityReports.provinceCode,
      regencyCode: activityReports.regencyCode,
      districtCode: activityReports.districtCode,
      villageCode: activityReports.villageCode,
      // Address names from joins
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      villagePostalCode: indonesiaVillages.postalCode,
      // SEO
      focusKeyphrase: activityReports.focusKeyphrase,
      metaTitle: activityReports.metaTitle,
      metaDescription: activityReports.metaDescription,
      canonicalUrl: activityReports.canonicalUrl,
      noIndex: activityReports.noIndex,
      noFollow: activityReports.noFollow,
      ogTitle: activityReports.ogTitle,
      ogDescription: activityReports.ogDescription,
      ogImageUrl: activityReports.ogImageUrl,
      seoScore: activityReports.seoScore,
      // Creator
      creatorName: users.name,
      creatorEmail: users.email,
    })
    .from(activityReports)
    .leftJoin(indonesiaProvinces, eq(activityReports.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(activityReports.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(activityReports.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(activityReports.villageCode, indonesiaVillages.code))
    .leftJoin(users, eq(activityReports.createdBy, users.id))
    .where(eq(activityReports.id, id))
    .limit(1);

  if (!results || results.length === 0) {
    return error(c, "Activity report not found", 404);
  }

  const row = results[0];

  // Reshape to include nested creator object for backward compatibility
  const report = {
    ...row,
    creator: row.creatorName ? { id: row.createdBy, name: row.creatorName, email: row.creatorEmail } : null,
  };
  // Remove flat creator fields
  delete (report as any).creatorName;
  delete (report as any).creatorEmail;

  // Program coordinator can only view their own reports
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator && report.createdBy !== user!.id) {
    return error(c, "Activity report not found", 404);
  }

  return success(c, report);
});

// POST /admin/activity-reports - Create new activity report
activityReportsAdmin.post("/", requireRole("super_admin", "admin_campaign", "program_coordinator"), zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  if (!(await referenceExists(db, body.referenceType, body.referenceId))) {
    return error(c, "Referensi (campaign/periode) yang dipilih tidak ditemukan", 400);
  }

  const slug = await generateUniqueSlug(db, body.title);

  const [report] = await db
    .insert(activityReports)
    .values({
      id: createId(),
      slug,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      referenceName: body.referenceName || null,
      title: body.title,
      activityDate: new Date(body.activityDate),
      description: body.description,
      gallery: body.gallery || [],
      videoUrl: body.videoUrl || null,
      typeSpecificData: body.typeSpecificData || null,
      status: body.status || "draft",
      publishedAt: body.status === "published" ? new Date() : null,
      createdBy: user!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Address fields
      detailAddress: body.detailAddress || null,
      provinceCode: body.provinceCode || null,
      regencyCode: body.regencyCode || null,
      districtCode: body.districtCode || null,
      villageCode: body.villageCode || null,
      // SEO fields
      focusKeyphrase: body.focusKeyphrase || null,
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
      canonicalUrl: body.canonicalUrl || null,
      noIndex: body.noIndex || false,
      noFollow: body.noFollow || false,
      ogTitle: body.ogTitle || null,
      ogDescription: body.ogDescription || null,
      ogImageUrl: body.ogImageUrl || null,
      seoScore: body.seoScore || 0,
    })
    .returning();

  // WhatsApp notification: laporan kegiatan dipublikasikan — dijalankan di background
  // agar tidak memblokir response saat penerima banyak (lihat CLAUDE.md 2026-07-06)
  if (report.status === "published" && report.referenceId) {
    const env = c.env;
    setImmediate(() => {
      notifyReportPublished(db, env, report).catch((err) => {
        console.error("WA report-published notification error:", err);
      });
    });
  }

  return success(c, report, "Activity report created successfully", 201);
});

// PUT /admin/activity-reports/:id - Update activity report
activityReportsAdmin.put("/:id", requireRole("super_admin", "admin_campaign", "program_coordinator"), zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
  });

  if (!existing) {
    return error(c, "Activity report not found", 404);
  }

  // Program coordinator can only update their own reports (mirror GET :id guard)
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator && existing.createdBy !== user!.id) {
    return error(c, "Activity report not found", 404);
  }

  if (body.referenceType || body.referenceId) {
    const newReferenceType = body.referenceType || existing.referenceType;
    const newReferenceId = body.referenceId || existing.referenceId;
    if (!(await referenceExists(db, newReferenceType, newReferenceId))) {
      return error(c, "Referensi (campaign/periode) yang dipilih tidak ditemukan", 400);
    }
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.referenceType) updateData.referenceType = body.referenceType;
  if (body.referenceId) updateData.referenceId = body.referenceId;
  if (body.referenceName !== undefined) updateData.referenceName = body.referenceName;
  // Slug tidak lagi auto-regenerate saat title berubah — URL yang sudah dibagikan (WA, sitemap,
  // Google) tetap stabil. Ubah slug hanya lewat field `slug` eksplisit (tombol "Ubah URL" di admin).
  if (body.title) updateData.title = body.title;
  if (body.slug !== undefined && body.slug !== existing.slug) {
    const slugTaken = await db.query.activityReports.findFirst({
      where: eq(activityReports.slug, body.slug),
      columns: { id: true },
    });
    if (slugTaken && slugTaken.id !== id) {
      return error(c, "Slug/URL sudah dipakai laporan lain, gunakan slug lain", 409);
    }
    updateData.slug = body.slug;
  }
  if (body.activityDate) updateData.activityDate = new Date(body.activityDate);
  if (body.description) updateData.description = body.description;
  if (body.gallery !== undefined) updateData.gallery = body.gallery;
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.typeSpecificData !== undefined) updateData.typeSpecificData = body.typeSpecificData;
  // Address fields
  if (body.detailAddress !== undefined) updateData.detailAddress = body.detailAddress || null;
  if (body.provinceCode !== undefined) updateData.provinceCode = body.provinceCode || null;
  if (body.regencyCode !== undefined) updateData.regencyCode = body.regencyCode || null;
  if (body.districtCode !== undefined) updateData.districtCode = body.districtCode || null;
  if (body.villageCode !== undefined) updateData.villageCode = body.villageCode || null;
  // SEO fields
  if (body.focusKeyphrase !== undefined) updateData.focusKeyphrase = body.focusKeyphrase || null;
  if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle || null;
  if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription || null;
  if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl || null;
  if (body.noIndex !== undefined) updateData.noIndex = body.noIndex;
  if (body.noFollow !== undefined) updateData.noFollow = body.noFollow;
  if (body.ogTitle !== undefined) updateData.ogTitle = body.ogTitle || null;
  if (body.ogDescription !== undefined) updateData.ogDescription = body.ogDescription || null;
  if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl || null;
  if (body.seoScore !== undefined) updateData.seoScore = body.seoScore;
  if (body.status) {
    updateData.status = body.status;
    if (body.status !== "published") {
      updateData.publishedAt = null;
    } else if (existing.status !== "published") {
      updateData.publishedAt = new Date();
    }
  }

  const [updated] = await db
    .update(activityReports)
    .set(updateData)
    .where(eq(activityReports.id, id))
    .returning();

  // WhatsApp notification: hanya saat status BERUBAH ke published, dijalankan di background
  if (body.status === "published" && existing.status !== "published" && updated.referenceId) {
    const env = c.env;
    setImmediate(() => {
      notifyReportPublished(db, env, updated).catch((err) => {
        console.error("WA report-published notification error:", err);
      });
    });
  }

  return success(c, updated, "Activity report updated successfully");
});

// DELETE /admin/activity-reports/:id - Delete activity report
activityReportsAdmin.delete("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
  });

  if (!existing) {
    return error(c, "Activity report not found", 404);
  }

  await db.delete(activityReports).where(eq(activityReports.id, id));

  return success(c, null, "Activity report deleted successfully");
});

export default activityReportsAdmin;
