import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  campaigns,
  fundraiserReferrals,
  fundraisers,
  mitra,
  qurbanPackagePeriods,
  qurbanPackages,
  revenueShares,
  settings,
  transactions,
  zakatPeriods,
  zakatTypes,
  type Database,
  type RevenueShare,
} from "@bantuanku/db";

interface RevenueShareListFilters {
  transactionId?: string;
  fundraiserId?: string;
  mitraId?: string;
  status?: string;
  productType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

interface AmilSettings {
  amilZakatPercentage: number;
  amilDonationPercentage: number;
  amilFundraiserPercentage: number;
  amilMitraPercentage: number;
  amilMitraDonationPercentage: number;
  amilDeveloperPercentage: number;
  amilQurbanOwnerPercentage: number;
}

interface CalculateResult {
  skipped: boolean;
  reason?: string;
  data?: RevenueShare;
}

export class RevenueShareService {
  constructor(private db: Database) {}

  private parsePercentage(value: string | null | undefined, fallback: number): number {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private percentageToString(value: number): string {
    return value.toFixed(2);
  }

  private calculateAmount(baseAmount: number, percentage: number): number {
    return Math.floor((baseAmount * percentage) / 100);
  }

  private async getAmilSettings(): Promise<AmilSettings> {
    const amilRows = await this.db.query.settings.findMany({
      where: eq(settings.category, "amil"),
    });

    const map = new Map(amilRows.map((row) => [row.key, row.value]));

    return {
      amilZakatPercentage: this.parsePercentage(map.get("amil_zakat_percentage"), 12.5),
      amilDonationPercentage: this.parsePercentage(map.get("amil_donation_percentage"), 20),
      amilFundraiserPercentage: this.parsePercentage(map.get("amil_fundraiser_percentage"), 0),
      amilMitraPercentage: this.parsePercentage(map.get("amil_mitra_percentage"), 0),
      amilMitraDonationPercentage: this.parsePercentage(map.get("amil_mitra_donation_percentage"), 0),
      amilDeveloperPercentage: this.parsePercentage(map.get("amil_developer_percentage"), 0),
      amilQurbanOwnerPercentage: this.parsePercentage(map.get("amil_qurban_owner_percentage"), 0),
    };
  }

  private async syncFundraiserCommission(
    transaction: typeof transactions.$inferSelect,
    fundraiserPercentage: number,
    fundraiserAmount: number
  ): Promise<void> {
    const referral = await this.db.query.fundraiserReferrals.findFirst({
      where: eq(fundraiserReferrals.transactionId, transaction.id),
    });

    if (!referral) {
      if (!transaction.referredByFundraiserId || fundraiserAmount <= 0) return;

      await this.db.insert(fundraiserReferrals).values({
        fundraiserId: transaction.referredByFundraiserId,
        transactionId: transaction.id,
        donationAmount: transaction.totalAmount,
        commissionPercentage: this.percentageToString(fundraiserPercentage),
        commissionAmount: fundraiserAmount,
        status: "paid",
        paidAt: new Date(),
      });

      await this.db
        .update(fundraisers)
        .set({
          totalReferrals: sql`${fundraisers.totalReferrals} + 1`,
          totalDonationAmount: sql`${fundraisers.totalDonationAmount} + ${transaction.totalAmount}`,
          totalCommissionEarned: sql`${fundraisers.totalCommissionEarned} + ${fundraiserAmount}`,
          currentBalance: sql`${fundraisers.currentBalance} + ${fundraiserAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(fundraisers.id, transaction.referredByFundraiserId));
      return;
    }

    const previousAmount = referral.commissionAmount || 0;
    const delta = fundraiserAmount - previousAmount;

    await this.db
      .update(fundraiserReferrals)
      .set({
        commissionPercentage: this.percentageToString(fundraiserPercentage),
        commissionAmount: fundraiserAmount,
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fundraiserReferrals.id, referral.id));

    if (delta !== 0) {
      await this.db
        .update(fundraisers)
        .set({
          totalCommissionEarned: sql`${fundraisers.totalCommissionEarned} + ${delta}`,
          currentBalance: sql`${fundraisers.currentBalance} + ${delta}`,
          updatedAt: new Date(),
        })
        .where(eq(fundraisers.id, referral.fundraiserId));
    }
  }

  private async applyMitraRevenue(mitraId: string, donationAmount: number, mitraAmount: number): Promise<void> {
    if (mitraAmount <= 0) return;

    await this.db
      .update(mitra)
      .set({
        totalDonationReceived: sql`${mitra.totalDonationReceived} + ${donationAmount}`,
        totalRevenueEarned: sql`${mitra.totalRevenueEarned} + ${mitraAmount}`,
        currentBalance: sql`${mitra.currentBalance} + ${mitraAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(mitra.id, mitraId));
  }

  async calculateForPaidTransaction(transactionId: string): Promise<CalculateResult> {
    const transaction = await this.db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.paymentStatus !== "paid") {
      throw new Error("Revenue sharing can only be calculated for paid transactions");
    }

    const existing = await this.db.query.revenueShares.findFirst({
      where: eq(revenueShares.transactionId, transactionId),
    });
    if (existing) {
      return { skipped: false, data: existing };
    }

    const typeData = (transaction.typeSpecificData || {}) as Record<string, any>;
    if (typeData.is_admin_fee_entry) {
      await this.syncFundraiserCommission(transaction, 0, 0);
      return { skipped: true, reason: "qurban_admin_fee_entry" };
    }

    const amil = await this.getAmilSettings();
    if (amil.amilQurbanOwnerPercentage < 0 || amil.amilQurbanOwnerPercentage > 100) {
      throw new Error("Prosentasi Biaya Admin Qurban (Pemilik Aplikasi) harus 0-100");
    }

    let resolvedMitraId: string | null = null;
    let isQurbanMitra = false;
    let campaignPillar: string | null = typeof typeData.pillar === "string" ? typeData.pillar : null;

    if (transaction.productType === "campaign") {
      const campaign = await this.db.query.campaigns.findFirst({
        where: eq(campaigns.id, transaction.productId),
        columns: {
          id: true,
          pillar: true,
          mitraId: true,
        },
      });
      if (campaign) {
        campaignPillar = campaignPillar || campaign.pillar;
        resolvedMitraId = campaign.mitraId;
      }
    } else if (transaction.productType === "zakat") {
      const zakatTypeIdFromPayload = typeof typeData.zakat_type_id === "string"
        ? typeData.zakat_type_id
        : typeof typeData.zakatTypeId === "string"
          ? typeData.zakatTypeId
          : null;
      let candidateZakatTypeId: string | null = zakatTypeIdFromPayload;

      const zakatPeriod = await this.db.query.zakatPeriods.findFirst({
        where: eq(zakatPeriods.id, transaction.productId),
        columns: {
          mitraId: true,
          zakatTypeId: true,
        },
      });
      resolvedMitraId = zakatPeriod?.mitraId || null;
      candidateZakatTypeId = candidateZakatTypeId || zakatPeriod?.zakatTypeId || null;

      // Fallback untuk alur baru: ownership zakat bisa dari zakat_type.created_by
      // meski period bersifat global (mitra_id null), atau transaksi legacy yang
      // product_id langsung ke zakat_type_id.
      if (!candidateZakatTypeId) {
        const zakatTypeDirect = await this.db.query.zakatTypes.findFirst({
          where: eq(zakatTypes.id, transaction.productId),
          columns: { id: true },
        });
        candidateZakatTypeId = zakatTypeDirect?.id || null;
      }

      if (!resolvedMitraId && candidateZakatTypeId) {
        const zakatType = await this.db.query.zakatTypes.findFirst({
          where: eq(zakatTypes.id, candidateZakatTypeId),
          columns: { createdBy: true },
        });

        if (zakatType?.createdBy) {
          const mitraRecord = await this.db.query.mitra.findFirst({
            where: eq(mitra.userId, zakatType.createdBy),
            columns: { id: true },
          });
          resolvedMitraId = mitraRecord?.id || null;
        }
      }
    } else if (transaction.productType === "qurban") {
      const packagePeriod = await this.db
        .select({
          createdBy: qurbanPackages.createdBy,
        })
        .from(qurbanPackagePeriods)
        .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
        .where(eq(qurbanPackagePeriods.id, transaction.productId))
        .limit(1);

      const packageOwnerUserId = packagePeriod[0]?.createdBy || null;
      if (packageOwnerUserId) {
        const mitraRecord = await this.db.query.mitra.findFirst({
          where: eq(mitra.userId, packageOwnerUserId),
          columns: { id: true },
        });
        if (mitraRecord?.id) {
          resolvedMitraId = mitraRecord.id;
          isQurbanMitra = true;
        }
      }
    }

    const normalizedPillar = (campaignPillar || "").trim().toLowerCase();
    if (
      transaction.productType === "campaign" &&
      (normalizedPillar === "wakaf" || normalizedPillar === "fidyah")
    ) {
      await this.syncFundraiserCommission(transaction, 0, 0);
      return { skipped: true, reason: normalizedPillar };
    }

    const isQurban = transaction.productType === "qurban";
    const basisAmount = isQurban ? transaction.adminFee || 0 : transaction.totalAmount;

    if (isQurban && basisAmount <= 0) {
      await this.syncFundraiserCommission(transaction, 0, 0);
      return { skipped: true, reason: "qurban_admin_fee_zero" };
    }

    const amilPercentage = isQurban
      ? (isQurbanMitra ? amil.amilQurbanOwnerPercentage : 100)
      : transaction.productType === "zakat"
        ? amil.amilZakatPercentage
        : amil.amilDonationPercentage;
    const amilTotalAmount = isQurban
      ? (isQurbanMitra ? this.calculateAmount(basisAmount, amilPercentage) : basisAmount)
      : this.calculateAmount(basisAmount, amilPercentage);

    const developerPercentage = amil.amilDeveloperPercentage;
    // Developer/fundraiser tetap dihitung dari basis transaksi (admin fee untuk qurban),
    // bukan dari porsi owner app.
    const deductionBaseAmount = basisAmount;
    const developerAmount = this.calculateAmount(deductionBaseAmount, developerPercentage);

    const fundraiserPercentage = transaction.referredByFundraiserId
      ? amil.amilFundraiserPercentage
      : 0;
    const fundraiserAmount = transaction.referredByFundraiserId
      ? this.calculateAmount(deductionBaseAmount, fundraiserPercentage)
      : 0;

    const mitraPercentage = isQurban
      ? (isQurbanMitra ? Math.max(0, 100 - amilPercentage) : 0)
      : transaction.productType === "zakat"
        ? (resolvedMitraId ? amil.amilMitraPercentage : 0)
        : (resolvedMitraId ? amil.amilMitraDonationPercentage : 0);
    const mitraAmount = isQurban
      ? (isQurbanMitra ? basisAmount - amilTotalAmount : 0)
      : (resolvedMitraId ? this.calculateAmount(basisAmount, mitraPercentage) : 0);

    if (!isQurban) {
      const totalDeductionPercentage = developerPercentage + fundraiserPercentage + mitraPercentage;
      if (totalDeductionPercentage > amilPercentage) {
        throw new Error("Total potongan melebihi persentase amil");
      }
    }

    const amilNetAmount = isQurban
      ? amilTotalAmount - developerAmount - fundraiserAmount
      : amilTotalAmount - developerAmount - fundraiserAmount - mitraAmount;
    if (amilNetAmount < 0) {
      throw new Error("Total potongan melebihi bagian amil");
    }

    const programAmount = isQurban ? 0 : basisAmount - amilTotalAmount;

    let inserted: RevenueShare;
    try {
      const [row] = await this.db
        .insert(revenueShares)
        .values({
          transactionId: transaction.id,
          donationAmount: basisAmount,
          amilPercentage: this.percentageToString(amilPercentage),
          amilTotalAmount,
          developerPercentage: this.percentageToString(developerPercentage),
          developerAmount,
          fundraiserPercentage: this.percentageToString(fundraiserPercentage),
          fundraiserAmount,
          fundraiserId: transaction.referredByFundraiserId,
          mitraPercentage: this.percentageToString(mitraPercentage),
          mitraAmount,
          mitraId: resolvedMitraId,
          amilNetAmount,
          programAmount,
          status: "calculated",
        })
        .returning();

      inserted = row;
    } catch (err: any) {
      if (String(err?.message || "").includes("idx_revenue_shares_transaction")) {
        const duplicate = await this.db.query.revenueShares.findFirst({
          where: eq(revenueShares.transactionId, transaction.id),
        });
        if (duplicate) return { skipped: false, data: duplicate };
      }
      throw err;
    }

    await this.syncFundraiserCommission(transaction, fundraiserPercentage, fundraiserAmount);

    if (resolvedMitraId) {
      await this.applyMitraRevenue(resolvedMitraId, basisAmount, mitraAmount);
    }

    return { skipped: false, data: inserted };
  }

  async list(filters: RevenueShareListFilters = {}) {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    const offset = (page - 1) * limit;

    const whereConditions: any[] = [];
    whereConditions.push(eq(transactions.paymentStatus, "paid"));
    if (filters.transactionId) {
      whereConditions.push(eq(revenueShares.transactionId, filters.transactionId));
    }
    if (filters.fundraiserId) {
      whereConditions.push(eq(revenueShares.fundraiserId, filters.fundraiserId));
    }
    if (filters.mitraId) {
      whereConditions.push(eq(revenueShares.mitraId, filters.mitraId));
    }
    if (filters.status) {
      whereConditions.push(eq(revenueShares.status, filters.status));
    }
    if (filters.productType) {
      whereConditions.push(eq(transactions.productType, filters.productType));
    }
    if (filters.dateFrom) {
      whereConditions.push(gte(revenueShares.calculatedAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      whereConditions.push(lte(revenueShares.calculatedAt, filters.dateTo));
    }
    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

    const rows = await this.db
      .select({
        id: revenueShares.id,
        transactionId: revenueShares.transactionId,
        donationAmount: revenueShares.donationAmount,
        amilPercentage: revenueShares.amilPercentage,
        amilTotalAmount: revenueShares.amilTotalAmount,
        developerPercentage: revenueShares.developerPercentage,
        developerAmount: revenueShares.developerAmount,
        fundraiserPercentage: revenueShares.fundraiserPercentage,
        fundraiserAmount: revenueShares.fundraiserAmount,
        fundraiserId: revenueShares.fundraiserId,
        mitraPercentage: revenueShares.mitraPercentage,
        mitraAmount: revenueShares.mitraAmount,
        mitraId: revenueShares.mitraId,
        amilNetAmount: revenueShares.amilNetAmount,
        programAmount: revenueShares.programAmount,
        status: revenueShares.status,
        calculatedAt: revenueShares.calculatedAt,
        distributedAt: revenueShares.distributedAt,
        createdAt: revenueShares.createdAt,
        updatedAt: revenueShares.updatedAt,
        transactionNumber: transactions.transactionNumber,
        productType: transactions.productType,
        productName: transactions.productName,
        fundraiserCode: fundraisers.code,
        fundraiserSlug: fundraisers.slug,
        mitraName: mitra.name,
      })
      .from(revenueShares)
      .leftJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .leftJoin(fundraisers, eq(revenueShares.fundraiserId, fundraisers.id))
      .leftJoin(mitra, eq(revenueShares.mitraId, mitra.id))
      .where(whereClause)
      .orderBy(desc(transactions.paidAt), desc(revenueShares.calculatedAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await this.db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(revenueShares)
      .leftJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .where(whereClause);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countRow?.total || 0),
        totalPages: Math.ceil(Number(countRow?.total || 0) / limit) || 1,
      },
    };
  }

  async summary(filters: Omit<RevenueShareListFilters, "page" | "limit"> = {}) {
    const whereConditions: any[] = [];
    whereConditions.push(eq(transactions.paymentStatus, "paid"));
    if (filters.transactionId) {
      whereConditions.push(eq(revenueShares.transactionId, filters.transactionId));
    }
    if (filters.fundraiserId) {
      whereConditions.push(eq(revenueShares.fundraiserId, filters.fundraiserId));
    }
    if (filters.mitraId) {
      whereConditions.push(eq(revenueShares.mitraId, filters.mitraId));
    }
    if (filters.status) {
      whereConditions.push(eq(revenueShares.status, filters.status));
    }
    if (filters.productType) {
      whereConditions.push(eq(transactions.productType, filters.productType));
    }
    if (filters.dateFrom) {
      whereConditions.push(gte(revenueShares.calculatedAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      whereConditions.push(lte(revenueShares.calculatedAt, filters.dateTo));
    }
    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

    const [row] = await this.db
      .select({
        totalRecords: sql<number>`count(*)`,
        totalDonationAmount: sql<number>`COALESCE(SUM(${revenueShares.donationAmount}), 0)`,
        totalAmilAmount: sql<number>`COALESCE(SUM(${revenueShares.amilTotalAmount}), 0)`,
        totalAmilNet: sql<number>`COALESCE(SUM(${revenueShares.amilNetAmount}), 0)`,
        totalDeveloper: sql<number>`COALESCE(SUM(${revenueShares.developerAmount}), 0)`,
        totalFundraiser: sql<number>`COALESCE(SUM(${revenueShares.fundraiserAmount}), 0)`,
        totalMitra: sql<number>`COALESCE(SUM(${revenueShares.mitraAmount}), 0)`,
        totalProgram: sql<number>`COALESCE(SUM(${revenueShares.programAmount}), 0)`,
      })
      .from(revenueShares)
      .leftJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .where(whereClause);

    return {
      totalRecords: Number(row?.totalRecords || 0),
      totalDonationAmount: Number(row?.totalDonationAmount || 0),
      totalAmilAmount: Number(row?.totalAmilAmount || 0),
      totalAmilNet: Number(row?.totalAmilNet || 0),
      totalDeveloper: Number(row?.totalDeveloper || 0),
      totalFundraiser: Number(row?.totalFundraiser || 0),
      totalMitra: Number(row?.totalMitra || 0),
      totalProgram: Number(row?.totalProgram || 0),
    };
  }

  async getById(id: string) {
    const [row] = await this.db
      .select({
        id: revenueShares.id,
        transactionId: revenueShares.transactionId,
        donationAmount: revenueShares.donationAmount,
        amilPercentage: revenueShares.amilPercentage,
        amilTotalAmount: revenueShares.amilTotalAmount,
        developerPercentage: revenueShares.developerPercentage,
        developerAmount: revenueShares.developerAmount,
        fundraiserPercentage: revenueShares.fundraiserPercentage,
        fundraiserAmount: revenueShares.fundraiserAmount,
        fundraiserId: revenueShares.fundraiserId,
        mitraPercentage: revenueShares.mitraPercentage,
        mitraAmount: revenueShares.mitraAmount,
        mitraId: revenueShares.mitraId,
        amilNetAmount: revenueShares.amilNetAmount,
        programAmount: revenueShares.programAmount,
        status: revenueShares.status,
        calculatedAt: revenueShares.calculatedAt,
        distributedAt: revenueShares.distributedAt,
        createdAt: revenueShares.createdAt,
        updatedAt: revenueShares.updatedAt,
        transactionNumber: transactions.transactionNumber,
        productType: transactions.productType,
        productId: transactions.productId,
        productName: transactions.productName,
        donorName: transactions.donorName,
        totalAmount: transactions.totalAmount,
        paymentStatus: transactions.paymentStatus,
        fundraiserCode: fundraisers.code,
        fundraiserSlug: fundraisers.slug,
        mitraName: mitra.name,
      })
      .from(revenueShares)
      .leftJoin(transactions, eq(revenueShares.transactionId, transactions.id))
      .leftJoin(fundraisers, eq(revenueShares.fundraiserId, fundraisers.id))
      .leftJoin(mitra, eq(revenueShares.mitraId, mitra.id))
      .where(eq(revenueShares.id, id))
      .limit(1);

    return row;
  }
}
