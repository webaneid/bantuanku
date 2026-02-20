import { Hono } from "hono";
import {
  fundraisers,
  fundraiserReferrals,
  disbursements,
  donatur,
  employees,
  transactions,
  entityBankAccounts,
  settings,
  campaigns,
  zakatTypes,
  qurbanPackages,
  createId,
} from "@bantuanku/db";
import { eq, ilike, or, desc, and, sql, count } from "drizzle-orm";
import { z } from "zod";
import { requireRoles } from "../../middleware/auth";
import { success, error, paginated } from "../../lib/response";
import { DisbursementService } from "../../services/disbursement";
import type { Env, Variables } from "../../types";

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

// Helper: get bank accounts for a fundraiser's entity (employee or donatur)
async function getFundraiserBankAccounts(db: any, fundraiserData: any) {
  const entityType = fundraiserData.employeeId ? "employee" : "donatur";
  const entityId = fundraiserData.employeeId || fundraiserData.donaturId;
  if (!entityId) return [];

  return db
    .select()
    .from(entityBankAccounts)
    .where(
      and(
        eq(entityBankAccounts.entityType, entityType),
        eq(entityBankAccounts.entityId, entityId)
      )
    );
}

// Validation schemas
const createSchema = z.object({
  donaturId: z.string().optional(),
  employeeId: z.string().optional(),
  commissionPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => (data.donaturId && !data.employeeId) || (!data.donaturId && data.employeeId),
  { message: "Harus pilih salah satu: donatur atau employee" }
);

const updateSchema = z.object({
  commissionPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// GET /admin/fundraisers/stats - Overall statistics
app.get("/stats", async (c) => {
  try {
    const db = c.get("db");

    const [stats] = await db
      .select({
        totalFundraisers: sql<number>`count(*)`,
        activeFundraisers: sql<number>`count(*) filter (where ${fundraisers.status} = 'active')`,
        pendingFundraisers: sql<number>`count(*) filter (where ${fundraisers.status} = 'pending')`,
        totalReferrals: sql<number>`coalesce(sum(${fundraisers.totalReferrals}), 0)`,
        totalDonationAmount: sql<number>`coalesce(sum(${fundraisers.totalDonationAmount}), 0)`,
        totalCommissionEarned: sql<number>`coalesce(sum(${fundraisers.totalCommissionEarned}), 0)`,
      })
      .from(fundraisers);

    return success(c, stats);
  } catch (err: any) {
    console.error("Error fetching fundraiser stats:", err);
    return error(c, "Failed to fetch stats", 500);
  }
});

// GET /admin/fundraisers/me - Get my fundraiser data (for employee/coordinator who are fundraisers)
app.get("/me", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    // Find employee linked to this user
    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) {
      return error(c, "Anda tidak terdaftar sebagai employee", 404);
    }

    // Find fundraiser linked to this employee
    const [fundraiser] = await db
      .select({
        id: fundraisers.id,
        employeeId: fundraisers.employeeId,
        donaturId: fundraisers.donaturId,
        code: fundraisers.code,
        slug: fundraisers.slug,
        status: fundraisers.status,
        commissionPercentage: fundraisers.commissionPercentage,
        totalReferrals: fundraisers.totalReferrals,
        totalDonationAmount: fundraisers.totalDonationAmount,
        totalCommissionEarned: fundraisers.totalCommissionEarned,
        currentBalance: fundraisers.currentBalance,
        totalWithdrawn: fundraisers.totalWithdrawn,
        notes: fundraisers.notes,
        createdAt: fundraisers.createdAt,
      })
      .from(fundraisers)
      .where(eq(fundraisers.employeeId, emp.id))
      .limit(1);

    if (!fundraiser) {
      return error(c, "Anda belum terdaftar sebagai fundraiser", 404);
    }

    // Get bank accounts from entity_bank_accounts
    const bankAccounts = await getFundraiserBankAccounts(db, fundraiser);

    return success(c, { ...fundraiser, bankAccounts });
  } catch (err: any) {
    console.error("Error fetching my fundraiser:", err);
    return error(c, "Failed to fetch fundraiser data", 500);
  }
});

// GET /admin/fundraisers/me/has-bank-account - Check if employee has bank account
app.get("/me/has-bank-account", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) {
      return success(c, { hasBankAccount: false, bankAccounts: [] });
    }

    const bankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, emp.id)
        )
      );

    return success(c, {
      hasBankAccount: bankAccounts.length > 0,
      bankAccounts,
    });
  } catch (err: any) {
    console.error("Error checking bank account:", err);
    return error(c, "Failed to check bank account", 500);
  }
});

// POST /admin/fundraisers/me/apply - Employee self-apply as fundraiser
app.post("/me/apply", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    // Find employee linked to this user
    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) {
      return error(c, "Anda tidak terdaftar sebagai employee", 404);
    }

    // Check if already registered
    const existing = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.employeeId, emp.id),
    });

    if (existing) {
      return error(c, "Anda sudah terdaftar sebagai fundraiser", 400);
    }

    // Check if employee has bank account
    const bankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, emp.id)
        )
      );

    if (bankAccounts.length === 0) {
      return error(c, "Anda belum memiliki rekening bank. Silakan tambahkan rekening terlebih dahulu.", 400);
    }

    // Generate unique code
    const code = await generateFundraiserCode(db);

    const defaultCommission = await getFundraiserCommission(db);

    const [created] = await db
      .insert(fundraisers)
      .values({
        employeeId: emp.id,
        donaturId: null,
        code,
        slug: code.toLowerCase(),
        status: "pending",
        commissionPercentage: defaultCommission,
      })
      .returning();

    return success(c, created, "Pengajuan fundraiser berhasil dikirim", 201);
  } catch (err: any) {
    console.error("Error applying as fundraiser:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to apply as fundraiser", 500);
  }
});

// POST /admin/fundraisers/me/save-bank-account - Save bank account for employee before applying
app.post("/me/save-bank-account", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) {
      return error(c, "Anda tidak terdaftar sebagai employee", 404);
    }

    const body = await c.req.json();
    const bankSchema = z.object({
      bankAccounts: z.array(z.object({
        bankName: z.string().min(1, "Nama bank wajib diisi"),
        accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
        accountHolderName: z.string().min(1, "Nama pemilik wajib diisi"),
      })).min(1, "Minimal satu rekening bank"),
    });

    const validated = bankSchema.parse(body);

    // Delete existing bank accounts
    await db
      .delete(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, emp.id)
        )
      );

    // Insert new bank accounts
    const bankAccountsToInsert = validated.bankAccounts.map((account) => ({
      entityType: "employee",
      entityId: emp.id,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
    }));

    await db.insert(entityBankAccounts).values(bankAccountsToInsert);

    return success(c, null, "Rekening berhasil disimpan");
  } catch (err: any) {
    console.error("Error saving bank account:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to save bank account", 500);
  }
});

// GET /admin/fundraisers/me/referrals - Get my referrals
app.get("/me/referrals", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;

    // Find employee → fundraiser
    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) return error(c, "Employee tidak ditemukan", 404);

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.employeeId, emp.id),
    });

    if (!fundraiser) return error(c, "Fundraiser tidak ditemukan", 404);

    const list = await db
      .select({
        id: fundraiserReferrals.id,
        transactionId: fundraiserReferrals.transactionId,
        donationAmount: fundraiserReferrals.donationAmount,
        commissionPercentage: fundraiserReferrals.commissionPercentage,
        commissionAmount: fundraiserReferrals.commissionAmount,
        status: fundraiserReferrals.status,
        createdAt: fundraiserReferrals.createdAt,
        transactionNumber: transactions.transactionNumber,
        donorName: transactions.donorName,
        productName: transactions.productName,
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
  } catch (err: any) {
    console.error("Error fetching my referrals:", err);
    return error(c, "Failed to fetch referrals", 500);
  }
});

// GET /admin/fundraisers/me/disbursement-availability - Availability for payout form
app.get("/me/disbursement-availability", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) return error(c, "Employee tidak ditemukan", 404);

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.employeeId, emp.id),
    });

    if (!fundraiser) return error(c, "Fundraiser tidak ditemukan", 404);

    const bankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, emp.id)
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
        name: emp.name || fundraiser.code,
        contact: emp.phone || "",
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
    return error(c, err.message || "Failed to fetch disbursement availability", 500);
  }
});

// GET /admin/fundraisers/me/disbursements - List own payout requests
app.get("/me/disbursements", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;

    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) return error(c, "Employee tidak ditemukan", 404);

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.employeeId, emp.id),
    });

    if (!fundraiser) return error(c, "Fundraiser tidak ditemukan", 404);

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
    return error(c, err.message || "Failed to fetch disbursements", 500);
  }
});

// POST /admin/fundraisers/me/disbursements - Create & submit payout request
app.post("/me/disbursements", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    const bodySchema = z.object({
      amount: z.coerce.number().positive("Jumlah dana wajib lebih dari 0"),
      purpose: z.string().min(3, "Tujuan pencairan wajib diisi"),
      notes: z.string().optional(),
    });
    const body = bodySchema.parse(await c.req.json());

    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!emp) return error(c, "Employee tidak ditemukan", 404);

    const fundraiser = await db.query.fundraisers.findFirst({
      where: eq(fundraisers.employeeId, emp.id),
    });

    if (!fundraiser) return error(c, "Fundraiser tidak ditemukan", 404);
    if (fundraiser.status !== "active") {
      return error(c, "Fundraiser harus aktif untuk mengajukan pencairan", 400);
    }

    const recipientBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, emp.id)
        )
      )
      .orderBy(desc(entityBankAccounts.createdAt));

    if (recipientBankAccounts.length === 0) {
      return error(c, "Tambahkan rekening bank terlebih dahulu sebelum mengajukan pencairan", 400);
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
      recipient_name: emp.name || fundraiser.code,
      recipient_contact: emp.phone || "",
      recipient_bank_name: recipientBank.bankName,
      recipient_bank_account: recipientBank.accountNumber,
      recipient_bank_account_name: recipientBank.accountHolderName,
      purpose: body.purpose,
      description: `Pencairan komisi fundraiser ${fundraiser.code}`,
      notes: body.notes || undefined,
      payment_method: "bank_transfer",
      type_specific_data: {
        request_source: "admin_my_fundraiser",
      },
      created_by: user.id,
    });

    const submitted = await service.updateStatus(created.id, {
      status: "submitted",
      user_id: user.id,
    });

    return success(c, submitted, "Permintaan pencairan berhasil diajukan", 201);
  } catch (err: any) {
    console.error("Error creating fundraiser disbursement:", err);
    if (err?.name === "ZodError") {
      return error(c, err.issues?.[0]?.message || "Data tidak valid", 400);
    }
    return error(c, err.message || "Failed to create disbursement", 500);
  }
});

// GET /admin/fundraisers - List with pagination
app.get("/", async (c) => {
  try {
    const db = c.get("db");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "";
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status) {
      conditions.push(eq(fundraisers.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(fundraisers.code, `%${search}%`),
          ilike(fundraisers.slug, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0
      ? (conditions.length > 1 ? and(...conditions) : conditions[0])
      : undefined;

    const list = await db
      .select({
        id: fundraisers.id,
        donaturId: fundraisers.donaturId,
        employeeId: fundraisers.employeeId,
        code: fundraisers.code,
        slug: fundraisers.slug,
        status: fundraisers.status,
        commissionPercentage: fundraisers.commissionPercentage,
        totalReferrals: fundraisers.totalReferrals,
        totalDonationAmount: fundraisers.totalDonationAmount,
        totalCommissionEarned: fundraisers.totalCommissionEarned,
        currentBalance: fundraisers.currentBalance,
        createdAt: fundraisers.createdAt,
        donaturName: donatur.name,
        employeeName: employees.name,
      })
      .from(fundraisers)
      .leftJoin(donatur, eq(fundraisers.donaturId, donatur.id))
      .leftJoin(employees, eq(fundraisers.employeeId, employees.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(fundraisers.createdAt));

    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(fundraisers)
      .where(whereClause);

    return paginated(c, list, {
      page,
      limit,
      total: Number(countResult?.total || 0),
    });
  } catch (err: any) {
    console.error("Error fetching fundraisers:", err);
    return error(c, "Failed to fetch fundraisers", 500);
  }
});

// GET /admin/fundraisers/active-programs - List all active programs for share
app.get("/active-programs", async (c) => {
  try {
    const db = c.get("db");

    const campaignList = await db
      .select({
        id: campaigns.id,
        name: campaigns.title,
        slug: campaigns.slug,
        pillar: campaigns.pillar,
      })
      .from(campaigns)
      .where(eq(campaigns.status, "active"))
      .orderBy(desc(campaigns.createdAt));

    const zakatList = await db
      .select({
        id: zakatTypes.id,
        name: zakatTypes.name,
        slug: zakatTypes.slug,
      })
      .from(zakatTypes)
      .where(eq(zakatTypes.isActive, true))
      .orderBy(zakatTypes.displayOrder);

    const qurbanList = await db
      .select({
        id: qurbanPackages.id,
        name: qurbanPackages.name,
        animalType: qurbanPackages.animalType,
        packageType: qurbanPackages.packageType,
      })
      .from(qurbanPackages)
      .where(eq(qurbanPackages.isAvailable, true))
      .orderBy(qurbanPackages.name);

    const programs = [
      ...campaignList.map((c: any) => ({
        id: c.id,
        name: c.name,
        pillar: c.pillar || null,
        type: "campaign",
        shareUrl: `/program/${c.slug}`,
      })),
      ...zakatList.map((z: any) => ({
        id: z.id,
        name: z.name,
        pillar: null,
        type: "zakat",
        shareUrl: `/zakat/${z.slug}`,
      })),
      ...qurbanList.map((q: any) => ({
        id: q.id,
        name: q.name,
        pillar: null,
        type: "qurban",
        shareUrl: `/qurban/${q.id}`,
      })),
    ];

    return success(c, programs);
  } catch (err: any) {
    console.error("Error fetching active programs:", err);
    return error(c, "Failed to fetch active programs", 500);
  }
});

// GET /admin/fundraisers/:id - Detail
app.get("/:id", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const [fundraiser] = await db
      .select({
        id: fundraisers.id,
        donaturId: fundraisers.donaturId,
        employeeId: fundraisers.employeeId,
        code: fundraisers.code,
        slug: fundraisers.slug,
        status: fundraisers.status,
        approvedBy: fundraisers.approvedBy,
        approvedAt: fundraisers.approvedAt,
        commissionPercentage: fundraisers.commissionPercentage,
        totalReferrals: fundraisers.totalReferrals,
        totalDonationAmount: fundraisers.totalDonationAmount,
        totalCommissionEarned: fundraisers.totalCommissionEarned,
        currentBalance: fundraisers.currentBalance,
        totalWithdrawn: fundraisers.totalWithdrawn,
        notes: fundraisers.notes,
        createdAt: fundraisers.createdAt,
        updatedAt: fundraisers.updatedAt,
        donaturName: donatur.name,
        donaturEmail: donatur.email,
        donaturPhone: donatur.phone,
        employeeName: employees.name,
        employeeEmail: employees.email,
        employeePhone: employees.phone,
      })
      .from(fundraisers)
      .leftJoin(donatur, eq(fundraisers.donaturId, donatur.id))
      .leftJoin(employees, eq(fundraisers.employeeId, employees.id))
      .where(eq(fundraisers.id, id))
      .limit(1);

    if (!fundraiser) {
      return error(c, "Fundraiser tidak ditemukan", 404);
    }

    // Get bank accounts from entity_bank_accounts
    const bankAccounts = await getFundraiserBankAccounts(db, fundraiser);

    return success(c, { ...fundraiser, bankAccounts });
  } catch (err: any) {
    console.error("Error fetching fundraiser:", err);
    return error(c, "Failed to fetch fundraiser", 500);
  }
});

// GET /admin/fundraisers/:id/referrals - List referrals for a fundraiser
app.get("/:id/referrals", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;

    const list = await db
      .select({
        id: fundraiserReferrals.id,
        transactionId: fundraiserReferrals.transactionId,
        donationAmount: fundraiserReferrals.donationAmount,
        commissionPercentage: fundraiserReferrals.commissionPercentage,
        commissionAmount: fundraiserReferrals.commissionAmount,
        status: fundraiserReferrals.status,
        paidAt: fundraiserReferrals.paidAt,
        createdAt: fundraiserReferrals.createdAt,
        transactionNumber: transactions.transactionNumber,
        donorName: transactions.donorName,
        productName: transactions.productName,
      })
      .from(fundraiserReferrals)
      .leftJoin(transactions, eq(fundraiserReferrals.transactionId, transactions.id))
      .where(eq(fundraiserReferrals.fundraiserId, id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(fundraiserReferrals.createdAt));

    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(fundraiserReferrals)
      .where(eq(fundraiserReferrals.fundraiserId, id));

    return paginated(c, list, {
      page,
      limit,
      total: Number(countResult?.total || 0),
    });
  } catch (err: any) {
    console.error("Error fetching referrals:", err);
    return error(c, "Failed to fetch referrals", 500);
  }
});

// POST /admin/fundraisers - Create
app.post("/", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();
    const validated = createSchema.parse(body);

    // Check for duplicate fundraiser
    if (validated.donaturId) {
      const existing = await db.query.fundraisers.findFirst({
        where: eq(fundraisers.donaturId, validated.donaturId),
      });
      if (existing) {
        return error(c, "Donatur ini sudah terdaftar sebagai fundraiser", 400);
      }
    }
    if (validated.employeeId) {
      const existing = await db.query.fundraisers.findFirst({
        where: eq(fundraisers.employeeId, validated.employeeId),
      });
      if (existing) {
        return error(c, "Employee ini sudah terdaftar sebagai fundraiser", 400);
      }
    }

    // Validate entity exists
    if (validated.donaturId) {
      const d = await db.query.donatur.findFirst({
        where: eq(donatur.id, validated.donaturId),
      });
      if (!d) return error(c, "Donatur tidak ditemukan", 404);
    } else if (validated.employeeId) {
      const e = await db.query.employees.findFirst({
        where: eq(employees.id, validated.employeeId),
      });
      if (!e) return error(c, "Employee tidak ditemukan", 404);
    }

    // Generate unique code
    const code = await generateFundraiserCode(db);

    const slug = code.toLowerCase();
    const user = c.get("user");

    const [created] = await db
      .insert(fundraisers)
      .values({
        donaturId: validated.donaturId || null,
        employeeId: validated.employeeId || null,
        code,
        slug,
        status: "active", // Admin create = auto active
        approvedBy: user.id,
        approvedAt: new Date(),
        commissionPercentage: validated.commissionPercentage?.toString() || await getFundraiserCommission(db),
        notes: validated.notes || null,
      })
      .returning();

    return success(c, created, "Fundraiser berhasil dibuat", 201);
  } catch (err: any) {
    console.error("Error creating fundraiser:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to create fundraiser", 500);
  }
});

// PUT /admin/fundraisers/:id - Update
app.put("/:id", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = updateSchema.parse(body);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validated.commissionPercentage !== undefined) {
      updateData.commissionPercentage = validated.commissionPercentage.toString();
    }
    if (validated.notes !== undefined) updateData.notes = validated.notes || null;

    const [updated] = await db
      .update(fundraisers)
      .set(updateData)
      .where(eq(fundraisers.id, id))
      .returning();

    if (!updated) {
      return error(c, "Fundraiser tidak ditemukan", 404);
    }

    return success(c, updated, "Fundraiser berhasil diupdate");
  } catch (err: any) {
    console.error("Error updating fundraiser:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to update fundraiser", 500);
  }
});

// DELETE /admin/fundraisers/:id
app.delete("/:id", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    // Check if has referrals
    const [refCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(fundraiserReferrals)
      .where(eq(fundraiserReferrals.fundraiserId, id));

    if (Number(refCount?.total || 0) > 0) {
      return error(c, "Tidak bisa menghapus fundraiser yang sudah memiliki referral", 400);
    }

    const [deleted] = await db
      .delete(fundraisers)
      .where(eq(fundraisers.id, id))
      .returning();

    if (!deleted) {
      return error(c, "Fundraiser tidak ditemukan", 404);
    }

    return success(c, null, "Fundraiser berhasil dihapus");
  } catch (err: any) {
    console.error("Error deleting fundraiser:", err);
    return error(c, "Failed to delete fundraiser", 500);
  }
});

// POST /admin/fundraisers/:id/approve
app.post("/:id/approve", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const user = c.get("user");

    const [updated] = await db
      .update(fundraisers)
      .set({
        status: "active",
        approvedBy: user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fundraisers.id, id))
      .returning();

    if (!updated) {
      return error(c, "Fundraiser tidak ditemukan", 404);
    }

    return success(c, updated, "Fundraiser berhasil di-approve");
  } catch (err: any) {
    console.error("Error approving fundraiser:", err);
    return error(c, "Failed to approve fundraiser", 500);
  }
});

// POST /admin/fundraisers/:id/suspend
app.post("/:id/suspend", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const [updated] = await db
      .update(fundraisers)
      .set({
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(fundraisers.id, id))
      .returning();

    if (!updated) {
      return error(c, "Fundraiser tidak ditemukan", 404);
    }

    return success(c, updated, "Fundraiser berhasil di-suspend");
  } catch (err: any) {
    console.error("Error suspending fundraiser:", err);
    return error(c, "Failed to suspend fundraiser", 500);
  }
});

// POST /admin/fundraisers/:id/activate
app.post("/:id/activate", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const [updated] = await db
      .update(fundraisers)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(fundraisers.id, id))
      .returning();

    if (!updated) {
      return error(c, "Fundraiser tidak ditemukan", 404);
    }

    return success(c, updated, "Fundraiser berhasil diaktifkan");
  } catch (err: any) {
    console.error("Error activating fundraiser:", err);
    return error(c, "Failed to activate fundraiser", 500);
  }
});

export default app;
