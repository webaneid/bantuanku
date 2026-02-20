import { eq, and, desc, like, or, sql } from "drizzle-orm";
import {
  transactions,
  transactionPayments,
  campaigns,
  zakatTypes,
  zakatPeriods,
  qurbanPackagePeriods,
  qurbanPackages,
  qurbanPeriods,
  qurbanSharedGroups,
  donatur,
  fundraisers,
  fundraiserReferrals,
  createId,
  type Database,
  type NewTransaction,
  type Transaction,
} from "@bantuanku/db";

interface CreateTransactionDTO {
  product_type: "campaign" | "zakat" | "qurban";
  product_id: string;
  quantity?: number;
  unit_price?: number;
  admin_fee?: number;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donatur_id?: string;
  is_anonymous?: boolean;
  message?: string;
  payment_method_id?: string;
  type_specific_data?: Record<string, any>;
  user_id?: string;
  include_unique_code?: boolean;
  referred_by_fundraiser_code?: string;
}

interface TransactionFilters {
  product_type?: string;
  product_id?: string;
  status?: string;
  donor_email?: string;
  user_id?: string;
  donatur_id?: string;
  page?: number;
  limit?: number;
}

export class TransactionService {
  constructor(private db: Database) {}

  private generateTransactionNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-5);
    return `TRX-${year}${month}${day}-${timestamp}`;
  }

  private normalizePhone(input: string): string {
    let cleaned = input.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+62")) {
      cleaned = "0" + cleaned.substring(3);
    } else if (cleaned.startsWith("62") && cleaned.length > 10) {
      cleaned = "0" + cleaned.substring(2);
    }
    if (cleaned && !cleaned.startsWith("0")) {
      cleaned = "0" + cleaned;
    }
    return cleaned;
  }

  private normalizeEmail(input?: string): string | undefined {
    return input?.toLowerCase().trim();
  }

  private async findOrCreateDonatur(data: {
    name: string;
    email?: string;
    phone?: string;
  }): Promise<string> {
    const normalizedEmail = data.email?.toLowerCase().trim();
    const normalizedPhone = data.phone ? this.normalizePhone(data.phone) : undefined;

    // Try to find existing donatur by email or phone
    const conditions = [];
    if (normalizedEmail) {
      conditions.push(eq(donatur.email, normalizedEmail));
    }
    if (normalizedPhone) {
      conditions.push(eq(donatur.phone, normalizedPhone));
      conditions.push(eq(donatur.whatsappNumber, normalizedPhone));
    }

    if (conditions.length > 0) {
      const existing = await this.db.query.donatur.findFirst({
        where: or(...conditions),
      });

      if (existing) {
        return existing.id;
      }
    }

    // Create new donatur
    const donaturId = createId();
    await this.db.insert(donatur).values({
      id: donaturId,
      name: data.name,
      email: normalizedEmail || `donor-${donaturId}@temp.local`,
      phone: normalizedPhone,
      whatsappNumber: normalizedPhone,
    });

    return donaturId;
  }

  async getProduct(productType: string, productId: string) {
    switch (productType) {
      case "campaign": {
        const campaign = await this.db.query.campaigns.findFirst({
          where: eq(campaigns.id, productId),
        });
        if (!campaign) throw new Error("Campaign not found");
        return {
          name: campaign.title,
          title: campaign.title,
          description: campaign.description,
          image: campaign.imageUrl,
          price: null, // Campaign tidak punya fixed price
          pillar: campaign.pillar,
        };
      }
      case "zakat": {
        const zakatPeriod = await this.db.query.zakatPeriods.findFirst({
          where: eq(zakatPeriods.id, productId),
          with: {
            zakatType: true,
          },
        });
        if (!zakatPeriod) throw new Error("Zakat period not found");
        return {
          name: zakatPeriod.name,
          description: zakatPeriod.zakatType?.description || zakatPeriod.description,
          image: zakatPeriod.zakatType?.imageUrl,
          price: null, // Zakat tidak punya fixed price
        };
      }
      case "qurban": {
        const qurbanPackagePeriod = await this.db.query.qurbanPackagePeriods.findFirst({
          where: eq(qurbanPackagePeriods.id, productId),
          with: {
            package: true,
            period: true,
          },
        });
        if (!qurbanPackagePeriod) throw new Error("Qurban package period not found");
        return {
          name: qurbanPackagePeriod.package.name,
          description: qurbanPackagePeriod.package.description,
          image: qurbanPackagePeriod.package.imageUrl,
          price: qurbanPackagePeriod.price,
        };
      }
      default:
        throw new Error(`Unknown product type: ${productType}`);
    }
  }

  private getCategoryFromTransaction(productType: string, productName: string, typeSpecificData?: any): string {
    if (productType === 'zakat') {
      // Determine zakat type from product name or type_specific_data
      const name = productName.toLowerCase();
      if (name.includes('fitrah')) return 'zakat_fitrah';
      if (name.includes('maal')) return 'zakat_maal';
      if (name.includes('profesi') || name.includes('penghasilan')) return 'zakat_profesi';
      if (name.includes('pertanian')) return 'zakat_pertanian';
      if (name.includes('peternakan')) return 'zakat_peternakan';
      if (name.includes('bisnis') || name.includes('perdagangan')) return 'zakat_bisnis';
      return 'zakat_maal'; // default
    }

    if (productType === 'qurban') {
      // Check if it's savings or regular payment
      const paymentType = typeSpecificData?.payment_type;
      return paymentType === 'savings' ? 'qurban_savings' : 'qurban_payment';
    }

    // Default: campaign donation
    return 'campaign_donation';
  }

  private async generateUniqueCode(totalAmount: number): Promise<number> {
    const pending = await this.db
      .select({ uniqueCode: transactions.uniqueCode })
      .from(transactions)
      .where(
        and(
          eq(transactions.paymentStatus, "pending"),
          eq(transactions.totalAmount, totalAmount)
        )
      );

    const usedCodes = new Set(
      pending.map(t => t.uniqueCode).filter((c): c is number => c !== null && c > 0)
    );

    if (usedCodes.size >= 999) return 0;

    let code: number;
    do {
      code = Math.floor(Math.random() * 999) + 1;
    } while (usedCodes.has(code));

    return code;
  }

  /**
   * For shared qurban packages: find an open group or create a new one.
   * Returns { shared_group_id, group_number, group_max_slots } to store in typeSpecificData.
   */
  private async assignSharedGroup(packagePeriodId: string, packageId: string, maxSlots: number) {
    // Find open group with available slots
    const openGroup = await this.db
      .select()
      .from(qurbanSharedGroups)
      .where(
        and(
          eq(qurbanSharedGroups.packagePeriodId, packagePeriodId),
          eq(qurbanSharedGroups.status, "open"),
          sql`${qurbanSharedGroups.slotsFilled} < ${qurbanSharedGroups.maxSlots}`
        )
      )
      .limit(1);

    if (openGroup.length > 0) {
      return {
        shared_group_id: openGroup[0].id,
        group_number: openGroup[0].groupNumber,
        group_max_slots: openGroup[0].maxSlots,
      };
    }

    // No open group — create new one
    const existingGroups = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(qurbanSharedGroups)
      .where(eq(qurbanSharedGroups.packagePeriodId, packagePeriodId));

    const groupNumber = Number(existingGroups[0].count) + 1;

    const newGroup = await this.db
      .insert(qurbanSharedGroups)
      .values({
        id: createId(),
        packageId,
        packagePeriodId,
        groupNumber,
        maxSlots,
        slotsFilled: 0,
        status: "open",
      })
      .returning();

    return {
      shared_group_id: newGroup[0].id,
      group_number: newGroup[0].groupNumber,
      group_max_slots: newGroup[0].maxSlots,
    };
  }

  /**
   * After payment is confirmed (paid), increment the shared group slot.
   * If group is now full, mark status as "full".
   */
  async confirmSharedGroupSlot(transactionId: string) {
    const txn = await this.db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });
    if (!txn || txn.productType !== "qurban") return;

    const typeData = txn.typeSpecificData as any;
    if (!typeData?.shared_group_id || typeData?.package_type !== "shared") return;

    const group = await this.db.query.qurbanSharedGroups.findFirst({
      where: eq(qurbanSharedGroups.id, typeData.shared_group_id),
    });
    if (!group) return;

    const newSlotsFilled = group.slotsFilled + 1;
    const newStatus = newSlotsFilled >= group.maxSlots ? "full" : "open";

    await this.db
      .update(qurbanSharedGroups)
      .set({
        slotsFilled: newSlotsFilled,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(qurbanSharedGroups.id, group.id));

    // Also update package-period slotsFilled
    await this.db
      .update(qurbanPackagePeriods)
      .set({
        slotsFilled: sql`${qurbanPackagePeriods.slotsFilled} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(qurbanPackagePeriods.id, txn.productId));
  }

  /**
   * When a transaction is cancelled/expired, release the reserved shared group slot if not yet paid.
   */
  async releaseSharedGroupSlot(transactionId: string) {
    const txn = await this.db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });
    if (!txn || txn.productType !== "qurban") return;

    const typeData = txn.typeSpecificData as any;
    if (!typeData?.shared_group_id || typeData?.package_type !== "shared") return;
    // Only release if payment was never confirmed (slot was never incremented)
    if (txn.paymentStatus === "paid") return;

    // Nothing to release — slots are only incremented on payment confirmation
    // This method exists as a hook for future reservation-based logic
  }

  async create(data: CreateTransactionDTO): Promise<Transaction> {
    const product = await this.getProduct(data.product_type, data.product_id);

    const quantity = data.quantity || 1;
    const unitPrice = data.unit_price || product.price || 0;
    const subtotal = quantity * unitPrice;
    const adminFee = data.admin_fee || 0;
    const totalAmount = subtotal + adminFee;
    const uniqueCode = data.include_unique_code === false ? 0 : await this.generateUniqueCode(totalAmount);

    // Determine category based on product type (simple category names, not COA codes)
    const category = this.getCategoryFromTransaction(
      data.product_type,
      product.name || product.title || "",
      data.type_specific_data
    );

    // Use provided donatur_id or find/create donatur record
    const donaturId = data.donatur_id || await this.findOrCreateDonatur({
      name: data.donor_name,
      email: data.donor_email,
      phone: data.donor_phone,
    });

    // Lookup fundraiser by referral code (self-referral protection)
    let referredByFundraiserId: string | null = null;
    let fundraiser: any = null;
    if (data.referred_by_fundraiser_code) {
      fundraiser = await this.db.query.fundraisers.findFirst({
        where: and(
          eq(fundraisers.code, data.referred_by_fundraiser_code.toUpperCase()),
          eq(fundraisers.status, "active")
        ),
      });
      if (fundraiser) {
        // Self-referral check: donor cannot refer themselves
        let isSelfReferral = Boolean(fundraiser.donaturId && fundraiser.donaturId === donaturId);

        // Fallback protection: compare normalized donor identity (email/phone)
        if (!isSelfReferral && fundraiser.donaturId) {
          const fundraiserDonatur = await this.db.query.donatur.findFirst({
            where: eq(donatur.id, fundraiser.donaturId),
          });

          if (fundraiserDonatur) {
            const donorEmail = this.normalizeEmail(data.donor_email);
            const donorPhone = data.donor_phone ? this.normalizePhone(data.donor_phone) : undefined;

            const ownerEmail = this.normalizeEmail(fundraiserDonatur.email);
            const ownerPhone = fundraiserDonatur.phone ? this.normalizePhone(fundraiserDonatur.phone) : undefined;
            const ownerWhatsapp = fundraiserDonatur.whatsappNumber
              ? this.normalizePhone(fundraiserDonatur.whatsappNumber)
              : undefined;

            const sameEmail = Boolean(donorEmail && ownerEmail && donorEmail === ownerEmail);
            const samePhone = Boolean(
              donorPhone &&
              (donorPhone === ownerPhone || donorPhone === ownerWhatsapp)
            );

            if (sameEmail || samePhone) {
              isSelfReferral = true;
            }
          }
        }

        if (isSelfReferral) {
          fundraiser = null; // Skip referral and commission
        } else {
          referredByFundraiserId = fundraiser.id;
        }
      }
    }

    // Handle shared group assignment for qurban patungan
    let sharedGroupData: Record<string, any> = {};
    if (data.product_type === "qurban" && data.type_specific_data?.package_type === "shared") {
      const packagePeriodId = data.product_id;
      const packageId = data.type_specific_data.package_id;

      // Get maxSlots from the package
      const pkg = await this.db.query.qurbanPackages.findFirst({
        where: eq(qurbanPackages.id, packageId),
      });
      const maxSlots = pkg?.maxSlots || 7;

      sharedGroupData = await this.assignSharedGroup(packagePeriodId, packageId, maxSlots);
    }

    const result = await this.db
      .insert(transactions)
      .values({
        transactionNumber: this.generateTransactionNumber(),
        productType: data.product_type,
        productId: data.product_id,
        productName: product.name || product.title || "",
        productDescription: product.description,
        productImage: product.image,
        quantity,
        unitPrice,
        subtotal,
        adminFee,
        totalAmount,
        uniqueCode,
        donorName: data.donor_name,
        donorEmail: data.donor_email,
        donorPhone: data.donor_phone,
        isAnonymous: data.is_anonymous || false,
        userId: data.user_id,
        donaturId: donaturId,
        paymentMethodId: data.payment_method_id,
        referredByFundraiserId,
        typeSpecificData: {
          ...data.type_specific_data,
          ...sharedGroupData,
          ...(data.product_type === 'campaign' && product.pillar ? { pillar: product.pillar } : {}),
        },
        message: data.message,
        category,
        transactionType: "income",
        paymentStatus: "pending",
        paidAmount: 0,
      } as any)
      .returning();

    // Create fundraiser referral record
    if (fundraiser && referredByFundraiserId) {
      const commissionPct = parseFloat(fundraiser.commissionPercentage || "5.00");
      const commissionAmount = Math.floor(totalAmount * commissionPct / 100);

      await this.db.insert(fundraiserReferrals).values({
        fundraiserId: referredByFundraiserId,
        transactionId: result[0].id,
        donationAmount: totalAmount,
        commissionPercentage: fundraiser.commissionPercentage || "5.00",
        commissionAmount,
        status: "pending",
      });

      // Update fundraiser stats
      await this.db
        .update(fundraisers)
        .set({
          totalReferrals: (fundraiser.totalReferrals || 0) + 1,
          totalDonationAmount: (fundraiser.totalDonationAmount || 0) + totalAmount,
          totalCommissionEarned: (fundraiser.totalCommissionEarned || 0) + commissionAmount,
          currentBalance: (fundraiser.currentBalance || 0) + commissionAmount,
          updatedAt: new Date(),
        })
        .where(eq(fundraisers.id, referredByFundraiserId));
    }

    return result[0];
  }

  async list(filters: TransactionFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];

    if (filters.product_type) {
      whereConditions.push(eq(transactions.productType, filters.product_type));
    }
    if (filters.product_id) {
      whereConditions.push(eq(transactions.productId, filters.product_id));
    }
    if (filters.status) {
      whereConditions.push(eq(transactions.paymentStatus, filters.status));
    }
    if (filters.donor_email) {
      whereConditions.push(like(transactions.donorEmail, `%${filters.donor_email}%`));
    }
    if (filters.user_id) {
      whereConditions.push(eq(transactions.userId, filters.user_id));
    }
    if (filters.donatur_id) {
      whereConditions.push(eq(transactions.donaturId, filters.donatur_id));
    }

    // Hide legacy split admin-fee rows from transaction list.
    whereConditions.push(
      sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`
    );

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const allTransactions = await this.db.query.transactions.findMany({
      where: whereClause,
    });
    const total = allTransactions.length;

    // Get paginated results
    const result = await this.db.query.transactions.findMany({
      where: whereClause,
      orderBy: [desc(transactions.createdAt)],
      limit,
      offset,
      with: {
        payments: true,
      },
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

  async getById(id: string): Promise<Transaction | undefined> {
    const result = await this.db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: {
        payments: true,
      },
    });

    if (!result) return undefined;

    // Enrich typeSpecificData for zakat transactions
    if (result.productType === "zakat" && result.typeSpecificData) {
      const data = result.typeSpecificData as any;

      // Fetch zakat type details if zakat_type_id exists
      if (data.zakat_type_id) {
        const zakatType = await this.db.query.zakatTypes.findFirst({
          where: eq(zakatTypes.id, data.zakat_type_id),
        });
        if (zakatType) {
          data.zakat_type_name = zakatType.name;
        }
      }

      // Fetch zakat period details if period_id exists
      if (data.period_id) {
        const { zakatPeriods } = await import("@bantuanku/db");
        const period = await this.db.query.zakatPeriods.findFirst({
          where: eq(zakatPeriods.id, data.period_id),
        });
        if (period) {
          data.zakat_period_name = period.name;
          data.year = period.year;
          data.hijri_year = period.hijriYear;
        }
      }

      result.typeSpecificData = data;
    }

    // Enrich typeSpecificData with pillar for campaign transactions
    if (result.productType === "campaign") {
      const data = (result.typeSpecificData || {}) as any;
      if (!data.pillar) {
        const campaign = await this.db.query.campaigns.findFirst({
          where: eq(campaigns.id, result.productId),
        });
        if (campaign) {
          data.pillar = campaign.pillar;
          result.typeSpecificData = data;
        }
      }
    }

    return result;
  }

  async getByTransactionNumber(transactionNumber: string): Promise<Transaction | undefined> {
    const result = await this.db.query.transactions.findFirst({
      where: eq(transactions.transactionNumber, transactionNumber),
      with: {
        payments: true,
      },
    });

    return result;
  }
}
