import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  campaigns,
  zakatTypes,
  zakatPeriods,
  qurbanPackagePeriods,
  qurbanPackages,
  qurbanPeriods,
  qurbanSavings,
  qurbanSavingsTransactions,
  settings,
  transactions,
  transactionPayments,
  revenueShares,
  mitra,
  fundraisers,
  donatur,
  employees,
} from "@bantuanku/db/schema";
import { createId } from "@bantuanku/db";
import { uploadToGCS, type GCSConfig } from "../lib/gcs";
import { TransactionService } from "../services/transaction";
import { RevenueShareService } from "../services/revenue-share";
import { WhatsAppService } from "../services/whatsapp";
import { generatePayload, generateQrDataUrl, parseMerchantInfo } from "../services/qris-generator";
import { requireRole, authMiddleware } from "../middleware/auth";
import { updateBankBalance } from "../utils/bank-balance";
import type { Env, Variables } from "../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Note: Authentication is applied selectively per endpoint
// POST /transactions allows guest checkout (no auth required)
// GET and admin endpoints require authentication

// Helper to get frontend URL: env first, fallback to organization_website setting
const getFrontendUrl = async (db: any, env?: Env): Promise<string> => {
  if (env?.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/+$/, "");
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "organization_website"),
  });
  return (row?.value || "").replace(/\/+$/, "");
};

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

const syncQurbanSavingsBalance = async (db: any, savingsId: string) => {
  const savings = await db.query.qurbanSavings.findFirst({
    where: eq(qurbanSavings.id, savingsId),
  });
  if (!savings) return;

  const legacyVerifiedResult = await db.execute(sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN qst.transaction_type = 'withdrawal' THEN -qst.amount
        ELSE qst.amount
      END
    ), 0)::numeric AS total
    FROM qurban_savings_transactions qst
    WHERE qst.savings_id = ${savingsId}
      AND qst.status = 'verified'
      AND NOT EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.category = 'qurban_savings'
          AND t.product_type = 'qurban'
          AND t.type_specific_data ->> 'legacy_savings_transaction_id' = qst.id
      )
  `);
  const legacyVerified = Number((legacyVerifiedResult as any).rows?.[0]?.total || 0);

  const [universalAgg] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.category, "qurban_savings"),
        eq(transactions.productType, "qurban"),
        eq(transactions.paymentStatus, "paid"),
        sql`${transactions.typeSpecificData} ->> 'savings_id' = ${savingsId}`
      )
    );

  const currentAmount = Math.max(0, legacyVerified + Number(universalAgg?.total || 0));
  const status =
    savings.status === "cancelled" || savings.status === "converted"
      ? savings.status
      : currentAmount >= Number(savings.targetAmount || 0)
        ? "completed"
        : "active";

  await db
    .update(qurbanSavings)
    .set({
      currentAmount,
      status,
      updatedAt: new Date(),
    })
    .where(eq(qurbanSavings.id, savingsId));
};

// Legacy function - kept for compatibility but returns null
// All data should now use universal transactions table
async function detectAndFetchTransaction(db: any, id: string) {
  return null;
}

// POST /transactions - Create new transaction (NEW)
app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  try {
    const service = new TransactionService(db);
    const transaction = await service.create(body);

    // WhatsApp notification: order baru
    if (transaction.donorPhone) {
      try {
        const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
        const tsd = transaction.typeSpecificData as Record<string, any> | null;
        const frontendUrl = await getFrontendUrl(db, c.env);

        // Enrich zakat-specific data for WA notification (not stored at create time)
        let zakatTypeName = "";
        let zakatPeriodName = "";
        let zakatHijriYear = "";
        if (transaction.productType === "zakat" && tsd) {
          if (tsd.zakat_type_id) {
            const zt = await db.query.zakatTypes.findFirst({
              where: eq(zakatTypes.id, tsd.zakat_type_id),
            });
            if (zt) zakatTypeName = zt.name;
          }
          const periodId = tsd.period_id || transaction.productId;
          if (periodId) {
            const zp = await db.query.zakatPeriods.findFirst({
              where: eq(zakatPeriods.id, periodId),
            });
            if (zp) {
              zakatPeriodName = zp.name;
              zakatHijriYear = zp.hijriYear || "";
              if (!zakatTypeName && zp.zakatTypeId) {
                const zt2 = await db.query.zakatTypes.findFirst({
                  where: eq(zakatTypes.id, zp.zakatTypeId),
                });
                if (zt2) zakatTypeName = zt2.name;
              }
            }
          }
        }

        // Determine template key based on productType
        let templateKey = "wa_tpl_order_campaign";
        if (transaction.productType === "zakat") templateKey = "wa_tpl_order_zakat";
        else if (transaction.productType === "qurban") templateKey = "wa_tpl_order_qurban";

        const variables: Record<string, string> = {
          customer_name: transaction.donorName,
          customer_email: transaction.donorEmail || "",
          customer_phone: transaction.donorPhone || "",
          order_number: transaction.transactionNumber,
          product_type: transaction.productType === "campaign" ? "Campaign" : transaction.productType === "zakat" ? "Zakat" : "Qurban",
          product_name: transaction.productName,
          quantity: String(transaction.quantity),
          unit_price: wa.formatCurrency(transaction.unitPrice),
          subtotal: wa.formatCurrency(transaction.subtotal),
          admin_fee: wa.formatCurrency(transaction.adminFee || 0),
          unique_code: String(transaction.uniqueCode || 0),
          total_amount: wa.formatCurrency(transaction.totalAmount),
          transfer_amount: wa.formatCurrency(transaction.totalAmount + (transaction.uniqueCode || 0)),
          created_date: wa.formatDate(transaction.createdAt),
          invoice_url: `${frontendUrl}/invoice/${transaction.id}`,
          customer_message: transaction.message || "",
          // Zakat specific
          zakat_type: zakatTypeName || tsd?.zakat_type_name || "",
          zakat_period: zakatPeriodName || tsd?.zakat_period_name || "",
          zakat_hijri_year: zakatHijriYear || tsd?.hijri_year || "",
          // Qurban specific
          qurban_package: transaction.productName,
          qurban_period: tsd?.period_name || "",
          qurban_names: tsd?.participant_names || "",
        };

        await wa.send({ phone: transaction.donorPhone, templateKey, variables });

        // WhatsApp notification: kirim ke admin
        await wa.sendToAdmins("wa_tpl_admin_new_transaction", {
          order_number: transaction.transactionNumber,
          product_type: transaction.productType === "campaign" ? "Campaign" : transaction.productType === "zakat" ? "Zakat" : "Qurban",
          product_name: transaction.productName,
          customer_name: transaction.donorName,
          transfer_amount: wa.formatCurrency(transaction.totalAmount + (transaction.uniqueCode || 0)),
          payment_method: transaction.paymentMethodId || "manual",
          created_date: wa.formatDate(transaction.createdAt),
        });
      } catch (err) {
        console.error("[WA] order notification error:", err);
      }
    }

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
      product_id: query.product_id && query.product_id.trim() !== "" ? query.product_id : undefined,
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
        data: {
          ...newTransaction,
          transferAmount: newTransaction.totalAmount + (newTransaction.uniqueCode || 0),
        },
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

    // WhatsApp notification: bukti pembayaran diterima
    try {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);

      // For savings deposits, use savings-specific context
      let productName = newTransaction.productName;
      let orderNumber = newTransaction.transactionNumber;
      const uploadSavingsId = (newTransaction.typeSpecificData as any)?.savings_id;
      if (newTransaction.category === "qurban_savings" && uploadSavingsId) {
        const savingsRow = await db.query.qurbanSavings.findFirst({
          where: eq(qurbanSavings.id, uploadSavingsId),
        });
        if (savingsRow) {
          productName = `Setoran Tabungan Qurban (${savingsRow.savingsNumber})`;
          orderNumber = savingsRow.savingsNumber;
        }
      }

      if (newTransaction.donorPhone) {
        await wa.send({
          phone: newTransaction.donorPhone,
          templateKey: "wa_tpl_payment_uploaded",
          variables: {
            customer_name: newTransaction.donorName,
            order_number: orderNumber,
            product_name: productName,
            paid_amount: wa.formatCurrency(amount),
          },
        });
      }

      // WhatsApp notification: kirim ke admin finance
      await wa.sendToAdmins("wa_tpl_admin_proof_uploaded", {
        order_number: orderNumber,
        customer_name: newTransaction.donorName,
        product_name: productName,
        paid_amount: wa.formatCurrency(amount),
      });
    } catch (err) {
      console.error("[WA] upload-proof notification error:", err);
    }

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

    // Update bank balance with actual transfer amount (totalAmount + uniqueCode)
    if (transaction.bankAccountId) {
      const actualTransferAmount = transaction.totalAmount + (transaction.uniqueCode || 0);
      await updateBankBalance(db, transaction.bankAccountId, actualTransferAmount);
    }

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

    // Calculate revenue sharing snapshot (amil/developer/fundraiser/mitra) once transaction is paid
    const revenueShareService = new RevenueShareService(db);
    await revenueShareService.calculateForPaidTransaction(id);

    // Sync qurban savings balance if this transaction is a savings deposit
    const savingsId = (transaction.typeSpecificData as any)?.savings_id;
    if (transaction.category === "qurban_savings" && savingsId) {
      await syncQurbanSavingsBalance(db, savingsId);
    }

    // WhatsApp notification: pembayaran dikonfirmasi
    if (transaction.donorPhone) {
      try {
        const wa = new WhatsAppService(db, c.env.FRONTEND_URL);

        // If this is a savings deposit, send savings-specific notification
        if (transaction.category === "qurban_savings" && savingsId) {
          const savingsRow = await db.query.qurbanSavings.findFirst({
            where: eq(qurbanSavings.id, savingsId),
          });
          if (savingsRow) {
            const targetAmount = Number(savingsRow.targetAmount || 0);
            const newCurrentAmount = Number(savingsRow.currentAmount || 0);

            // Count verified deposits
            const [legacyCount] = await db
              .select({ count: sql<number>`COALESCE(COUNT(*), 0)` })
              .from(qurbanSavingsTransactions)
              .where(
                and(
                  eq(qurbanSavingsTransactions.savingsId, savingsId),
                  eq(qurbanSavingsTransactions.transactionType, "deposit"),
                  eq(qurbanSavingsTransactions.status, "verified"),
                  sql`NOT EXISTS (
                    SELECT 1 FROM transactions t
                    WHERE t.category = 'qurban_savings' AND t.product_type = 'qurban'
                      AND t.type_specific_data ->> 'legacy_savings_transaction_id' = ${qurbanSavingsTransactions.id}
                  )`
                )
              );
            const [universalCount] = await db
              .select({ count: sql<number>`COALESCE(COUNT(*), 0)` })
              .from(transactions)
              .where(
                and(
                  eq(transactions.category, "qurban_savings"),
                  eq(transactions.productType, "qurban"),
                  eq(transactions.paymentStatus, "paid"),
                  sql`${transactions.typeSpecificData} ->> 'savings_id' = ${savingsId}`
                )
              );
            const totalVerified = Number(legacyCount?.count || 0) + Number(universalCount?.count || 0);
            const progressPct = targetAmount > 0 ? Math.round((newCurrentAmount / targetAmount) * 100) : 0;

            await wa.send({
              phone: transaction.donorPhone,
              templateKey: "wa_tpl_savings_deposit",
              variables: {
                customer_name: savingsRow.donorName,
                savings_number: savingsRow.savingsNumber,
                installment_paid: String(totalVerified),
                installment_count: String(savingsRow.installmentCount || 0),
                paid_amount: wa.formatCurrency(transaction.totalAmount),
                savings_current: wa.formatCurrency(newCurrentAmount),
                savings_remaining: wa.formatCurrency(Math.max(0, targetAmount - newCurrentAmount)),
                savings_progress: `${progressPct}%`,
              },
            });

            // If completed, also send completed notification
            if (newCurrentAmount >= targetAmount) {
              const pkg = savingsRow.targetPackageId
                ? await db.query.qurbanPackages.findFirst({ where: eq(qurbanPackages.id, savingsRow.targetPackageId) })
                : null;
              await wa.send({
                phone: transaction.donorPhone,
                templateKey: "wa_tpl_savings_completed",
                variables: {
                  customer_name: savingsRow.donorName,
                  savings_number: savingsRow.savingsNumber,
                  qurban_package: pkg?.name || "",
                  savings_current: wa.formatCurrency(newCurrentAmount),
                },
              });
            }
          }
        } else {
          // Generic payment approved notification
          const frontendUrl = await getFrontendUrl(db, c.env);
          await wa.send({
            phone: transaction.donorPhone,
            templateKey: "wa_tpl_payment_approved",
            variables: {
              customer_name: transaction.donorName,
              order_number: transaction.transactionNumber,
              product_name: transaction.productName,
              total_amount: wa.formatCurrency(transaction.totalAmount),
              paid_date: wa.formatDate(new Date()),
              invoice_url: `${frontendUrl}/invoice/${transaction.id}`,
            },
          });
        }
      } catch (err) {
        console.error("[WA] approve-payment notification error:", err);
      }
    }

    // WhatsApp notification: mitra & fundraiser
    try {
      const revenueShare = await db.query.revenueShares.findFirst({
        where: eq(revenueShares.transactionId, id),
      });

      if (revenueShare) {
        const wa = new WhatsAppService(db, c.env.FRONTEND_URL);

        // Mitra notification
        if (revenueShare.mitraId && revenueShare.mitraAmount > 0) {
          try {
            const mitraRecord = await db.query.mitra.findFirst({
              where: eq(mitra.id, revenueShare.mitraId),
            });
            const mitraPhone = mitraRecord?.whatsappNumber || mitraRecord?.phone;
            if (mitraRecord && mitraPhone) {
              await wa.send({
                phone: mitraPhone,
                templateKey: "wa_tpl_mitra_donation_received",
                variables: {
                  mitra_name: mitraRecord.name,
                  product_name: transaction.productName,
                  donor_name: transaction.donorName,
                  donation_amount: wa.formatCurrency(transaction.totalAmount),
                  mitra_amount: wa.formatCurrency(revenueShare.mitraAmount),
                  paid_date: wa.formatDate(new Date()),
                  mitra_balance: wa.formatCurrency(mitraRecord.currentBalance || 0),
                },
              });
            }
          } catch (err) {
            console.error("[WA] mitra notification error:", err);
          }
        }

        // Fundraiser notification
        if (revenueShare.fundraiserId && revenueShare.fundraiserAmount > 0) {
          try {
            const fundraiser = await db.query.fundraisers.findFirst({
              where: eq(fundraisers.id, revenueShare.fundraiserId),
              with: {
                donatur: true,
                employee: true,
              },
            });
            if (fundraiser) {
              const fundraiserPhone = fundraiser.employee
                ? (fundraiser.employee.whatsappNumber || fundraiser.employee.phone)
                : fundraiser.donatur
                  ? (fundraiser.donatur.whatsappNumber || fundraiser.donatur.phone)
                  : null;
              const fundraiserName = fundraiser.employee
                ? fundraiser.employee.name
                : fundraiser.donatur
                  ? fundraiser.donatur.name
                  : "";

              if (fundraiserPhone) {
                await wa.send({
                  phone: fundraiserPhone,
                  templateKey: "wa_tpl_fundraiser_referral",
                  variables: {
                    fundraiser_name: fundraiserName,
                    product_name: transaction.productName,
                    donor_name: transaction.donorName,
                    donation_amount: wa.formatCurrency(transaction.totalAmount),
                    commission_percentage: `${revenueShare.fundraiserPercentage}%`,
                    commission_amount: wa.formatCurrency(revenueShare.fundraiserAmount),
                    total_referrals: String(fundraiser.totalReferrals || 0),
                    fundraiser_balance: wa.formatCurrency(fundraiser.currentBalance || 0),
                  },
                });
              }
            }
          } catch (err) {
            console.error("[WA] fundraiser notification error:", err);
          }
        }
      }
    } catch (err) {
      console.error("[WA] mitra/fundraiser notification error:", err);
    }

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

    // WhatsApp notification: pembayaran ditolak
    if (transaction.donorPhone) {
      try {
        const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
        const frontendUrl = await getFrontendUrl(db, c.env);

        // For savings deposits, use savings-specific context
        let productName = transaction.productName;
        let orderNumber = transaction.transactionNumber;
        const txSavingsId = (transaction.typeSpecificData as any)?.savings_id;
        if (transaction.category === "qurban_savings" && txSavingsId) {
          const savingsRow = await db.query.qurbanSavings.findFirst({
            where: eq(qurbanSavings.id, txSavingsId),
          });
          if (savingsRow) {
            productName = `Setoran Tabungan Qurban (${savingsRow.savingsNumber})`;
            orderNumber = savingsRow.savingsNumber;
          }
        }

        await wa.send({
          phone: transaction.donorPhone,
          templateKey: "wa_tpl_payment_rejected",
          variables: {
            customer_name: transaction.donorName,
            order_number: orderNumber,
            product_name: productName,
            total_amount: wa.formatCurrency(transaction.totalAmount),
            invoice_url: `${frontendUrl}/invoice/${transaction.id}`,
          },
        });
      } catch (err) {
        console.error("[WA] reject-payment notification error:", err);
      }
    }

    return c.json({
      success: true,
      message: "Payment rejected successfully",
    });
  }
);

// GET /transactions/:id/qris - Generate dynamic QRIS QR code per transaction
app.get("/:id/qris", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");

  // 1. Load transaction
  const service = new TransactionService(db);
  const transaction = await service.getById(id);

  if (!transaction) {
    return c.json({ success: false, message: "Transaction not found" }, 404);
  }

  if (transaction.paymentStatus !== "pending" && transaction.paymentStatus !== "partial") {
    return c.json({ success: false, message: "QRIS only available for pending transactions" }, 400);
  }

  const paymentMethodId = transaction.paymentMethodId;
  if (!paymentMethodId) {
    return c.json({ success: false, message: "No payment method selected" }, 400);
  }

  // 2. Load QRIS accounts from settings
  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
  const qrisAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_qris_accounts");

  if (!qrisAccountsSetting?.value) {
    return c.json({ success: false, message: "No QRIS accounts configured" }, 400);
  }

  let qrisAccounts: any[] = [];
  try {
    qrisAccounts = JSON.parse(qrisAccountsSetting.value);
  } catch {
    return c.json({ success: false, message: "Invalid QRIS configuration" }, 500);
  }

  // 3. Find matching QRIS account — by ID first, then by program priority
  let qrisAccount = qrisAccounts.find((acc: any) => acc.id === paymentMethodId);

  if (!qrisAccount) {
    // Determine program from transaction
    let program = 'general';
    if (transaction.productType === 'zakat') program = 'zakat';
    else if (transaction.productType === 'qurban') program = 'qurban';
    else if (transaction.productType === 'campaign') {
      const tsd = transaction.typeSpecificData as any;
      program = tsd?.pillar || 'infaq';
    }

    // Priority: specific program QRIS > general QRIS
    qrisAccount = qrisAccounts.find((acc: any) => {
      const programs = Array.isArray(acc.programs) ? acc.programs : ['general'];
      return programs.some((p: string) => p.toLowerCase() === program.toLowerCase() && p.toLowerCase() !== 'general');
    });

    if (!qrisAccount) {
      qrisAccount = qrisAccounts.find((acc: any) => {
        const programs = Array.isArray(acc.programs) ? acc.programs : ['general'];
        return programs.some((p: string) => p.toLowerCase() === 'general');
      });
    }
  }

  if (!qrisAccount) {
    return c.json({ success: false, message: "QRIS account not found for this payment method" }, 400);
  }

  // 4. Check if dynamic
  if (qrisAccount.isDynamic && qrisAccount.emvPayload) {
    const amount = transaction.totalAmount + (transaction.uniqueCode || 0);
    const payload = generatePayload(qrisAccount.emvPayload, amount, transaction.transactionNumber);
    const qrDataUrl = await generateQrDataUrl(payload);
    const merchantInfo = parseMerchantInfo(qrisAccount.emvPayload);

    return c.json({
      success: true,
      data: {
        qrDataUrl,
        payload,
        amount,
        merchantName: qrisAccount.merchantName || merchantInfo.merchantName,
        isDynamic: true,
        expiresAt: null,
      },
    });
  }

  // 5. Fallback: return static image
  return c.json({
    success: true,
    data: {
      imageUrl: qrisAccount.imageUrl || null,
      amount: transaction.totalAmount + (transaction.uniqueCode || 0),
      merchantName: qrisAccount.name || "QRIS",
      isDynamic: false,
      expiresAt: null,
    },
  });
});

export default app;
