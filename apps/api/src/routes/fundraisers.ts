import { Hono } from "hono";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  fundraisers,
  fundraiserReferrals,
  disbursements,
  donatur,
  employees,
  transactions,
  settings,
  entityBankAccounts,
  campaigns,
  zakatTypes,
  qurbanPackages,
  createId,
} from "@bantuanku/db";
import { success, error, paginated } from "../lib/response";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";
import { DisbursementService } from "../services/disbursement";
import { z } from "zod";
import { setCookie, getCookie } from "hono/cookie";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Helper: generate fundraiser code FRS6200001, FRS6200002, ...
async function generateFundraiserCode(db: any): Promise<string> {
  const [result] = await db
    .select({ total: sql<number>`count(*)` })
    .from(fundraisers);
  const seq = Number(result?.total || 0) + 1;
  return `FRS62${String(seq).padStart(5, "0")}`;
}

// Helper: get fundraiser commission percentage from settings
async function getFundraiserCommission(db: any): Promise<string> {
  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, "amil_fundraiser_percentage"),
  });
  return setting?.value || "5.00";
}

async function getDefaultSourceBankFromSettings(db: any) {
  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
  const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

  if (!bankAccountsSetting?.value) {
    throw new Error("Rekening sumber belum dikonfigurasi admin");
  }

  let bankAccounts: any[] = [];
  try {
    bankAccounts = JSON.parse(bankAccountsSetting.value);
  } catch {
    throw new Error("Konfigurasi rekening sumber tidak valid");
  }

  if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
    throw new Error("Rekening sumber belum tersedia");
  }

  const preferred = bankAccounts.find((acc: any) => {
    const programs = Array.isArray(acc.programs) && acc.programs.length > 0 ? acc.programs : ["general"];
    return programs.includes("general");
  });

  return preferred || bankAccounts[0];
}

// GET /fundraisers/validate/:code - Public: validate code
app.get("/validate/:code", async (c) => {
  const db = c.get("db");
  const code = c.req.param("code").toUpperCase();

  const fundraiser = await db
    .select({
      id: fundraisers.id,
      code: fundraisers.code,
      status: fundraisers.status,
      donaturName: donatur.name,
      employeeName: employees.name,
    })
    .from(fundraisers)
    .leftJoin(donatur, eq(fundraisers.donaturId, donatur.id))
    .leftJoin(employees, eq(fundraisers.employeeId, employees.id))
    .where(eq(fundraisers.code, code))
    .limit(1);

  if (!fundraiser.length || fundraiser[0].status !== "active") {
    return error(c, "Kode fundraiser tidak valid", 404);
  }

  return success(c, {
    code: fundraiser[0].code,
    name: fundraiser[0].donaturName || fundraiser[0].employeeName,
    valid: true,
  });
});

// POST /fundraisers/track-referral - Public: track referral click
app.post("/track-referral", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const code = (body.code || "").toUpperCase();

  if (!code) {
    return error(c, "Kode fundraiser wajib diisi", 400);
  }

  const fundraiser = await db.query.fundraisers.findFirst({
    where: and(
      eq(fundraisers.code, code),
      eq(fundraisers.status, "active")
    ),
  });

  if (!fundraiser) {
    return error(c, "Kode fundraiser tidak valid", 404);
  }

  // Get cookie duration from settings
  let cookieDays = 30;
  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, "fundraiser_cookie_days"),
  });
  if (setting?.value) {
    cookieDays = parseInt(setting.value) || 30;
  }

  // Set cookie (last-click attribution)
  setCookie(c, "fundraiser_ref", code, {
    maxAge: cookieDays * 24 * 60 * 60,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });

  return success(c, { tracked: true, code });
});

// --- Auth-required routes below ---

// POST /fundraisers/register - Register as fundraiser
app.post("/register", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  // Find donatur by user email/phone
  const userDetails = await db.query.users.findFirst({
    where: eq(donatur.id, user!.id),
  });

  // Try to find donatur linked to this user
  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.email, user!.email || ""),
  });

  if (!donaturRecord) {
    return error(c, "Anda harus terdaftar sebagai donatur terlebih dahulu", 400);
  }

  // Check if already registered
  const existing = await db.query.fundraisers.findFirst({
    where: eq(fundraisers.donaturId, donaturRecord.id),
  });
  if (existing) {
    return error(c, "Anda sudah terdaftar sebagai fundraiser", 400);
  }

  // Check auto-approve setting
  let autoApprove = true;
  const autoApproveSetting = await db.query.settings.findFirst({
    where: eq(settings.key, "fundraiser_auto_approve"),
  });
  if (autoApproveSetting?.value === "false") {
    autoApprove = false;
  }

  // Get default commission from settings
  const commissionPercentage = await getFundraiserCommission(db);

  // Generate unique code
  const code = await generateFundraiserCode(db);

  const [created] = await db
    .insert(fundraisers)
    .values({
      donaturId: donaturRecord.id,
      code,
      slug: code.toLowerCase(),
      status: autoApprove ? "active" : "pending",
      approvedAt: autoApprove ? new Date() : null,
      commissionPercentage,
    })
    .returning();

  return success(c, created, autoApprove
    ? "Selamat! Anda terdaftar sebagai fundraiser"
    : "Pendaftaran berhasil, menunggu persetujuan admin",
    201
  );
});

// GET /fundraisers/me - Get own fundraiser data
app.get("/me", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  // Find donatur
  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.email, user!.email || ""),
  });

  if (!donaturRecord) {
    return error(c, "Donatur tidak ditemukan", 404);
  }

  const [fundraiser] = await db
    .select()
    .from(fundraisers)
    .where(eq(fundraisers.donaturId, donaturRecord.id))
    .limit(1);

  if (!fundraiser) {
    return error(c, "Anda belum terdaftar sebagai fundraiser", 404);
  }

  // Get bank accounts
  const bankAccounts = await db
    .select()
    .from(entityBankAccounts)
    .where(
      and(
        eq(entityBankAccounts.entityType, "donatur"),
        eq(entityBankAccounts.entityId, donaturRecord.id)
      )
    );

  return success(c, { ...fundraiser, bankAccounts });
});

// GET /fundraisers/me/referrals - Get own referrals
app.get("/me/referrals", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  // Find donatur
  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.email, user!.email || ""),
  });

  if (!donaturRecord) {
    return error(c, "Donatur tidak ditemukan", 404);
  }

  const fundraiser = await db.query.fundraisers.findFirst({
    where: eq(fundraisers.donaturId, donaturRecord.id),
  });

  if (!fundraiser) {
    return error(c, "Anda belum terdaftar sebagai fundraiser", 404);
  }

  const list = await db
    .select({
      id: fundraiserReferrals.id,
      donationAmount: fundraiserReferrals.donationAmount,
      commissionPercentage: fundraiserReferrals.commissionPercentage,
      commissionAmount: fundraiserReferrals.commissionAmount,
      status: fundraiserReferrals.status,
      createdAt: fundraiserReferrals.createdAt,
      productName: transactions.productName,
      donorName: transactions.donorName,
    })
    .from(fundraiserReferrals)
    .leftJoin(transactions, eq(fundraiserReferrals.transactionId, transactions.id))
    .where(eq(fundraiserReferrals.fundraiserId, fundraiser.id))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(fundraiserReferrals.createdAt));

  const [countResult] = await db
    .select({ total: sql<number>`count(*)` })
    .from(fundraiserReferrals)
    .where(eq(fundraiserReferrals.fundraiserId, fundraiser.id));

  return paginated(c, list, {
    page,
    limit,
    total: Number(countResult?.total || 0),
  });
});

// GET /fundraisers/me/disbursement-availability - Availability for fundraiser payout
app.get("/me/disbursement-availability", authMiddleware, async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    const donaturRecord = await db.query.donatur.findFirst({
      where: eq(donatur.email, user!.email || ""),
    });

    if (!donaturRecord) {
      return error(c, "Donatur tidak ditemukan", 404);
    }

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.donaturId, donaturRecord.id),
    });

    if (!fundraiser) {
      return error(c, "Anda belum terdaftar sebagai fundraiser", 404);
    }

    const bankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "donatur"),
          eq(entityBankAccounts.entityId, donaturRecord.id)
        )
      )
      .orderBy(desc(entityBankAccounts.createdAt));

    const service = new DisbursementService(db);
    const availability = await service.getRevenueShareAvailability("revenue_share_fundraiser", fundraiser.id);
    let sourceBank: any = null;
    try {
      sourceBank = await getDefaultSourceBankFromSettings(db);
    } catch {
      sourceBank = null;
    }

    return success(c, {
      availability,
      fundraiser: {
        id: fundraiser.id,
        code: fundraiser.code,
        status: fundraiser.status,
      },
      recipient: {
        name: donaturRecord.name || fundraiser.code,
        contact: donaturRecord.phone || "",
        bankAccount: bankAccounts[0] || null,
      },
      sourceBank: sourceBank
        ? {
            id: sourceBank.id,
            bankName: sourceBank.bankName,
            accountNumber: sourceBank.accountNumber,
            accountName: sourceBank.accountName,
          }
        : null,
      canSubmit: fundraiser.status === "active" && bankAccounts.length > 0,
    });
  } catch (err: any) {
    console.error("Error fetching fundraiser disbursement availability:", err);
    return error(c, err.message || "Gagal memuat data pencairan", 500);
  }
});

// GET /fundraisers/me/disbursements - List own fundraiser disbursements
app.get("/me/disbursements", authMiddleware, async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;

    const donaturRecord = await db.query.donatur.findFirst({
      where: eq(donatur.email, user!.email || ""),
    });

    if (!donaturRecord) {
      return error(c, "Donatur tidak ditemukan", 404);
    }

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.donaturId, donaturRecord.id),
    });

    if (!fundraiser) {
      return error(c, "Anda belum terdaftar sebagai fundraiser", 404);
    }

    const whereClause = and(
      eq(disbursements.disbursementType, "revenue_share"),
      eq(disbursements.category, "revenue_share_fundraiser"),
      eq(disbursements.recipientType, "fundraiser"),
      eq(disbursements.recipientId, fundraiser.id)
    );

    const list = await db
      .select({
        id: disbursements.id,
        disbursementNumber: disbursements.disbursementNumber,
        disbursementType: disbursements.disbursementType,
        category: disbursements.category,
        recipientName: disbursements.recipientName,
        recipientBankName: disbursements.recipientBankName,
        recipientBankAccount: disbursements.recipientBankAccount,
        recipientBankAccountName: disbursements.recipientBankAccountName,
        amount: disbursements.amount,
        transferredAmount: disbursements.transferredAmount,
        status: disbursements.status,
        sourceBankName: disbursements.sourceBankName,
        sourceBankAccount: disbursements.sourceBankAccount,
        transferProofUrl: disbursements.transferProofUrl,
        transferDate: disbursements.transferDate,
        submittedAt: disbursements.submittedAt,
        approvedAt: disbursements.approvedAt,
        paidAt: disbursements.paidAt,
        createdAt: disbursements.createdAt,
      })
      .from(disbursements)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(disbursements.createdAt));

    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(disbursements)
      .where(whereClause);

    return paginated(c, list, {
      page,
      limit,
      total: Number(countResult?.total || 0),
    });
  } catch (err: any) {
    console.error("Error fetching fundraiser disbursements:", err);
    return error(c, err.message || "Gagal memuat riwayat pencairan", 500);
  }
});

// POST /fundraisers/me/disbursements - Create & submit disbursement request
app.post("/me/disbursements", authMiddleware, async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    const bodySchema = z.object({
      amount: z.coerce.number().positive("Jumlah dana wajib lebih dari 0"),
      purpose: z.string().min(3, "Tujuan pencairan wajib diisi"),
      notes: z.string().optional(),
    });
    const body = bodySchema.parse(await c.req.json());

    const donaturRecord = await db.query.donatur.findFirst({
      where: eq(donatur.email, user!.email || ""),
    });

    if (!donaturRecord) {
      return error(c, "Donatur tidak ditemukan", 404);
    }

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.donaturId, donaturRecord.id),
    });

    if (!fundraiser) {
      return error(c, "Anda belum terdaftar sebagai fundraiser", 404);
    }

    if (fundraiser.status !== "active") {
      return error(c, "Fundraiser harus aktif untuk mengajukan pencairan", 400);
    }

    const recipientBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "donatur"),
          eq(entityBankAccounts.entityId, donaturRecord.id)
        )
      )
      .orderBy(desc(entityBankAccounts.createdAt));

    if (recipientBankAccounts.length === 0) {
      return error(c, "Tambahkan rekening bank terlebih dahulu di profil donatur", 400);
    }

    const sourceBank = await getDefaultSourceBankFromSettings(db);
    const service = new DisbursementService(db);
    const availability = await service.getRevenueShareAvailability("revenue_share_fundraiser", fundraiser.id);
    const requestedAmount = Math.floor(body.amount);

    if (requestedAmount <= 0) {
      return error(c, "Jumlah dana tidak valid", 400);
    }

    if (requestedAmount > availability.totalAvailable) {
      return error(c, "Jumlah dana melebihi hak bagi hasil yang tersedia", 400);
    }

    const recipientBank = recipientBankAccounts[0];
    const created = await service.create({
      disbursement_type: "revenue_share",
      amount: requestedAmount,
      category: "revenue_share_fundraiser",
      source_bank_id: sourceBank.id,
      recipient_type: "fundraiser",
      recipient_id: fundraiser.id,
      recipient_name: donaturRecord.name || fundraiser.code,
      recipient_contact: donaturRecord.phone || "",
      recipient_bank_name: recipientBank.bankName,
      recipient_bank_account: recipientBank.accountNumber,
      recipient_bank_account_name: recipientBank.accountHolderName,
      purpose: body.purpose,
      description: `Pencairan komisi fundraiser ${fundraiser.code}`,
      notes: body.notes || undefined,
      payment_method: "bank_transfer",
      type_specific_data: {
        request_source: "frontend_fundraiser_portal",
      },
      created_by: user!.id,
    });

    const submitted = await service.updateStatus(created.id, {
      status: "submitted",
      user_id: user!.id,
    });

    return success(c, submitted, "Permintaan pencairan berhasil diajukan", 201);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return error(c, err.issues?.[0]?.message || "Data tidak valid", 400);
    }
    console.error("Error creating fundraiser disbursement:", err);
    return error(c, err.message || "Gagal mengajukan pencairan", 500);
  }
});

// GET /fundraisers/active-programs - List active programs for sharing
app.get("/active-programs", authMiddleware, async (c) => {
  const db = c.get("db");

  const campaignList = await db
    .select({ id: campaigns.id, name: campaigns.title, slug: campaigns.slug, pillar: campaigns.pillar })
    .from(campaigns)
    .where(eq(campaigns.status, "active"))
    .orderBy(desc(campaigns.createdAt));

  const zakatList = await db
    .select({ id: zakatTypes.id, name: zakatTypes.name, slug: zakatTypes.slug })
    .from(zakatTypes)
    .where(eq(zakatTypes.isActive, true))
    .orderBy(zakatTypes.displayOrder);

  const qurbanList = await db
    .select({ id: qurbanPackages.id, name: qurbanPackages.name, animalType: qurbanPackages.animalType, packageType: qurbanPackages.packageType })
    .from(qurbanPackages)
    .where(eq(qurbanPackages.isAvailable, true))
    .orderBy(qurbanPackages.name);

  const programs = [
    ...campaignList.map((c: any) => ({ id: c.id, name: c.name, pillar: c.pillar || null, type: "campaign", shareUrl: `/program/${c.slug}` })),
    ...zakatList.map((z: any) => ({ id: z.id, name: z.name, pillar: null, type: "zakat", shareUrl: `/zakat/${z.slug}` })),
    ...qurbanList.map((q: any) => ({ id: q.id, name: q.name, pillar: null, type: "qurban", shareUrl: `/qurban/${q.id}` })),
  ];

  return success(c, programs);
});

export default app;
