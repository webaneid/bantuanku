import { eq, and, desc, like, or } from "drizzle-orm";
import {
  transactions,
  transactionPayments,
  campaigns,
  zakatTypes,
  qurbanPackagePeriods,
  qurbanPackages,
  qurbanPeriods,
  donatur,
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
  type_specific_data?: Record<string, any>;
  user_id?: string;
}

interface TransactionFilters {
  product_type?: string;
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
        };
      }
      case "zakat": {
        const zakatType = await this.db.query.zakatTypes.findFirst({
          where: eq(zakatTypes.id, productId),
        });
        if (!zakatType) throw new Error("Zakat type not found");
        return {
          name: zakatType.name,
          description: zakatType.description,
          image: zakatType.imageUrl,
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

  async create(data: CreateTransactionDTO): Promise<Transaction> {
    const product = await this.getProduct(data.product_type, data.product_id);

    const quantity = data.quantity || 1;
    const unitPrice = data.unit_price || product.price || 0;
    const subtotal = quantity * unitPrice;
    const adminFee = data.admin_fee || 0;
    const totalAmount = subtotal + adminFee;

    // Use provided donatur_id or find/create donatur record
    const donaturId = data.donatur_id || await this.findOrCreateDonatur({
      name: data.donor_name,
      email: data.donor_email,
      phone: data.donor_phone,
    });

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
        donorName: data.donor_name,
        donorEmail: data.donor_email,
        donorPhone: data.donor_phone,
        isAnonymous: data.is_anonymous || false,
        userId: data.user_id,
        donaturId: donaturId,
        typeSpecificData: data.type_specific_data,
        message: data.message,
        paymentStatus: "pending",
        paidAmount: 0,
      } as any)
      .returning();

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
