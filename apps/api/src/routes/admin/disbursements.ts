import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import {
  disbursements,
  employees,
  campaigns,
  mitra,
  zakatPeriods,
  qurbanPeriods,
  qurbanPackages,
  qurbanPackagePeriods,
  entityBankAccounts,
  EXPENSE_CATEGORIES,
} from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import { DisbursementService } from "../../services/disbursement";
import { WhatsAppService } from "../../services/whatsapp";
import type { Env, Variables } from "../../types";

type MitraScope = {
  mitraRecord: any | null;
  campaignIds: string[];
  zakatPeriodIds: string[];
  qurbanPeriodIds: string[];
};

async function getMitraScope(db: any, user: { id: string; email?: string | null }): Promise<MitraScope> {
  let mitraRecord = await db.query.mitra.findFirst({
    where: eq(mitra.userId, user.id),
  });

  // Fallback untuk data lama yang belum punya userId terhubung.
  if (!mitraRecord && user.email) {
    mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.email, user.email),
    });
  }

  if (!mitraRecord) {
    return {
      mitraRecord: null,
      campaignIds: [],
      zakatPeriodIds: [],
      qurbanPeriodIds: [],
    };
  }

  const [mitraCampaigns, mitraZakatPeriods, legacyMitraQurbanPeriods, mitraQurbanPackagePeriods] = await Promise.all([
    db.query.campaigns.findMany({
      where: eq(campaigns.mitraId, mitraRecord.id),
      columns: { id: true },
    }),
    db.query.zakatPeriods.findMany({
      where: eq(zakatPeriods.mitraId, mitraRecord.id),
      columns: { id: true },
    }),
    db.query.qurbanPeriods.findMany({
      where: eq(qurbanPeriods.mitraId, mitraRecord.id),
      columns: { id: true },
    }),
    db
      .select({ periodId: qurbanPackagePeriods.periodId })
      .from(qurbanPackagePeriods)
      .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
      .where(eq(qurbanPackages.createdBy, user.id)),
  ]);

  const qurbanPeriodIds = Array.from(
    new Set([
      ...legacyMitraQurbanPeriods.map((p: any) => p.id),
      ...mitraQurbanPackagePeriods.map((p: any) => p.periodId),
    ])
  );

  return {
    mitraRecord,
    campaignIds: mitraCampaigns.map((c: any) => c.id),
    zakatPeriodIds: mitraZakatPeriods.map((p: any) => p.id),
    qurbanPeriodIds,
  };
}

function isMitraReferenceOwnedByType(scope: MitraScope, type: string, referenceId?: string) {
  if (!referenceId) return false;
  if (type === "campaign") return scope.campaignIds.includes(referenceId);
  if (type === "zakat") return scope.zakatPeriodIds.includes(referenceId);
  if (type === "qurban") return scope.qurbanPeriodIds.includes(referenceId);
  return false;
}

const disbursementsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET all disbursements
disbursementsAdmin.get("/", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const disbursement_type = c.req.query("disbursement_type");
  const reference_type = c.req.query("reference_type");
  const reference_id = c.req.query("reference_id");
  const status = c.req.query("status");
  const category = c.req.query("category");
  const source_bank_id = c.req.query("source_bank_id");

  // admin_campaign can only see their own disbursements
  const isAdminCampaign = user?.roles?.includes("admin_campaign") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance");

  // program_coordinator can only see disbursements where they are the recipient
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  let coordinatorEmployeeId: string | undefined;
  if (isCoordinator) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    coordinatorEmployeeId = employee?.id || "no-employee-record";
  }

  // employee-only can see disbursements where they are the recipient OR they created it
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  let employeeOrFilter: { recipient_id: string; created_by: string } | undefined;
  if (isEmployeeOnly) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    employeeOrFilter = {
      recipient_id: employee?.id || "no-employee-record",
      created_by: user!.id,
    };
  }

  // mitra can only see disbursements they created
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

  const result = await service.list({
    disbursement_type,
    reference_type,
    reference_id,
    status,
    category,
    source_bank_id,
    created_by: (isAdminCampaign || isMitra) ? user!.id : undefined,
    recipient_id: isCoordinator ? coordinatorEmployeeId : undefined,
    employee_or_filter: employeeOrFilter,
    page,
    limit,
  });

  return paginated(c, result.data, result.pagination);
});

// GET reference stats (centralized - always shows ALL disbursements regardless of creator)
// IMPORTANT: Must be before /:id route to avoid being matched as an ID
disbursementsAdmin.get("/reference-stats", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const reference_id = c.req.query("reference_id");
  const disbursement_type = c.req.query("disbursement_type") as
    | "campaign"
    | "zakat"
    | "qurban"
    | "operational"
    | "vendor"
    | "revenue_share"
    | undefined;

  if (!reference_id) {
    return error(c, "reference_id is required", 400);
  }

  const user = c.get("user");
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra && user) {
    const scope = await getMitraScope(db, user);
    if (!scope.mitraRecord) {
      return error(c, "Data mitra tidak ditemukan", 404);
    }
    const isOwned =
      scope.campaignIds.includes(reference_id) ||
      scope.zakatPeriodIds.includes(reference_id) ||
      scope.qurbanPeriodIds.includes(reference_id);
    if (!isOwned) {
      return error(c, "Forbidden: Referensi bukan milik mitra Anda", 403);
    }
  }

  const stats = await service.getStatsForReference(reference_id, disbursement_type);
  return success(c, stats);
});

// GET revenue share payout availability
// IMPORTANT: Must be before /:id route to avoid being matched as an ID
disbursementsAdmin.get("/revenue-share/available", requireRole("super_admin", "admin_finance", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  let category = c.req.query("category") || "";
  let recipientId = c.req.query("recipient_id") || undefined;

  try {
    if (isMitra && user) {
      const scope = await getMitraScope(db, user);
      if (!scope.mitraRecord) {
        return error(c, "Data mitra tidak ditemukan", 404);
      }
      category = "revenue_share_mitra";
      recipientId = scope.mitraRecord.id;
    }

    const availability = await service.getRevenueShareAvailability(category, recipientId);
    return success(c, availability);
  } catch (err: any) {
    return error(c, err.message || "Failed to load revenue share availability", 400);
  }
});

// GET categories by disbursement type
// IMPORTANT: Must be before /:id route to avoid being matched as an ID
disbursementsAdmin.get("/categories/:type", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const type = c.req.param("type") as "campaign" | "zakat" | "qurban" | "operational" | "vendor" | "revenue_share";

  const categories = EXPENSE_CATEGORIES[type] || [];

  return success(c, categories);
});

// GET disbursement by ID
disbursementsAdmin.get("/:id", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");
  const id = c.req.param("id");

  const disbursement = await service.getById(id);

  if (!disbursement) {
    return error(c, "Disbursement not found", 404);
  }

  // admin_campaign can only see their own disbursements
  const isAdminCampaign = user?.roles?.includes("admin_campaign") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance");
  if (isAdminCampaign && disbursement.createdBy !== user!.id) {
    return error(c, "Forbidden", 403);
  }

  // program_coordinator can only see disbursements where they are the recipient
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    if (!employee || disbursement.recipientId !== employee.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // employee-only can only see disbursements where they are recipient or creator
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  if (isEmployeeOnly) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    const isRecipient = employee && disbursement.recipientId === employee.id;
    const isCreator = disbursement.createdBy === user!.id;
    if (!isRecipient && !isCreator) {
      return error(c, "Forbidden", 403);
    }
  }

  // mitra can only see disbursements they created
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra && disbursement.createdBy !== user!.id) {
    return error(c, "Forbidden", 403);
  }

  return success(c, disbursement);
});

// POST create disbursement
disbursementsAdmin.post("/", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");

  const body = await c.req.json();
  console.log("Disbursement POST body:", body);

  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

  // revenue share disbursement only for super_admin/admin_finance
  if (
    body.disbursement_type === "revenue_share" &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !isMitra
  ) {
    return error(c, "Forbidden: Hanya super_admin atau admin_finance yang bisa membuat pencairan revenue share", 403);
  }

  // program_coordinator can only create disbursements for themselves
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    if (!employee) {
      return error(c, "Employee record not found for your account", 400);
    }
    if (body.recipient_id !== employee.id) {
      return error(c, "Forbidden: You can only create disbursements for yourself", 403);
    }
  }

  // employee-only can only create campaign disbursements for campaigns they coordinate, or as fundraiser
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  if (isEmployeeOnly) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    if (!employee) {
      return error(c, "Employee record not found for your account", 400);
    }
    // Must be campaign type
    if (body.disbursement_type === "campaign" && body.reference_id) {
      // Verify employee is coordinator of this campaign
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, body.reference_id),
      });
      if (!campaign || campaign.coordinatorId !== employee.id) {
        return error(c, "Forbidden: Anda hanya bisa mengajukan pencairan untuk campaign yang Anda kelola", 403);
      }
    }
  }

  // mitra can create disbursements for own campaign/zakat/qurban/revenue-share only
  if (isMitra && user) {
    const scope = await getMitraScope(db, user);
    if (!scope.mitraRecord) {
      return error(c, "Data mitra tidak ditemukan untuk akun ini", 404);
    }

    if (!["campaign", "zakat", "qurban", "revenue_share"].includes(body.disbursement_type)) {
      return error(c, "Mitra hanya bisa mengajukan pencairan campaign, zakat, qurban, atau revenue share", 403);
    }

    if (body.disbursement_type === "campaign" || body.disbursement_type === "zakat" || body.disbursement_type === "qurban") {
      if (!isMitraReferenceOwnedByType(scope, body.disbursement_type, body.reference_id)) {
        return error(c, "Forbidden: Referensi program bukan milik mitra Anda", 403);
      }
    }

    // Mitra: nominal campaign tidak boleh melebihi dana tersisa.
    if (body.disbursement_type === "campaign" && body.reference_id) {
      const campaignRecord = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, body.reference_id),
      });

      if (!campaignRecord) {
        return error(c, "Campaign tidak ditemukan", 404);
      }

      const stats = await service.getStatsForReference(body.reference_id, "campaign");
      const requestedAmount = Number(body.amount || 0);
      const isBeneficiaryCategory = body.category === "campaign_to_beneficiary";
      const isWakaf = String(campaignRecord.pillar || "").toLowerCase() === "wakaf";
      const incomingAmount = isBeneficiaryCategory
        ? (isWakaf ? Number(campaignRecord.collected || 0) : Number(stats.totalProgramAmount || 0))
        : Number(campaignRecord.collected || 0);
      const remainingAmount = Math.max(0, incomingAmount - Number(stats.totalCommitted || 0));

      if (requestedAmount > remainingAmount) {
        return error(c, "Jumlah dana melebihi Dana Tersisa campaign", 400);
      }
    }

    if (body.disbursement_type === "revenue_share" && body.category !== "revenue_share_mitra") {
      return error(c, "Kategori revenue share untuk mitra harus revenue_share_mitra", 403);
    }

    const [bank] = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "mitra"),
          eq(entityBankAccounts.entityId, scope.mitraRecord.id)
        )
      )
      .orderBy(desc(entityBankAccounts.createdAt))
      .limit(1);

    if (!bank) {
      return error(c, "Rekening mitra belum lengkap. Lengkapi rekening penerima terlebih dahulu.", 400);
    }

    // Force recipient selalu ke rekening milik mitra sendiri.
    body.recipient_type = "mitra";
    body.recipient_id = scope.mitraRecord.id;
    body.recipient_name = scope.mitraRecord.name || "";
    body.recipient_contact = scope.mitraRecord.phone || scope.mitraRecord.whatsappNumber || "";
    body.recipient_bank_name = bank.bankName;
    body.recipient_bank_account = bank.accountNumber;
    body.recipient_bank_account_name = bank.accountHolderName;
  }

  try {
    const disbursement = await service.create({
      disbursement_type: body.disbursement_type,
      reference_type: body.reference_type,
      reference_id: body.reference_id,
      reference_name: body.reference_name,
      amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
      category: body.category,
      source_bank_id: body.source_bank_id,
      recipient_type: body.recipient_type,
      recipient_id: body.recipient_id,
      recipient_name: body.recipient_name,
      recipient_contact: body.recipient_contact || undefined,
      recipient_bank_name: body.recipient_bank_name || undefined,
      recipient_bank_account: body.recipient_bank_account || undefined,
      recipient_bank_account_name: body.recipient_bank_account_name || undefined,
      purpose: body.purpose || undefined,
      description: body.description || undefined,
      notes: body.notes || undefined,
      payment_method: body.payment_method || undefined,
      type_specific_data: body.type_specific_data,
      created_by: user!.id,
    });

    return success(c, disbursement, undefined, 201);
  } catch (err: any) {
    console.error("Disbursement creation error:", err);
    return error(c, err.message, 400);
  }
});

// PATCH update disbursement status
disbursementsAdmin.patch("/:id/status", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");
  const id = c.req.param("id");

  const body = await c.req.json();

  // admin_campaign can only submit (draft -> submitted), not approve/reject
  const isAdminCampaign = user?.roles?.includes("admin_campaign") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance");
  if (isAdminCampaign) {
    if (body.status !== "submitted") {
      return error(c, "Forbidden: admin_campaign can only submit disbursements", 403);
    }
    // Verify ownership
    const existing = await service.getById(id);
    if (!existing || existing.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // program_coordinator can only submit their own disbursements
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator) {
    if (body.status !== "submitted") {
      return error(c, "Forbidden: program_coordinator can only submit disbursements", 403);
    }
    const existing = await service.getById(id);
    if (!existing || existing.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // employee-only can only submit their own disbursements
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  if (isEmployeeOnly) {
    if (body.status !== "submitted") {
      return error(c, "Forbidden: employee can only submit disbursements", 403);
    }
    const existing = await service.getById(id);
    if (!existing || existing.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // mitra can only submit their own disbursements
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra) {
    if (body.status !== "submitted") {
      return error(c, "Forbidden: mitra can only submit disbursements", 403);
    }
    const existing = await service.getById(id);
    if (!existing || existing.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  try {
    const disbursement = await service.updateStatus(id, {
      status: body.status,
      user_id: user!.id,
      rejection_reason: body.rejection_reason,
      payment_proof: body.payment_proof,
    });

    // WhatsApp notification: permintaan pencairan submitted → kirim ke admin (async, non-blocking)
    if (body.status === "submitted") {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      const typeMap: Record<string, string> = {
        campaign: "Campaign",
        zakat: "Zakat",
        qurban: "Qurban",
        operational: "Operasional",
        vendor: "Vendor",
        revenue_share: "Revenue Share",
      };
      wa.sendToAdmins("wa_tpl_admin_disbursement_request", {
        disbursement_number: disbursement.disbursementNumber || "",
        disbursement_type: typeMap[disbursement.disbursementType] || disbursement.disbursementType,
        campaign_name: disbursement.referenceName || "",
        disbursement_amount: wa.formatCurrency(Number(disbursement.amount)),
        recipient_name: disbursement.recipientName || "",
        disbursement_purpose: disbursement.purpose || "",
      }).catch((err) => console.error("WA admin disbursement-request notification error:", err));
    }

    return success(c, disbursement);
  } catch (err: any) {
    return error(c, err.message, 400);
  }
});

// POST mark disbursement as paid
disbursementsAdmin.post("/:id/mark-paid", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");
  const id = c.req.param("id");

  const body = await c.req.json();

  try {
    const disbursement = await service.markAsPaid(id, {
      destination_bank_id: body.destination_bank_id,
      transfer_proof_url: body.transfer_proof_url,
      transfer_date: new Date(body.transfer_date),
      transferred_amount: typeof body.transferred_amount === 'string' ? parseFloat(body.transferred_amount) : body.transferred_amount,
      additional_fees: body.additional_fees ? (typeof body.additional_fees === 'string' ? parseFloat(body.additional_fees) : body.additional_fees) : 0,
      user_id: user!.id,
    });

    // WhatsApp notification: dana disalurkan → bulk send ke donatur campaign (async, non-blocking)
    if (disbursement.referenceId) {
      const { transactions: transactionsTable } = await import("@bantuanku/db");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);

      const donorTransactions = await db
        .select({
          donorPhone: transactionsTable.donorPhone,
          donorName: transactionsTable.donorName,
        })
        .from(transactionsTable)
        .where(
          andOp(
            eqOp(transactionsTable.productId, disbursement.referenceId),
            eqOp(transactionsTable.paymentStatus, "paid")
          )
        );

      const uniqueDonors = new Map<string, string>();
      for (const tx of donorTransactions) {
        if (tx.donorPhone && !uniqueDonors.has(tx.donorPhone)) {
          uniqueDonors.set(tx.donorPhone, tx.donorName);
        }
      }

      const typeMap: Record<string, string> = {
        campaign: "Campaign",
        zakat: "Zakat",
        qurban: "Qurban",
        operational: "Operasional",
        vendor: "Vendor",
        revenue_share: "Revenue Share",
      };

      const recipients = Array.from(uniqueDonors.entries()).map(([phone, name]) => ({
        phone,
        variables: {
          customer_name: name,
          campaign_name: disbursement.referenceName || "",
          disbursement_amount: wa.formatCurrency(Number(disbursement.amount)),
          disbursement_purpose: disbursement.purpose || "",
          recipient_name: disbursement.recipientName || "",
          disbursement_type: typeMap[disbursement.disbursementType] || disbursement.disbursementType,
        },
      }));

      if (recipients.length > 0) {
        wa.sendBulk(recipients, "wa_tpl_disbursement_created").catch(
          (err) => console.error("WA disbursement-paid notification error:", err)
        );
      }
    }

    return success(c, disbursement);
  } catch (err: any) {
    return error(c, err.message, 400);
  }
});

// DELETE disbursement
disbursementsAdmin.delete("/:id", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");
  const id = c.req.param("id");

  // admin_campaign can only delete their own disbursements
  const isAdminCampaign = user?.roles?.includes("admin_campaign") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance");
  if (isAdminCampaign) {
    const disbursement = await service.getById(id);
    if (!disbursement || disbursement.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // program_coordinator can only delete their own disbursements
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator) {
    const disbursement = await service.getById(id);
    if (!disbursement || disbursement.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // employee-only can only delete their own disbursements
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  if (isEmployeeOnly) {
    const disbursement = await service.getById(id);
    if (!disbursement || disbursement.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  // mitra can only delete their own disbursements
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra) {
    const disbursement = await service.getById(id);
    if (!disbursement || disbursement.createdBy !== user!.id) {
      return error(c, "Forbidden", 403);
    }
  }

  try {
    await service.delete(id);
    return success(c, { message: "Disbursement deleted successfully" });
  } catch (err: any) {
    return error(c, err.message, 400);
  }
});

// GET activity reports for a disbursement
disbursementsAdmin.get("/:id/activity-reports", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const id = c.req.param("id");

  try {
    const reports = await service.getActivityReports(id);
    return success(c, reports);
  } catch (err: any) {
    return error(c, err.message, 400);
  }
});

// POST add activity report for a disbursement (zakat coordinator only)
disbursementsAdmin.post("/:id/activity-reports", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const service = new DisbursementService(db);
  const user = c.get("user");
  const id = c.req.param("id");

  const body = await c.req.json();

  try {
    const report = await service.addActivityReport(id, {
      report_date: new Date(body.report_date),
      report_description: body.report_description,
      photos: body.photos,
      video_url: body.video_url,
      recipient_count: body.recipient_count,
      recipient_list: body.recipient_list,
      added_by: user!.id,
    });

    return success(c, report, undefined, 201);
  } catch (err: any) {
    return error(c, err.message, 400);
  }
});

export default disbursementsAdmin;
