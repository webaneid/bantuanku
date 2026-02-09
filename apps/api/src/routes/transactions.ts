import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  donations,
  zakatDonations,
  qurbanOrders,
  campaigns,
  zakatTypes,
  qurbanPackagePeriods,
  qurbanPackages,
  qurbanPeriods,
  donationPayments,
  zakatPayments,
  qurbanPayments,
  settings,
  transactions,
  transactionPayments,
} from "@bantuanku/db/schema";
import { createId } from "@bantuanku/db";
import { uploadToGCS, type GCSConfig } from "../lib/gcs";
import { TransactionService } from "../services/transaction";
import { requireRole, authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Note: Authentication is applied selectively per endpoint
// POST /transactions allows guest checkout (no auth required)
// GET and admin endpoints require authentication

// Helper to fetch CDN settings from database
const fetchCDNSettings = async (db: any): Promise<GCSConfig | null> => {
  try {
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.category, "cdn"));

    const cdnEnabled = settingsData.find((s: any) => s.key === "cdn_enabled")?.value === "true";

    if (!cdnEnabled) {
      return null;
    }

    const config = {
      bucketName: settingsData.find((s: any) => s.key === "gcs_bucket_name")?.value || "",
      projectId: settingsData.find((s: any) => s.key === "gcs_project_id")?.value || "",
      clientEmail: settingsData.find((s: any) => s.key === "gcs_client_email")?.value || "",
      privateKey: settingsData.find((s: any) => s.key === "gcs_private_key")?.value || "",
    };

    // Validate all required fields are present
    if (!config.bucketName || !config.projectId || !config.clientEmail || !config.privateKey) {
      console.warn("CDN enabled but missing required configuration");
      return null;
    }

    return config;
  } catch (error) {
    console.error("Failed to fetch CDN settings:", error);
    return null;
  }
};

// Helper: Detect transaction type and fetch data
async function detectAndFetchTransaction(db: any, id: string) {
  // Try donations first
  const donation = await db
    .select({
      id: donations.id,
      referenceId: donations.referenceId,
      donorName: donations.donorName,
      donorEmail: donations.donorEmail,
      donorPhone: donations.donorPhone,
      isAnonymous: donations.isAnonymous,
      amount: donations.amount,
      totalAmount: donations.totalAmount,
      paidAmount: donations.paidAmount,
      paymentMethodId: donations.paymentMethodId,
      paymentStatus: donations.paymentStatus,
      paidAt: donations.paidAt,
      message: donations.message,
      createdAt: donations.createdAt,
      campaignId: donations.campaignId,
      campaign: {
        id: campaigns.id,
        title: campaigns.title,
        pillar: campaigns.pillar,
        slug: campaigns.slug,
      },
    })
    .from(donations)
    .leftJoin(campaigns, eq(donations.campaignId, campaigns.id))
    .where(eq(donations.id, id))
    .limit(1);

  if (donation[0]) {
    return {
      type: "donation" as const,
      data: {
        id: donation[0].id,
        referenceNumber: donation[0].referenceId,
        donorName: donation[0].donorName,
        donorEmail: donation[0].donorEmail,
        donorPhone: donation[0].donorPhone,
        isAnonymous: donation[0].isAnonymous,
        amount: donation[0].totalAmount,
        paidAmount: donation[0].paidAmount,
        paymentMethodId: donation[0].paymentMethodId,
        paymentStatus: donation[0].paymentStatus,
        paidAt: donation[0].paidAt,
        message: donation[0].message,
        createdAt: donation[0].createdAt,
        campaign: donation[0].campaign,
      },
    };
  }

  // Try zakat
  const zakat = await db
    .select({
      id: zakatDonations.id,
      referenceId: zakatDonations.referenceId,
      donorName: zakatDonations.donorName,
      donorEmail: zakatDonations.donorEmail,
      donorPhone: zakatDonations.donorPhone,
      isAnonymous: zakatDonations.isAnonymous,
      amount: zakatDonations.amount,
      paidAmount: zakatDonations.paidAmount,
      paymentMethodId: zakatDonations.paymentMethodId,
      paymentStatus: zakatDonations.paymentStatus,
      paidAt: zakatDonations.paidAt,
      message: zakatDonations.message,
      calculatorData: zakatDonations.calculatorData,
      calculatedZakat: zakatDonations.calculatedZakat,
      createdAt: zakatDonations.createdAt,
      zakatTypeId: zakatDonations.zakatTypeId,
      zakatType: {
        id: zakatTypes.id,
        name: zakatTypes.name,
        slug: zakatTypes.slug,
      },
    })
    .from(zakatDonations)
    .leftJoin(zakatTypes, eq(zakatDonations.zakatTypeId, zakatTypes.id))
    .where(eq(zakatDonations.id, id))
    .limit(1);

  if (zakat[0]) {
    return {
      type: "zakat" as const,
      data: {
        id: zakat[0].id,
        referenceNumber: zakat[0].referenceId,
        donorName: zakat[0].donorName,
        donorEmail: zakat[0].donorEmail,
        donorPhone: zakat[0].donorPhone,
        isAnonymous: zakat[0].isAnonymous,
        amount: zakat[0].amount,
        paidAmount: zakat[0].paidAmount,
        paymentMethodId: zakat[0].paymentMethodId,
        paymentStatus: zakat[0].paymentStatus,
        paidAt: zakat[0].paidAt,
        message: zakat[0].message,
        createdAt: zakat[0].createdAt,
        calculatorData: zakat[0].calculatorData,
        calculatedZakat: zakat[0].calculatedZakat,
        zakatType: zakat[0].zakatType,
      },
    };
  }

  // Try qurban
  const qurban = await db
    .select({
      id: qurbanOrders.id,
      orderNumber: qurbanOrders.orderNumber,
      donorName: qurbanOrders.donorName,
      donorEmail: qurbanOrders.donorEmail,
      donorPhone: qurbanOrders.donorPhone,
      totalAmount: qurbanOrders.totalAmount,
      paidAmount: qurbanOrders.paidAmount,
      paymentMethodId: qurbanOrders.paymentMethodId,
      paymentStatus: qurbanOrders.paymentStatus,
      notes: qurbanOrders.notes,
      onBehalfOf: qurbanOrders.onBehalfOf,
      quantity: qurbanOrders.quantity,
      unitPrice: qurbanOrders.unitPrice,
      adminFee: qurbanOrders.adminFee,
      createdAt: qurbanOrders.createdAt,
      orderDate: qurbanOrders.orderDate,
      packagePeriodId: qurbanOrders.packagePeriodId,
      packagePeriod: {
        id: qurbanPackagePeriods.id,
        price: qurbanPackagePeriods.price,
        stock: qurbanPackagePeriods.stock,
        packageId: qurbanPackagePeriods.packageId,
        periodId: qurbanPackagePeriods.periodId,
      },
      package: {
        id: qurbanPackages.id,
        name: qurbanPackages.name,
        description: qurbanPackages.description,
        animalType: qurbanPackages.animalType,
        packageType: qurbanPackages.packageType,
      },
      period: {
        id: qurbanPeriods.id,
        name: qurbanPeriods.name,
        gregorianYear: qurbanPeriods.gregorianYear,
        hijriYear: qurbanPeriods.hijriYear,
      },
    })
    .from(qurbanOrders)
    .leftJoin(
      qurbanPackagePeriods,
      eq(qurbanOrders.packagePeriodId, qurbanPackagePeriods.id)
    )
    .leftJoin(
      qurbanPackages,
      eq(qurbanPackagePeriods.packageId, qurbanPackages.id)
    )
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (qurban[0]) {
    return {
      type: "qurban" as const,
      data: {
        id: qurban[0].id,
        referenceNumber: qurban[0].orderNumber,
        donorName: qurban[0].donorName,
        donorEmail: qurban[0].donorEmail,
        donorPhone: qurban[0].donorPhone,
        amount: qurban[0].totalAmount,
        paidAmount: qurban[0].paidAmount,
        paymentMethodId: qurban[0].paymentMethodId,
        paymentStatus: qurban[0].paymentStatus,
        message: qurban[0].notes,
        createdAt: qurban[0].createdAt,
        onBehalfOf: qurban[0].onBehalfOf,
        quantity: qurban[0].quantity,
        unitPrice: qurban[0].unitPrice,
        adminFee: qurban[0].adminFee,
        packagePeriod: qurban[0].packagePeriod,
        package: qurban[0].package,
        period: qurban[0].period,
      },
    };
  }

  return null;
}

// POST /transactions - Create new transaction (NEW)
app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  try {
    const service = new TransactionService(db);
    const transaction = await service.create(body);

    return c.json({
      success: true,
      data: transaction,
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || "Failed to create transaction",
    }, 400);
  }
});

// GET /transactions - List transactions (NEW) - Admin only
app.get("/", authMiddleware, async (c) => {
  const db = c.get("db");
  const query = c.req.query();

  try {
    const service = new TransactionService(db);
    const result = await service.list({
      product_type: query.product_type && query.product_type.trim() !== "" ? query.product_type : undefined,
      status: query.status && query.status.trim() !== "" ? query.status : undefined,
      donor_email: query.donor_email && query.donor_email.trim() !== "" ? query.donor_email : undefined,
      donatur_id: query.donatur_id && query.donatur_id.trim() !== "" ? query.donatur_id : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || "Failed to list transactions",
    }, 400);
  }
});

// GET /transactions/my - List user's own transactions
app.get("/my", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const query = c.req.query();

  if (!user) {
    return c.json({
      success: false,
      message: "Unauthorized",
    }, 401);
  }

  try {
    // Find donatur by user email to get donaturId
    const { donatur } = await import("@bantuanku/db");
    const donaturRecord = await db.query.donatur.findFirst({
      where: eq(donatur.email, user.email.toLowerCase().trim()),
    });

    if (!donaturRecord) {
      return c.json({
        success: true,
        data: [], // No donatur record means no transactions
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const service = new TransactionService(db);
    const result = await service.list({
      donatur_id: donaturRecord.id,
      product_type: query.product_type && query.product_type.trim() !== "" ? query.product_type : undefined,
      status: query.status && query.status.trim() !== "" ? query.status : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || "Failed to list transactions",
    }, 400);
  }
});

// GET /transactions/:id - Get transaction detail
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");

  // Check new transactions table first
  const service = new TransactionService(db);
  const newTransaction = await service.getById(id);

  if (newTransaction) {
    return c.json({
      success: true,
      data: {
        type: "transaction",
        data: newTransaction,
      },
    });
  }

  // Fall back to old tables for backward compatibility
  const transaction = await detectAndFetchTransaction(db, id);

  if (!transaction) {
    return c.json(
      {
        success: false,
        message: "Transaction not found",
      },
      404
    );
  }

  return c.json({
    success: true,
    data: transaction,
  });
});

// POST /transactions/:id/confirm-payment - Confirm payment method
app.post("/:id/confirm-payment", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const body = await c.req.json();

  const { paymentMethodId, metadata } = body;

  if (!paymentMethodId) {
    return c.json(
      {
        success: false,
        message: "Payment method ID is required",
      },
      400
    );
  }

  // Check new transactions table first
  const service = new TransactionService(db);
  const newTransaction = await service.getById(id);

  if (newTransaction) {
    await db
      .update(transactions)
      .set({
        paymentMethodId,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    return c.json({
      success: true,
      message: "Payment method confirmed",
    });
  }

  // Fall back to old tables
  const transaction = await detectAndFetchTransaction(db, id);

  if (!transaction) {
    return c.json(
      {
        success: false,
        message: "Transaction not found",
      },
      404
    );
  }

  // Update payment method based on type
  if (transaction.type === "donation") {
    await db
      .update(donations)
      .set({
        paymentMethodId,
        updatedAt: new Date(),
      })
      .where(eq(donations.id, id));
  } else if (transaction.type === "zakat") {
    await db
      .update(zakatDonations)
      .set({
        paymentMethodId,
        updatedAt: new Date(),
      })
      .where(eq(zakatDonations.id, id));
  } else if (transaction.type === "qurban") {
    await db
      .update(qurbanOrders)
      .set({
        paymentMethodId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(qurbanOrders.id, id));
  }

  return c.json({
    success: true,
    message: "Payment method confirmed",
  });
});

// POST /transactions/:id/payments - Create payment record (Admin)
const createPaymentSchema = z.object({
  amount: z.number().min(1),
  paymentDate: z.string(),
  paymentMethod: z.string(),
  paymentProof: z.string().optional(),
});

app.post(
  "/:id/payments",
  authMiddleware,
  requireRole("super_admin", "admin_finance"),
  zValidator("json", createPaymentSchema),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");
    const { amount, paymentDate, paymentMethod, paymentProof } = c.req.valid("json");

    const service = new TransactionService(db);
    const transaction = await service.getById(id);

    if (!transaction) {
      return c.json(
        {
          success: false,
          message: "Transaction not found",
        },
        404
      );
    }

    // Generate payment number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    const paymentNumber = `PAY-${year}${month}${day}-${timestamp}`;

    // Create transaction_payment record
    await db.insert(transactionPayments).values({
      paymentNumber,
      transactionId: id,
      amount,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      paymentProof,
      status: "pending",
    } as any);

    // Update transaction paidAmount using SQL atomic increment
    await db
      .update(transactions)
      .set({
        paidAmount: sql`${transactions.paidAmount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    // Get updated transaction to determine new status
    const updatedTransaction = await service.getById(id);
    const newStatus =
      updatedTransaction!.paidAmount >= updatedTransaction!.totalAmount && paymentProof
        ? "processing"
        : updatedTransaction!.paidAmount > 0 && updatedTransaction!.paidAmount < updatedTransaction!.totalAmount
        ? "partial"
        : "pending";

    await db
      .update(transactions)
      .set({
        paymentStatus: newStatus,
      })
      .where(eq(transactions.id, id));

    return c.json({
      success: true,
      message: "Payment record created successfully",
    });
  }
);

// POST /transactions/:id/upload-proof - Upload payment proof
app.post("/:id/upload-proof", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const body = await c.req.parseBody();

  const file = body.file as File;
  const amount = Number(body.amount);
  const paymentDateStr = body.paymentDate as string;

  if (!file) {
    return c.json(
      {
        success: false,
        message: "File is required",
      },
      400
    );
  }

  if (!amount || amount <= 0) {
    return c.json(
      {
        success: false,
        message: "Amount must be greater than 0",
      },
      400
    );
  }

  if (!paymentDateStr) {
    return c.json(
      {
        success: false,
        message: "Payment date is required",
      },
      400
    );
  }

  // Parse and validate payment date
  const paymentDate = new Date(paymentDateStr);
  if (isNaN(paymentDate.getTime())) {
    return c.json(
      {
        success: false,
        message: "Invalid payment date format",
      },
      400
    );
  }

  // Security: Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      {
        success: false,
        message: "File type not allowed. Only JPEG, PNG, and PDF are allowed.",
      },
      400
    );
  }

  // Security: Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json(
      {
        success: false,
        message: "File size exceeds 5MB limit",
      },
      400
    );
  }

  // Check new transactions table first
  const service = new TransactionService(db);
  const newTransaction = await service.getById(id);

  if (newTransaction) {
    // Check upload limit for new transactions
    const payments = await db
      .select()
      .from(transactionPayments)
      .where(eq(transactionPayments.transactionId, id));

    if (payments.length >= 10) {
      return c.json(
        {
          success: false,
          message: "Upload limit reached. Please contact admin for assistance.",
        },
        429
      );
    }

    // Upload to GCS
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedFilename}`;
    const path = `payment-proofs/transaction/${id}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const gcsConfig = await fetchCDNSettings(db);

    if (!gcsConfig) {
      console.error("[Upload] CDN not configured or disabled");
      return c.json(
        {
          success: false,
          message: "Storage service not available. Please contact administrator.",
        },
        500
      );
    }

    let fileUrl: string;
    try {
      fileUrl = await uploadToGCS(gcsConfig, buffer, path, file.type);
    } catch (error: any) {
      console.error("[Upload] GCS upload failed:", error);
      return c.json(
        {
          success: false,
          message: "Failed to upload file. Please try again.",
          error: error.message,
        },
        500
      );
    }

    // Create transaction_payment record
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const paymentTimestamp = Date.now().toString().slice(-6);
    const paymentNumber = `PAY-${year}${month}${day}-${paymentTimestamp}`;

    await db.insert(transactionPayments).values({
      id: createId(),
      paymentNumber,
      transactionId: id,
      amount,
      paymentDate: paymentDate,
      paymentMethod: newTransaction.paymentMethodId || "bank_transfer",
      paymentProof: fileUrl,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Update transaction paidAmount and status to processing (menunggu verifikasi admin)
    // Status akan diubah menjadi "paid" atau "verified" setelah admin approve
    await db
      .update(transactions)
      .set({
        paidAmount: sql`${transactions.paidAmount} + ${amount}`,
        paymentStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    return c.json({
      success: true,
      message: "Payment proof uploaded successfully",
      data: {
        fileUrl,
        amount,
      },
    });
  }

  // Fall back to old tables
  const transaction = await detectAndFetchTransaction(db, id);

  if (!transaction) {
    return c.json(
      {
        success: false,
        message: "Transaction not found",
      },
      404
    );
  }

  // Security: Check payment proof upload limit (max 10 uploads per transaction)
  let uploadCount = 0;
  if (transaction.type === "donation") {
    const payments = await db
      .select()
      .from(donationPayments)
      .where(eq(donationPayments.donationId, id));
    uploadCount = payments.length;
  } else if (transaction.type === "zakat") {
    const payments = await db
      .select()
      .from(zakatPayments)
      .where(eq(zakatPayments.zakatDonationId, id));
    uploadCount = payments.length;
  } else if (transaction.type === "qurban") {
    const payments = await db
      .select()
      .from(qurbanPayments)
      .where(eq(qurbanPayments.orderId, id));
    uploadCount = payments.length;
  }

  if (uploadCount >= 10) {
    return c.json(
      {
        success: false,
        message: "Upload limit reached. Please contact admin for assistance.",
      },
      429
    );
  }

  // Upload to GCS
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${timestamp}-${sanitizedFilename}`;
  const path = `payment-proofs/${transaction.type}/${id}/${filename}`;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get GCS config from database
  const gcsConfig = await fetchCDNSettings(db);

  if (!gcsConfig) {
    console.error("[Upload] CDN not configured or disabled");
    return c.json(
      {
        success: false,
        message: "Storage service not available. Please contact administrator.",
      },
      500
    );
  }

  let fileUrl: string;
  try {
    fileUrl = await uploadToGCS(gcsConfig, buffer, path, file.type);
  } catch (error: any) {
    console.error("[Upload] GCS upload failed:", error);
    return c.json(
      {
        success: false,
        message: "Failed to upload file. Please try again.",
        error: error.message,
      },
      500
    );
  }

  // Create payment record based on type
  if (transaction.type === "donation") {
    // Generate payment number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const paymentTimestamp = Date.now().toString().slice(-6);
    const paymentNumber = `DN-${year}${month}${day}-${paymentTimestamp}`;

    await db.insert(donationPayments).values({
      id: createId(),
      paymentNumber,
      donationId: id,
      amount,
      paymentDate: paymentDate,
      paymentMethod: transaction.data.paymentMethodId || "bank_transfer",
      paymentProof: fileUrl,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update donation status to processing (menunggu verifikasi admin)
    await db
      .update(donations)
      .set({
        paymentStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(donations.id, id));
  } else if (transaction.type === "zakat") {
    // Generate payment number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const paymentTimestamp = Date.now().toString().slice(-6);
    const paymentNumber = `ZK-${year}${month}${day}-${paymentTimestamp}`;

    await db.insert(zakatPayments).values({
      id: createId(),
      paymentNumber,
      zakatDonationId: id,
      amount,
      paymentDate: paymentDate,
      paymentMethod: transaction.data.paymentMethodId || "bank_transfer",
      paymentProof: fileUrl,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update zakat status to processing (menunggu verifikasi admin)
    await db
      .update(zakatDonations)
      .set({
        paymentStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(zakatDonations.id, id));
  } else if (transaction.type === "qurban") {
    // Generate payment number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const paymentTimestamp = Date.now().toString().slice(-6);
    const paymentNumber = `QB-${year}${month}${day}-${paymentTimestamp}`;

    await db.insert(qurbanPayments).values({
      id: createId(),
      paymentNumber,
      orderId: id,
      amount,
      paymentDate: paymentDate,
      paymentMethod: transaction.data.paymentMethodId || "bank_transfer",
      paymentProof: fileUrl,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update qurban status to processing (menunggu verifikasi admin)
    await db
      .update(qurbanOrders)
      .set({
        paymentStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(qurbanOrders.id, id));
  }

  return c.json({
    success: true,
    message: "Payment proof uploaded successfully",
    data: {
      fileUrl,
      amount,
    },
  });
});

// PUT /transactions/:id - Update transaction
const updateTransactionSchema = z.object({
  paymentStatus: z.enum(["pending", "processing", "partial", "paid", "failed", "expired"]).optional(),
  paymentMethodId: z.string().optional(),
});

app.put(
  "/:id",
  authMiddleware,
  requireRole("super_admin", "admin_finance"),
  zValidator("json", updateTransactionSchema),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");
    const body = c.req.valid("json");

    const service = new TransactionService(db);
    const transaction = await service.getById(id);

    if (!transaction) {
      return c.json(
        {
          success: false,
          message: "Transaction not found",
        },
        404
      );
    }

    await db
      .update(transactions)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    return c.json({
      success: true,
      message: "Transaction updated successfully",
    });
  }
);

// POST /transactions/:id/approve-payment - Approve payment
app.post(
  "/:id/approve-payment",
  authMiddleware,
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const service = new TransactionService(db);
    const transaction = await service.getById(id);

    if (!transaction) {
      return c.json(
        {
          success: false,
          message: "Transaction not found",
        },
        404
      );
    }

    if (transaction.paymentStatus !== "processing" && transaction.paymentStatus !== "partial") {
      return c.json(
        {
          success: false,
          message: "Only transactions with status 'processing' or 'partial' can be approved",
        },
        400
      );
    }

    // Update transaction status to paid
    await db
      .update(transactions)
      .set({
        paymentStatus: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    // Update all pending transaction_payments to verified
    await db
      .update(transactionPayments)
      .set({
        status: "verified",
        verifiedAt: new Date(),
        verifiedBy: c.get("user")?.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactionPayments.transactionId, id),
          eq(transactionPayments.status, "pending")
        )
      );

    // Update product collected amount based on product type
    if (transaction.productType === "campaign") {
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} + ${transaction.totalAmount}`,
          donorCount: sql`${campaigns.donorCount} + 1`,
        })
        .where(eq(campaigns.id, transaction.productId));
    }
    // Note: Zakat and Qurban don't have collected amount tracking in their tables

    return c.json({
      success: true,
      message: "Payment approved successfully",
    });
  }
);

// POST /transactions/:id/reject-payment - Reject payment
const rejectPaymentSchema = z.object({
  reason: z.string().optional(),
});

app.post(
  "/:id/reject-payment",
  authMiddleware,
  requireRole("super_admin", "admin_finance"),
  zValidator("json", rejectPaymentSchema),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");
    const { reason } = c.req.valid("json");

    const service = new TransactionService(db);
    const transaction = await service.getById(id);

    if (!transaction) {
      return c.json(
        {
          success: false,
          message: "Transaction not found",
        },
        404
      );
    }

    if (transaction.paymentStatus !== "processing" && transaction.paymentStatus !== "partial") {
      return c.json(
        {
          success: false,
          message: "Only transactions with status 'processing' or 'partial' can be rejected",
        },
        400
      );
    }

    // Update transaction status to failed
    const updateData: any = {
      paymentStatus: "failed",
      updatedAt: new Date(),
    };

    if (reason) {
      updateData.metadata = sql`json_set(COALESCE(metadata, '{}'), '$.rejectionReason', ${reason})`;
    }

    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id));

    // Update all pending transaction_payments to rejected
    await db
      .update(transactionPayments)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: c.get("user")?.id,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactionPayments.transactionId, id),
          eq(transactionPayments.status, "pending")
        )
      );

    return c.json({
      success: true,
      message: "Payment rejected successfully",
    });
  }
);

export default app;
