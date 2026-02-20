import { eq, and, or, desc, sql, inArray, ne, gt, asc } from "drizzle-orm";
import {
  disbursements,
  disbursementActivityReports,
  disbursementRevenueShareItems,
  bankAccounts,
  revenueShares,
  settings,
  transactions,
  fundraisers,
  mitra,
  chartOfAccounts,
  EXPENSE_CATEGORIES,
  type Database,
  type DisbursementActivityReport,
} from "@bantuanku/db";
import { updateBankBalance } from "../utils/bank-balance";

interface CreateDisbursementDTO {
  disbursement_type: "campaign" | "zakat" | "qurban" | "operational" | "vendor" | "revenue_share";
  reference_type?: "campaign" | "zakat_type" | "qurban_period";
  reference_id?: string;
  reference_name?: string;
  amount: number;
  category: string;
  source_bank_id?: string;
  recipient_type?: "vendor" | "employee" | "coordinator" | "mustahiq" | "manual" | "fundraiser" | "mitra";
  recipient_id?: string;
  recipient_name: string;
  recipient_contact?: string;
  recipient_bank_name?: string;
  recipient_bank_account?: string;
  recipient_bank_account_name?: string;
  purpose?: string;
  description?: string;
  notes?: string;
  payment_method?: string;
  type_specific_data?: Record<string, any>;
  created_by: string;
}

interface UpdateDisbursementStatusDTO {
  status: "submitted" | "approved" | "rejected" | "paid";
  user_id: string;
  rejection_reason?: string;
  payment_proof?: string;
}

interface MarkAsPaidDTO {
  destination_bank_id: string;
  transfer_proof_url: string;
  transfer_date: Date;
  transferred_amount: number;
  additional_fees: number;
  user_id: string;
}

interface DisbursementFilters {
  disbursement_type?: string;
  reference_type?: string;
  reference_id?: string;
  reference_ids?: string[];
  status?: string;
  category?: string;
  created_by?: string;
  source_bank_id?: string;
  recipient_id?: string;
  // OR filter: show disbursements where recipientId = X OR createdBy = Y
  employee_or_filter?: { recipient_id: string; created_by: string };
  page?: number;
  limit?: number;
}

type RevenueShareDisbursementCategory =
  | "revenue_share_mitra"
  | "revenue_share_fundraiser"
  | "revenue_share_developer";

type RevenueShareItemType = "mitra" | "fundraiser" | "developer";

interface RevenueShareAvailability {
  shareType: RevenueShareItemType;
  totalEntitled: number;
  totalCommitted: number;
  totalPaid: number;
  totalAvailable: number;
  recordsCount: number;
}

const REVENUE_SHARE_CATEGORY_MAP: Record<RevenueShareDisbursementCategory, RevenueShareItemType> = {
  revenue_share_mitra: "mitra",
  revenue_share_fundraiser: "fundraiser",
  revenue_share_developer: "developer",
};

const LEGACY_QURBAN_CATEGORY_MAP: Record<string, string> = {
  pembelian_sapi: "qurban_purchase_sapi",
  pembelian_kambing: "qurban_purchase_kambing",
  administrasi: "qurban_execution_fee",
};

type UnifiedDisbursement = typeof disbursements.$inferSelect;

export class DisbursementService {
  constructor(private db: Database) {}

  private generateDisbursementNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-5);
    return `DSB-${year}${month}${day}-${timestamp}`;
  }

  private getRevenueShareTypeFromCategory(category: string): RevenueShareItemType | null {
    return REVENUE_SHARE_CATEGORY_MAP[category as RevenueShareDisbursementCategory] || null;
  }

  private normalizeCategory(disbursementType: CreateDisbursementDTO["disbursement_type"], category: string): string {
    if (disbursementType === "qurban") {
      return LEGACY_QURBAN_CATEGORY_MAP[category] || category;
    }
    return category;
  }

  private validateCategory(disbursementType: CreateDisbursementDTO["disbursement_type"], category: string): void {
    const allowed = (EXPENSE_CATEGORIES as any)[disbursementType] || [];
    const allowedValues = new Set((allowed as Array<{ value: string }>).map((c) => c.value));
    if (!allowedValues.has(category)) {
      throw new Error(`Kategori tidak valid untuk tipe ${disbursementType}: ${category}`);
    }
  }

  private validateRevenueShareRecipient(
    category: string,
    recipientType?: string,
    recipientId?: string
  ): RevenueShareItemType {
    const shareType = this.getRevenueShareTypeFromCategory(category);
    if (!shareType) {
      throw new Error("Kategori revenue share tidak valid");
    }

    if (shareType === "mitra") {
      if (recipientType !== "mitra") {
        throw new Error("Kategori revenue_share_mitra wajib menggunakan penerima tipe mitra");
      }
      if (!recipientId) {
        throw new Error("Penerima mitra wajib dipilih");
      }
    }

    if (shareType === "fundraiser") {
      if (recipientType !== "fundraiser") {
        throw new Error("Kategori revenue_share_fundraiser wajib menggunakan penerima tipe fundraiser");
      }
      if (!recipientId) {
        throw new Error("Penerima fundraiser wajib dipilih");
      }
    }

    if (shareType === "developer" && !recipientType) {
      throw new Error("Tipe penerima developer wajib diisi");
    }

    return shareType;
  }

  private async getRevenueShareBaseRows(shareType: RevenueShareItemType, recipientId?: string) {
    if (shareType === "mitra") {
      if (!recipientId) return [];
      return this.db
        .select({
          revenueShareId: revenueShares.id,
          entitledAmount: revenueShares.mitraAmount,
          calculatedAt: revenueShares.calculatedAt,
        })
        .from(revenueShares)
        .innerJoin(transactions, eq(revenueShares.transactionId, transactions.id))
        .where(
          and(
            eq(transactions.paymentStatus, "paid"),
            eq(revenueShares.mitraId, recipientId),
            gt(revenueShares.mitraAmount, 0)
          )
        )
        .orderBy(asc(revenueShares.calculatedAt), asc(revenueShares.id));
    }

    if (shareType === "fundraiser") {
      if (!recipientId) return [];
      return this.db
        .select({
          revenueShareId: revenueShares.id,
          entitledAmount: revenueShares.fundraiserAmount,
          calculatedAt: revenueShares.calculatedAt,
        })
        .from(revenueShares)
        .innerJoin(transactions, eq(revenueShares.transactionId, transactions.id))
        .where(
          and(
            eq(transactions.paymentStatus, "paid"),
            eq(revenueShares.fundraiserId, recipientId),
            gt(revenueShares.fundraiserAmount, 0)
          )
        )
        .orderBy(asc(revenueShares.calculatedAt), asc(revenueShares.id));
    }

    return this.db
      .select({
        revenueShareId: revenueShares.id,
        entitledAmount: revenueShares.developerAmount,
        calculatedAt: revenueShares.calculatedAt,
      })
      .from(revenueShares)
      .innerJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .where(and(eq(transactions.paymentStatus, "paid"), gt(revenueShares.developerAmount, 0)))
      .orderBy(asc(revenueShares.calculatedAt), asc(revenueShares.id));
  }

  private async getCommittedRevenueShareMap(
    shareType: RevenueShareItemType,
    revenueShareIds: string[],
    options?: { excludeDisbursementId?: string }
  ) {
    if (revenueShareIds.length === 0) {
      return new Map<string, { committed: number; paid: number }>();
    }

    const conditions: any[] = [
      eq(disbursementRevenueShareItems.shareType, shareType),
      inArray(disbursementRevenueShareItems.revenueShareId, revenueShareIds),
      inArray(disbursements.status, ["submitted", "approved", "paid"]),
    ];

    if (options?.excludeDisbursementId) {
      conditions.push(ne(disbursementRevenueShareItems.disbursementId, options.excludeDisbursementId));
    }

    const rows = await this.db
      .select({
        revenueShareId: disbursementRevenueShareItems.revenueShareId,
        committedAmount: sql<number>`COALESCE(SUM(${disbursementRevenueShareItems.allocatedAmount}), 0)`,
        paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursements.status} = 'paid' THEN ${disbursementRevenueShareItems.allocatedAmount} ELSE 0 END), 0)`,
      })
      .from(disbursementRevenueShareItems)
      .innerJoin(disbursements, eq(disbursements.id, disbursementRevenueShareItems.disbursementId))
      .where(and(...conditions))
      .groupBy(disbursementRevenueShareItems.revenueShareId);

    return new Map(
      rows.map((row) => [
        row.revenueShareId,
        {
          committed: Number(row.committedAmount || 0),
          paid: Number(row.paidAmount || 0),
        },
      ])
    );
  }

  async getRevenueShareAvailability(
    category: string,
    recipientId?: string,
    options?: { excludeDisbursementId?: string }
  ): Promise<RevenueShareAvailability> {
    const shareType = this.getRevenueShareTypeFromCategory(category);
    if (!shareType) {
      throw new Error("Kategori revenue share tidak valid");
    }

    if ((shareType === "mitra" || shareType === "fundraiser") && !recipientId) {
      return {
        shareType,
        totalEntitled: 0,
        totalCommitted: 0,
        totalPaid: 0,
        totalAvailable: 0,
        recordsCount: 0,
      };
    }

    const baseRows = await this.getRevenueShareBaseRows(shareType, recipientId);
    const revenueShareIds = baseRows.map((row) => row.revenueShareId);
    const committedMap = await this.getCommittedRevenueShareMap(shareType, revenueShareIds, options);

    let totalEntitled = 0;
    let totalCommitted = 0;
    let totalPaid = 0;
    let totalAvailable = 0;

    for (const row of baseRows) {
      const entitled = Number(row.entitledAmount || 0);
      const committed = committedMap.get(row.revenueShareId)?.committed || 0;
      const paid = committedMap.get(row.revenueShareId)?.paid || 0;
      const available = Math.max(0, entitled - committed);

      totalEntitled += entitled;
      totalCommitted += committed;
      totalPaid += paid;
      totalAvailable += available;
    }

    return {
      shareType,
      totalEntitled,
      totalCommitted,
      totalPaid,
      totalAvailable,
      recordsCount: baseRows.length,
    };
  }

  private async buildRevenueShareAllocations(
    category: string,
    recipientId: string | undefined,
    requestedAmount: number,
    options?: { excludeDisbursementId?: string }
  ) {
    const shareType = this.getRevenueShareTypeFromCategory(category);
    if (!shareType) {
      throw new Error("Kategori revenue share tidak valid");
    }

    const baseRows = await this.getRevenueShareBaseRows(shareType, recipientId);
    const revenueShareIds = baseRows.map((row) => row.revenueShareId);
    const committedMap = await this.getCommittedRevenueShareMap(shareType, revenueShareIds, options);

    let remaining = requestedAmount;
    const allocations: Array<{ revenueShareId: string; allocatedAmount: number }> = [];

    for (const row of baseRows) {
      if (remaining <= 0) break;

      const entitled = Number(row.entitledAmount || 0);
      const committed = committedMap.get(row.revenueShareId)?.committed || 0;
      const available = Math.max(0, entitled - committed);
      if (available <= 0) continue;

      const allocated = Math.min(available, remaining);
      allocations.push({
        revenueShareId: row.revenueShareId,
        allocatedAmount: allocated,
      });
      remaining -= allocated;
    }

    if (remaining > 0) {
      throw new Error("Jumlah pencairan melebihi hak bagi hasil yang tersedia");
    }

    return { shareType, allocations };
  }

  async create(data: CreateDisbursementDTO): Promise<UnifiedDisbursement> {
    const normalizedCategory = this.normalizeCategory(data.disbursement_type, data.category);
    this.validateCategory(data.disbursement_type, normalizedCategory);

    let bankAccount: any = null;
    if (data.source_bank_id) {
      // Validate bank account exists - check from settings JSON
      const allSettings = await this.db.query.settings.findMany();
      const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
      const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

      let bankAccounts: any[] = [];
      if (bankAccountsSetting?.value) {
        try {
          bankAccounts = JSON.parse(bankAccountsSetting.value);
        } catch (e) {
          throw new Error("Failed to parse bank accounts from settings");
        }
      }

      bankAccount = bankAccounts.find((b: any) => b.id === data.source_bank_id);
      if (!bankAccount) {
        throw new Error(`Bank account not found with ID: ${data.source_bank_id}`);
      }

      if (!bankAccount.coaCode || String(bankAccount.coaCode).trim().length === 0) {
        throw new Error("COA rekening sumber belum diset. Lengkapi COA pada pengaturan metode pembayaran.");
      }

      const sourceCoa = await this.db.query.chartOfAccounts.findFirst({
        where: eq(chartOfAccounts.code, String(bankAccount.coaCode)),
      });
      if (!sourceCoa) {
        throw new Error(`COA rekening sumber tidak ditemukan: ${bankAccount.coaCode}`);
      }

      // CRITICAL: Validate zakat source bank
      if (data.disbursement_type === "zakat" || normalizedCategory?.startsWith("zakat_to_")) {
        const programs = bankAccount.programs || [];
        if (!programs.includes("zakat")) {
          throw new Error("Zakat disbursements must use a zakat-designated bank account");
        }
      }
    }

    if (data.disbursement_type === "revenue_share") {
      this.validateRevenueShareRecipient(normalizedCategory, data.recipient_type, data.recipient_id);
      const availability = await this.getRevenueShareAvailability(normalizedCategory, data.recipient_id);
      if (data.amount > availability.totalAvailable) {
        throw new Error("Jumlah pencairan melebihi hak bagi hasil yang tersedia");
      }
    }

    const insertData = {
      disbursementNumber: this.generateDisbursementNumber(),
      disbursementType: data.disbursement_type,
      referenceType: data.reference_type,
      referenceId: data.reference_id,
      referenceName: data.reference_name,
      amount: data.amount,
      transactionType: "expense",
      category: normalizedCategory,
      bankAccountId: data.source_bank_id || "pending_source_bank", // Legacy field (NOT NULL)
      sourceBankId: data.source_bank_id || null,
      sourceBankName: bankAccount?.bankName || null,
      sourceBankAccount: bankAccount?.accountNumber || null,
      recipientType: data.recipient_type,
      recipientId: data.recipient_id,
      recipientName: data.recipient_name,
      recipientContact: data.recipient_contact,
      recipientBankName: data.recipient_bank_name,
      recipientBankAccount: data.recipient_bank_account,
      recipientBankAccountName: data.recipient_bank_account_name,
      purpose: data.purpose,
      description: data.description,
      notes: data.notes,
      paymentMethod: data.payment_method,
      typeSpecificData: data.type_specific_data,
      expenseAccountId: null,
      status: "draft",
      createdBy: data.created_by,
    };

    const result = await this.db
      .insert(disbursements)
      .values(insertData as any)
      .returning();

    return result[0];
  }

  async updateStatus(id: string, data: UpdateDisbursementStatusDTO): Promise<UnifiedDisbursement> {
    const existing = await this.db.query.disbursements.findFirst({
      where: eq(disbursements.id, id),
    });

    if (!existing) {
      throw new Error("Disbursement not found");
    }

    const updateData: any = {
      status: data.status,
      updatedAt: new Date(),
    };

    const now = new Date();

    switch (data.status) {
      case "submitted":
        updateData.submittedBy = data.user_id;
        updateData.submittedAt = now;
        break;
      case "approved":
        updateData.approvedBy = data.user_id;
        updateData.approvedAt = now;
        break;
      case "rejected":
        updateData.rejectedBy = data.user_id;
        updateData.rejectedAt = now;
        updateData.rejectionReason = data.rejection_reason;
        break;
      case "paid":
        updateData.paidBy = data.user_id;
        updateData.paidAt = now;
        if (data.payment_proof) {
          updateData.paymentProof = data.payment_proof;
        }
        break;
    }

    if (data.status === "submitted" && existing.disbursementType === "revenue_share") {
      this.validateRevenueShareRecipient(existing.category, existing.recipientType || undefined, existing.recipientId || undefined);
      const availability = await this.getRevenueShareAvailability(existing.category, existing.recipientId || undefined, {
        excludeDisbursementId: existing.id,
      });
      const requestedAmount = Number(existing.amount || 0);
      if (requestedAmount > availability.totalAvailable) {
        throw new Error("Hak bagi hasil sudah berubah. Jumlah melebihi saldo tersedia saat submit.");
      }

      const { shareType, allocations } = await this.buildRevenueShareAllocations(
        existing.category,
        existing.recipientId || undefined,
        requestedAmount,
        { excludeDisbursementId: existing.id }
      );

      const [updated] = await this.db.transaction(async (tx) => {
        await tx
          .delete(disbursementRevenueShareItems)
          .where(eq(disbursementRevenueShareItems.disbursementId, existing.id));

        if (allocations.length > 0) {
          await tx.insert(disbursementRevenueShareItems).values(
            allocations.map((allocation) => ({
              disbursementId: existing.id,
              revenueShareId: allocation.revenueShareId,
              shareType,
              allocatedAmount: allocation.allocatedAmount,
              updatedAt: now,
            }))
          );
        }

        return tx
          .update(disbursements)
          .set(updateData)
          .where(eq(disbursements.id, id))
          .returning();
      });

      return updated;
    }

    const result = await this.db
      .update(disbursements)
      .set(updateData)
      .where(eq(disbursements.id, id))
      .returning();

    return result[0];
  }

  async markAsPaid(id: string, data: MarkAsPaidDTO): Promise<UnifiedDisbursement> {
    const existing = await this.db.query.disbursements.findFirst({
      where: eq(disbursements.id, id),
    });

    if (!existing) {
      throw new Error("Disbursement not found");
    }

    if (existing.status !== "approved") {
      throw new Error("Can only mark approved disbursements as paid");
    }

    // Get bank account details from settings JSON
    const allSettings = await this.db.query.settings.findMany();
    const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
    const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

    let bankAccounts: any[] = [];
    if (bankAccountsSetting?.value) {
      try {
        bankAccounts = JSON.parse(bankAccountsSetting.value);
      } catch (e) {
        throw new Error("Failed to parse bank accounts from settings");
      }
    }

    const bankAccount = bankAccounts.find((b: any) => b.id === data.destination_bank_id);
    if (!bankAccount) {
      throw new Error("Bank account not found");
    }

    if (!bankAccount.coaCode || String(bankAccount.coaCode).trim().length === 0) {
      throw new Error("COA rekening sumber belum diset. Lengkapi COA pada pengaturan metode pembayaran.");
    }

    const destinationCoa = await this.db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.code, String(bankAccount.coaCode)),
    });
    if (!destinationCoa) {
      throw new Error(`COA rekening sumber tidak ditemukan: ${bankAccount.coaCode}`);
    }

    // Update disbursement status to paid
    const updateData: any = {
      status: "paid",
      destinationBankId: data.destination_bank_id,
      transferProofUrl: data.transfer_proof_url,
      transferDate: data.transfer_date,
      transferredAmount: data.transferred_amount,
      additionalFees: data.additional_fees,
      paidBy: data.user_id,
      paidAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db
      .update(disbursements)
      .set(updateData)
      .where(eq(disbursements.id, id))
      .returning();

    // Update bank balance (sesuai blueprint COA)
    const totalDeduction = data.transferred_amount + data.additional_fees;
    await updateBankBalance(this.db, data.destination_bank_id, -totalDeduction);

    if (existing.disbursementType === "revenue_share") {
      const paidAmount = Number(existing.amount || 0);
      if (existing.category === "revenue_share_fundraiser" && existing.recipientId) {
        await this.db
          .update(fundraisers)
          .set({
            currentBalance: sql`${fundraisers.currentBalance} - ${paidAmount}`,
            totalWithdrawn: sql`${fundraisers.totalWithdrawn} + ${paidAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(fundraisers.id, existing.recipientId));
      }

      if (existing.category === "revenue_share_mitra" && existing.recipientId) {
        await this.db
          .update(mitra)
          .set({
            currentBalance: sql`${mitra.currentBalance} - ${paidAmount}`,
            totalWithdrawn: sql`${mitra.totalWithdrawn} + ${paidAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(mitra.id, existing.recipientId));
      }
    }

    return result[0];
  }

  async list(filters: DisbursementFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];

    if (filters.disbursement_type) {
      whereConditions.push(eq(disbursements.disbursementType, filters.disbursement_type));
    }
    if (filters.reference_type) {
      whereConditions.push(eq(disbursements.referenceType, filters.reference_type));
    }
    if (filters.reference_id) {
      whereConditions.push(eq(disbursements.referenceId, filters.reference_id));
    }
    if (filters.status) {
      whereConditions.push(eq(disbursements.status, filters.status));
    }
    if (filters.category) {
      whereConditions.push(eq(disbursements.category, filters.category));
    }
    if (filters.created_by) {
      whereConditions.push(eq(disbursements.createdBy, filters.created_by));
    }
    if (filters.source_bank_id) {
      whereConditions.push(eq(disbursements.sourceBankId, filters.source_bank_id));
    }
    if (filters.recipient_id) {
      whereConditions.push(eq(disbursements.recipientId, filters.recipient_id));
    }
    if (filters.reference_ids && filters.reference_ids.length > 0) {
      whereConditions.push(inArray(disbursements.referenceId, filters.reference_ids));
    }
    if (filters.employee_or_filter) {
      whereConditions.push(
        or(
          eq(disbursements.recipientId, filters.employee_or_filter.recipient_id),
          eq(disbursements.createdBy, filters.employee_or_filter.created_by)
        )!
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const allDisbursements = await this.db.query.disbursements.findMany({
      where: whereClause,
    });
    const total = allDisbursements.length;

    // Get paginated results
    const result = await this.db.query.disbursements.findMany({
      where: whereClause,
      orderBy: [desc(disbursements.createdAt)],
      limit,
      offset,
    });

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStatsForReference(
    referenceId: string,
    disbursementType?: "campaign" | "zakat" | "qurban" | "operational" | "vendor" | "revenue_share"
  ): Promise<{
    totalPaid: number;
    totalCommitted: number;
    countPaid: number;
    countCommitted: number;
    totalProgramAmount: number;
  }> {
    // Get all non-draft, non-rejected disbursements for this reference (from ALL users)
    const allDisbursements = await this.db.query.disbursements.findMany({
      where: and(
        eq(disbursements.referenceId, referenceId),
        ne(disbursements.status, "draft"),
        ne(disbursements.status, "rejected"),
      ),
    });

    const paidDisbursements = allDisbursements.filter(d => d.status === "paid");
    const committedDisbursements = allDisbursements; // submitted + approved + paid

    const revenueShareConditions = [eq(transactions.productId, referenceId)];
    if (disbursementType === "campaign" || disbursementType === "zakat" || disbursementType === "qurban") {
      revenueShareConditions.push(eq(transactions.productType, disbursementType));
    }

    const [programStats] = await this.db
      .select({
        totalProgramAmount: sql<number>`coalesce(sum(${revenueShares.programAmount}), 0)`,
      })
      .from(revenueShares)
      .innerJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .where(and(...revenueShareConditions));

    return {
      totalPaid: paidDisbursements.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      totalCommitted: committedDisbursements.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      countPaid: paidDisbursements.length,
      countCommitted: committedDisbursements.length,
      totalProgramAmount: Number(programStats?.totalProgramAmount || 0),
    };
  }

  async getById(id: string): Promise<UnifiedDisbursement | undefined> {
    const result = await this.db.query.disbursements.findFirst({
      where: eq(disbursements.id, id),
    });

    return result;
  }

  async getByDisbursementNumber(disbursementNumber: string): Promise<UnifiedDisbursement | undefined> {
    const result = await this.db.query.disbursements.findFirst({
      where: eq(disbursements.disbursementNumber, disbursementNumber),
    });

    return result;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.query.disbursements.findFirst({
      where: eq(disbursements.id, id),
    });

    if (!existing) {
      throw new Error("Disbursement not found");
    }

    // Only allow deleting draft, submitted, or rejected disbursements
    if (!["draft", "submitted", "rejected"].includes(existing.status)) {
      throw new Error("Tidak dapat menghapus pencairan yang sudah disetujui atau dibayar");
    }

    await this.db.delete(disbursements).where(eq(disbursements.id, id));
  }

  // Activity Report Methods (for zakat coordinator distributions)
  async addActivityReport(
    disbursementId: string,
    data: {
      report_date: Date;
      report_description: string;
      photos?: string;
      video_url?: string;
      recipient_count?: number;
      recipient_list?: string;
      added_by: string;
    }
  ): Promise<DisbursementActivityReport> {
    // Validate disbursement exists
    const disbursement = await this.getById(disbursementId);
    if (!disbursement) {
      throw new Error("Disbursement not found");
    }

    // Validate it's a zakat disbursement
    if (disbursement.disbursementType !== "zakat") {
      throw new Error("Activity reports are only for zakat disbursements");
    }

    const result = await this.db
      .insert(disbursementActivityReports)
      .values({
        disbursementId,
        reportDate: data.report_date,
        reportDescription: data.report_description,
        photos: data.photos,
        videoUrl: data.video_url,
        recipientCount: data.recipient_count,
        recipientList: data.recipient_list,
        addedBy: data.added_by,
      } as any)
      .returning();

    return result[0];
  }

  async getActivityReports(disbursementId: string): Promise<DisbursementActivityReport[]> {
    const reports = await this.db.query.disbursementActivityReports.findMany({
      where: eq(disbursementActivityReports.disbursementId, disbursementId),
      orderBy: [desc(disbursementActivityReports.reportDate)],
    });

    return reports;
  }
}
