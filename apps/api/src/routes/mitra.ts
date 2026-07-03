import { Hono } from "hono";
import {
  mitra,
  entityBankAccounts,
  campaigns,
  zakatTypes,
  qurbanPackages,
  qurbanPackagePeriods,
  qurbanPeriods,
  media as mediaTable,
  settings as settingsTable,
  createId,
  generateSlug,
  type MediaVariant,
} from "@bantuanku/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import * as fs from "fs";
import * as pathModule from "path";
import { normalizeContactData } from "../lib/contact-helpers";
import { success, error } from "../lib/response";
import { uploadToGCS, generateGCSPath, type GCSConfig } from "../lib/gcs";
import { processSingleWebp } from "../lib/image-processor";
import type { Env, Variables } from "../types";

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const PDF_MAX_SIZE = 10 * 1024 * 1024;

const sanitizeDocName = (value: string): string =>
  value.toLowerCase().replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const fetchCDNConfig = async (db: any): Promise<GCSConfig | null> => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.category, "cdn"));
    if (rows.find((s: any) => s.key === "cdn_enabled")?.value !== "true") return null;
    const cfg: GCSConfig = {
      bucketName: rows.find((s: any) => s.key === "gcs_bucket_name")?.value || "",
      projectId: rows.find((s: any) => s.key === "gcs_project_id")?.value || "",
      clientEmail: rows.find((s: any) => s.key === "gcs_client_email")?.value || "",
      privateKey: rows.find((s: any) => s.key === "gcs_private_key")?.value || "",
    };
    if (!cfg.bucketName || !cfg.projectId || !cfg.clientEmail || !cfg.privateKey) return null;
    return cfg;
  } catch { return null; }
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schema for public registration
const mitraRegisterSchema = z.object({
  name: z.string().min(3, "Nama lembaga minimal 3 karakter"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),

  picName: z.string().min(2, "Nama penanggung jawab minimal 2 karakter"),
  picPosition: z.string().optional(),

  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10).optional(),
  whatsappNumber: z.string().min(10).optional(),
  website: z.string().optional(),

  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),

  ktpUrl: z.string().optional(),
  bankBookUrl: z.string().optional(),
  npwpUrl: z.string().optional(),

  bankAccounts: z.array(z.object({
    bankName: z.string().min(1, "Nama bank wajib diisi"),
    accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
    accountHolderName: z.string().min(1, "Nama pemilik wajib diisi"),
  })).optional(),
});

// POST /mitra/register - Public registration (no auth)
app.post("/register", async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();
    const validated = mitraRegisterSchema.parse(body);

    const { bankAccounts, ...data } = validated;

    // Normalize kontak
    const normalized = normalizeContactData(data);

    // Generate slug
    let slug = generateSlug(data.name);
    const existingSlug = await db.query.mitra.findFirst({
      where: eq(mitra.slug, slug),
    });
    if (existingSlug) {
      slug = slug + "-" + createId().slice(0, 4);
    }

    const cleanData: any = {
      ...normalized,
      slug,
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      ktpUrl: data.ktpUrl || null,
      bankBookUrl: data.bankBookUrl || null,
      npwpUrl: data.npwpUrl || null,
      logoUrl: data.logoUrl || null,
      status: "pending",
    };

    const [newMitra] = await db.insert(mitra).values(cleanData).returning();

    // Insert bank accounts
    if (bankAccounts && bankAccounts.length > 0) {
      const bankAccountsToInsert = bankAccounts.map((account) => ({
        entityType: "mitra",
        entityId: newMitra.id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
      }));
      await db.insert(entityBankAccounts).values(bankAccountsToInsert);
    }

    return success(c, {
      id: newMitra.id,
      name: newMitra.name,
      slug: newMitra.slug,
    }, "Pendaftaran mitra berhasil. Menunggu verifikasi admin.", 201);
  } catch (err: any) {
    console.error("Error registering mitra:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Gagal mendaftarkan mitra", 500);
  }
});

// GET /mitra/check-slug/:slug - Check if slug is taken
app.get("/check-slug/:slug", async (c) => {
  try {
    const db = c.get("db");
    const slug = c.req.param("slug");

    const existing = await db.query.mitra.findFirst({
      where: eq(mitra.slug, slug),
    });

    return success(c, { available: !existing });
  } catch (err: any) {
    console.error("Error checking slug:", err);
    return error(c, "Failed to check slug", 500);
  }
});

// GET /mitra/:slug - Public mitra profile
app.get("/:slug", async (c) => {
  try {
    const db = c.get("db");
    const slug = c.req.param("slug");

    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.slug, slug),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        website: true,
        detailAddress: true,
        provinceCode: true,
        regencyCode: true,
        districtCode: true,
        villageCode: true,
        status: true,
        userId: true,
      },
    });

    if (!mitraRecord || mitraRecord.status !== "verified") {
      return error(c, "Mitra tidak ditemukan", 404);
    }

    // Fetch active campaigns by this mitra
    const mitraCampaigns = await db.query.campaigns.findMany({
      where: and(
        eq(campaigns.mitraId, mitraRecord.id),
        eq(campaigns.status, "active")
      ),
      orderBy: [desc(campaigns.createdAt)],
      columns: {
        id: true,
        title: true,
        slug: true,
        description: true,
        imageUrl: true,
        goal: true,
        collected: true,
        donorCount: true,
        categoryId: true,
        category: true,
        pillar: true,
        isFeatured: true,
        isUrgent: true,
        endDate: true,
        createdAt: true,
      },
    });

    // Fetch active zakat types owned by this mitra (created by mitra user)
    const mitraZakatTypes = mitraRecord.userId
      ? await db.query.zakatTypes.findMany({
          where: and(
            eq(zakatTypes.createdBy, mitraRecord.userId),
            eq(zakatTypes.isActive, true)
          ),
          orderBy: [zakatTypes.displayOrder, desc(zakatTypes.createdAt)],
          columns: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            icon: true,
            hasCalculator: true,
            calculatorType: true,
            fitrahAmount: true,
            isActive: true,
            displayOrder: true,
            createdAt: true,
          },
        })
      : [];

    // Fetch active qurban package-periods owned by this mitra (created by mitra user)
    const mitraQurbanPackages = mitraRecord.userId
      ? await db
          .select({
            packagePeriodId: qurbanPackagePeriods.id,
            id: qurbanPackages.id,
            periodId: qurbanPeriods.id,
            periodName: qurbanPeriods.name,
            periodEndDate: qurbanPeriods.endDate,
            periodExecutionDate: qurbanPeriods.executionDate,
            animalType: qurbanPackages.animalType,
            packageType: qurbanPackages.packageType,
            name: qurbanPackages.name,
            description: qurbanPackages.description,
            imageUrl: qurbanPackages.imageUrl,
            price: qurbanPackagePeriods.price,
            maxSlots: qurbanPackages.maxSlots,
            slotsFilled: qurbanPackagePeriods.slotsFilled,
            stock: qurbanPackagePeriods.stock,
            stockSold: qurbanPackagePeriods.stockSold,
            isFeatured: qurbanPackages.isFeatured,
            executionDateOverride: qurbanPackagePeriods.executionDateOverride,
            executionTimeNote: qurbanPackagePeriods.executionTimeNote,
            executionLocation: qurbanPackagePeriods.executionLocation,
            executionNotes: qurbanPackagePeriods.executionNotes,
          })
          .from(qurbanPackagePeriods)
          .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
          .innerJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
          .where(
            and(
              eq(qurbanPackages.createdBy, mitraRecord.userId),
              eq(qurbanPackages.isAvailable, true),
              eq(qurbanPackagePeriods.isAvailable, true),
              eq(qurbanPeriods.status, "active")
            )
          )
          .orderBy(desc(qurbanPeriods.gregorianYear), desc(qurbanPackagePeriods.createdAt))
      : [];

    return success(c, {
      ...mitraRecord,
      campaigns: mitraCampaigns,
      zakatTypes: mitraZakatTypes,
      qurbanPackages: mitraQurbanPackages,
    });
  } catch (err: any) {
    console.error("Error fetching mitra profile:", err);
    return error(c, "Gagal memuat profil mitra", 500);
  }
});

// POST /mitra/upload-document - Public document upload for registration (no auth)
// Category fixed as "document": accepts image or PDF, no multi-variant processing
app.post("/upload-document", async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.parseBody();
    const file = body["file"] as File;

    if (!file || typeof file === "string") {
      return error(c, "File wajib diupload", 400);
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      return error(c, "Hanya file gambar atau PDF yang diperbolehkan", 400);
    }
    if (isImage && file.size > IMAGE_MAX_SIZE) {
      return error(c, "Ukuran gambar maksimal 5MB", 400);
    }
    if (isPdf && file.size > PDF_MAX_SIZE) {
      return error(c, "Ukuran PDF maksimal 10MB", 400);
    }

    const id = createId();
    const timestamp = Date.now();
    const baseName = sanitizeDocName(file.name) || "dokumen";
    const uploadsDir = pathModule.join(process.cwd(), "uploads");
    ensureDir(uploadsDir);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cdnConfig = await fetchCDNConfig(db);

    const uploadBinary = async (payload: Buffer, filename: string, mime: string): Promise<{ path: string; url: string }> => {
      if (cdnConfig) {
        try {
          const gcsPath = generateGCSPath(filename);
          const gcsUrl = await uploadToGCS(cdnConfig, payload, gcsPath, mime);
          return { path: gcsUrl, url: gcsUrl };
        } catch { /* fallback to local */ }
      }
      const localPath = `/uploads/${filename}`;
      fs.writeFileSync(pathModule.join(uploadsDir, filename), payload);
      if (!global.uploadedFiles) global.uploadedFiles = new Map();
      global.uploadedFiles.set(filename, payload);
      return { path: localPath, url: localPath };
    };

    let finalFilename: string;
    let path: string;
    let fullUrl: string;
    let mimeType = file.type;
    let finalSize = file.size;
    let finalWidth: number | null = null;
    let finalHeight: number | null = null;
    let variants: Record<string, MediaVariant> | null = null;

    if (isPdf) {
      finalFilename = `${timestamp}-${id}-${baseName}.pdf`;
      const uploaded = await uploadBinary(buffer, finalFilename, file.type);
      path = uploaded.path;
      fullUrl = uploaded.url;
    } else {
      const processed = await processSingleWebp(buffer);
      finalFilename = `${timestamp}-${id}-${baseName}-original.webp`;
      const uploaded = await uploadBinary(processed.buffer, finalFilename, processed.mimeType);
      path = uploaded.path;
      fullUrl = uploaded.url;
      mimeType = processed.mimeType;
      finalSize = processed.size;
      finalWidth = processed.width;
      finalHeight = processed.height;
      variants = {
        original: {
          variant: "original",
          width: processed.width,
          height: processed.height,
          mimeType: processed.mimeType,
          size: processed.size,
          path: uploaded.path,
          url: uploaded.url,
        },
      };
    }

    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
    const responseUrl = fullUrl.startsWith("http") ? fullUrl : `${apiUrl}${fullUrl}`;

    await db.insert(mediaTable).values({
      id,
      filename: finalFilename,
      originalName: file.name,
      mimeType,
      size: finalSize,
      url: path,
      path,
      width: finalWidth,
      height: finalHeight,
      variants,
      folder: cdnConfig ? "gcs" : "uploads",
      category: "document",
      uploadedBy: null,
    });

    return success(c, { url: responseUrl }, "Dokumen berhasil diupload");
  } catch (err: any) {
    console.error("Error uploading mitra document:", err);
    return error(c, "Gagal mengupload dokumen", 500);
  }
});

export default app;
