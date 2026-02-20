import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import {
  campaigns,
  transactions,
  transactionPayments,
  paymentGateways,
  paymentMethods,
  paymentGatewayCredentials,
  qurbanSavings,
  qurbanSavingsTransactions,
  createId,
} from "@bantuanku/db";
import { createPaymentAdapter } from "../services/payment";
import { createEmailService } from "../services/email";
import { success, error } from "../lib/response";
import { paymentRateLimit } from "../middleware/ratelimit";
import type { Env, Variables } from "../types";
const paymentsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// Payment methods endpoint - ambil dari settings, bukan dari hardcoded table
paymentsRoute.get("/methods", async (c) => {
  const db = c.get("db");

  // Get payment settings from settings table
  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");

  const methods = [];

  // Check which providers are enabled
  const bankEnabled = paymentSettings.find((s: any) => s.key === "payment_bank_transfer_enabled")?.value === "true";
  const cashEnabled = paymentSettings.find((s: any) => s.key === "payment_cash_enabled")?.value === "true";
  const qrisEnabled = paymentSettings.find((s: any) => s.key === "payment_qris_enabled")?.value === "true";
  const xenditEnabled = paymentSettings.find((s: any) => s.key === "payment_xendit_enabled")?.value === "true";
  const iPaymuEnabled = paymentSettings.find((s: any) => s.key === "payment_ipaymu_enabled")?.value === "true";
  const flipEnabled = paymentSettings.find((s: any) => s.key === "payment_flip_enabled")?.value === "true";

  // QRIS accounts list (new structure)
  let qrisAccounts: any[] = [];
  const qrisAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_qris_accounts");
  if (qrisAccountsSetting?.value) {
    try {
      const parsed = JSON.parse(qrisAccountsSetting.value);
      if (Array.isArray(parsed)) {
        qrisAccounts = parsed.map((acc) => ({
          id: acc.id || `qris-${Math.random().toString(36).slice(2)}`,
          name: acc.name || "QRIS",
          imageUrl: acc.imageUrl || "",
          programs: Array.isArray(acc.programs) && acc.programs.length > 0 ? acc.programs : ["general"],
          isDynamic: acc.isDynamic || false,
        }));
      }
    } catch (e) {
      console.error("Failed to parse QRIS accounts:", e);
    }
  }

  // Transfer Bank - bisa multiple bank accounts
  if (bankEnabled) {
    const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");
    if (bankAccountsSetting?.value) {
      try {
        const bankAccounts = JSON.parse(bankAccountsSetting.value);
        if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
          bankAccounts.forEach((bank: any) => {
            const programs = Array.isArray(bank.programs) && bank.programs.length > 0 ? bank.programs : ["general"];
            methods.push({
              id: bank.id,
              code: bank.id,
              name: `${bank.bankName} - ${bank.accountNumber}`,
              type: "bank_transfer",
              details: {
                bankName: bank.bankName,
                accountNumber: bank.accountNumber,
                accountName: bank.accountName,
              },
              programs,
            });
          });
        }
      } catch (e) {
        console.error("Failed to parse bank accounts:", e);
      }
    }
  }

  // Cash
  if (cashEnabled) {
    methods.push({
      id: "cash",
      code: "cash",
      name: "Tunai / Cash",
      type: "cash",
      programs: ["general"],
    });
  }

  // QRIS
  if (qrisEnabled) {
    if (qrisAccounts.length > 0) {
      qrisAccounts.forEach((acc) => {
        methods.push({
          id: acc.id,
          code: acc.id,
          name: acc.name || "QRIS",
          type: "qris",
          details: {
            name: acc.name || undefined,
            imageUrl: acc.imageUrl || undefined,
            isDynamic: acc.isDynamic || false,
          },
          programs: acc.programs,
        });
      });
    } else {
      // fallback: single entry using legacy keys if any
      const legacyName = paymentSettings.find((s: any) => s.key === "payment_qris_name")?.value || "QRIS";
      const legacyImage = paymentSettings.find((s: any) => s.key === "payment_qris_image")?.value || "";
      methods.push({
        id: "qris",
        code: "qris",
        name: legacyName,
        type: "qris",
        details: {
          name: legacyName,
          imageUrl: legacyImage || undefined,
        },
        programs: ["general"],
      });
    }
  }

  // Xendit
  if (xenditEnabled) {
    methods.push({
      id: "xendit",
      code: "xendit",
      name: "Xendit",
      type: "payment_gateway",
      programs: ["general"],
    });
  }

  // iPaymu
  if (iPaymuEnabled) {
    methods.push({
      id: "ipaymu",
      code: "ipaymu",
      name: "iPaymu",
      type: "payment_gateway",
      programs: ["general"],
    });
  }

  // Flip
  if (flipEnabled) {
    methods.push({
      id: "flip",
      code: "flip",
      name: "Flip",
      type: "payment_gateway",
      programs: ["general"],
    });
  }

  return success(c, methods);
});

const createPaymentSchema = z.object({
  transactionId: z.string(),
  methodId: z.string(),
  channel: z.string().optional(), // Optional channel for payment gateways (e.g., "qris:qris", "va:bca")
});

paymentsRoute.post("/create", paymentRateLimit, zValidator("json", createPaymentSchema), async (c) => {
  const { transactionId, methodId, channel } = c.req.valid("json");
  const db = c.get("db");

  const txn = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!txn) {
    return error(c, "Transaction not found", 404);
  }

  if (txn.paymentStatus !== "pending") {
    return error(c, "Transaction already processed", 400);
  }

  // Try to get payment method from database first
  const method = await db.query.paymentMethods.findFirst({
    where: eq(paymentMethods.id, methodId),
  });

  let gateway: any = null;
  let credentials: any = null;
  let isProduction = c.env.ENVIRONMENT === "production";
  let gatewayCode: string;
  let methodCode: string;

  if (method && method.isActive) {
    // Database-based payment method
    gateway = await db.query.paymentGateways.findFirst({
      where: eq(paymentGateways.id, method.gatewayId),
    });

    if (!gateway || !gateway.isActive) {
      return error(c, "Payment gateway not available", 400);
    }

    const credential = await db.query.paymentGatewayCredentials.findFirst({
      where: and(
        eq(paymentGatewayCredentials.gatewayId, gateway.id),
        eq(paymentGatewayCredentials.isActive, true)
      ),
    });

    if (!credential) {
      return error(c, "Payment gateway not configured", 500);
    }

    try {
      credentials = JSON.parse(credential.credentials);
    } catch {
      return error(c, "Invalid gateway credentials", 500);
    }

    gatewayCode = gateway.code;
    methodCode = method.code;
  } else {
    // Settings-based payment gateway (xendit, ipaymu, flip)
    const allSettings = await db.query.settings.findMany();
    const paymentSettings = allSettings.filter((s: any) => s.category === "payment");

    // Check if methodId is a recognized settings-based gateway
    const settingsGateways = ["xendit", "ipaymu", "flip"];
    if (!settingsGateways.includes(methodId)) {
      return error(c, "Payment method not available", 400);
    }

    gatewayCode = methodId;
    // If channel is provided (e.g., "qris:qris", "va:bca"), use it; otherwise use methodId
    methodCode = channel || methodId;

    // Get gateway-specific settings
    const enabledKey = `payment_${methodId}_enabled`;
    const isEnabled = paymentSettings.find((s: any) => s.key === enabledKey)?.value === "true";

    if (!isEnabled) {
      return error(c, `${methodId} is not enabled`, 400);
    }

    // Get credentials from settings
    if (methodId === "ipaymu") {
      // Try both with and without payment_ prefix
      const va = paymentSettings.find((s: any) => s.key === "payment_ipaymu_va" || s.key === "ipaymu_va")?.value;
      const apiKey = paymentSettings.find((s: any) => s.key === "payment_ipaymu_api_key" || s.key === "ipaymu_api_key")?.value;
      const mode = paymentSettings.find((s: any) => s.key === "payment_ipaymu_mode" || s.key === "ipaymu_mode")?.value || "sandbox";

      if (!va || !apiKey) {
        console.error("iPaymu credentials check:", { va: !!va, apiKey: !!apiKey });
        console.error("Available payment settings:", paymentSettings.map((s: any) => s.key));
        return error(c, "iPaymu credentials not configured", 500);
      }

      credentials = {
        merchantId: va,
        secretKey: apiKey,
      };
      isProduction = mode === "production";
    } else if (methodId === "xendit") {
      const secretKey = paymentSettings.find((s: any) => s.key === "payment_xendit_secret_key" || s.key === "xendit_secret_key")?.value;
      const callbackToken = paymentSettings.find((s: any) => s.key === "payment_xendit_callback_token" || s.key === "xendit_callback_token")?.value;

      if (!secretKey) {
        return error(c, "Xendit credentials not configured", 500);
      }

      credentials = {
        secretKey,
        callbackToken,
      };
    } else if (methodId === "flip") {
      // Phase 1: Fixed key mismatch — match admin UI keys
      const secretKey = paymentSettings.find((s: any) => s.key === "payment_flip_api_key" || s.key === "payment_flip_secret_key")?.value;
      const validationToken = paymentSettings.find((s: any) => s.key === "payment_flip_webhook" || s.key === "payment_flip_validation_token")?.value;
      const mode = paymentSettings.find((s: any) => s.key === "payment_flip_environment" || s.key === "payment_flip_mode")?.value || "sandbox";

      if (!secretKey) {
        return error(c, "Flip credentials not configured", 500);
      }

      credentials = {
        secretKey,
        merchantId: validationToken || "", // Using merchantId field for validation token
      };
      isProduction = mode === "production";
    }

    // Get or create gateway record
    gateway = await db.query.paymentGateways.findFirst({
      where: eq(paymentGateways.code, gatewayCode),
    });

    if (!gateway) {
      return error(c, `Gateway ${gatewayCode} not found in database. Please run database seed.`, 500);
    }
  }

  const adapter = createPaymentAdapter(gatewayCode, credentials, isProduction);

  const result = await adapter.createPayment({
    donationId: txn.id,
    amount: txn.totalAmount,
    donorName: txn.donorName,
    donorEmail: txn.donorEmail || undefined,
    donorPhone: txn.donorPhone || undefined,
    methodCode,
  });

  if (!result.success) {
    return error(c, result.error || "Payment creation failed", 400);
  }

  const paymentId = createId();
  const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(transactionPayments).values({
    id: paymentId,
    paymentNumber,
    transactionId: txn.id,
    amount: txn.totalAmount,
    paymentMethod: method?.name || gatewayCode,
    paymentChannel: methodCode,
    externalId: result.externalId,
    paymentCode: result.paymentCode,
    paymentUrl: result.paymentUrl,
    qrCode: result.qrCode,
    gatewayCode,
    expiredAt: result.expiredAt,
    status: "pending",
  });

  await db
    .update(transactions)
    .set({
      paymentMethodId: method?.id || methodId,
      paymentStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, txn.id));

  return success(c, {
    paymentId,
    paymentCode: result.paymentCode,
    paymentUrl: result.paymentUrl,
    qrCode: result.qrCode,
    expiredAt: result.expiredAt,
  });
});

paymentsRoute.post("/:gateway/webhook", async (c) => {
  const gatewayCode = c.req.param("gateway");
  const db = c.get("db");

  const gateway = await db.query.paymentGateways.findFirst({
    where: eq(paymentGateways.code, gatewayCode),
  });

  if (!gateway) {
    return error(c, "Gateway not found", 404);
  }

  let credentials: any;
  let isProduction = c.env.ENVIRONMENT === "production";

  // Check if this is a settings-based gateway (ipaymu, flip, xendit)
  const settingsGateways = ["ipaymu", "flip", "xendit"];

  if (settingsGateways.includes(gatewayCode)) {
    // Get credentials from settings table
    const allSettings = await db.query.settings.findMany();
    const paymentSettings = allSettings.filter((s: any) => s.category === "payment");

    if (gatewayCode === "ipaymu") {
      const va = paymentSettings.find((s: any) => s.key === "payment_ipaymu_va" || s.key === "ipaymu_va")?.value;
      const apiKey = paymentSettings.find((s: any) => s.key === "payment_ipaymu_api_key" || s.key === "ipaymu_api_key")?.value;
      const mode = paymentSettings.find((s: any) => s.key === "payment_ipaymu_mode" || s.key === "ipaymu_mode")?.value || "sandbox";

      if (!va || !apiKey) {
        return error(c, "iPaymu credentials not configured", 500);
      }

      credentials = {
        merchantId: va,
        secretKey: apiKey,
      };
      isProduction = mode === "production";
    } else if (gatewayCode === "flip") {
      // Phase 1: Fixed key mismatch — match admin UI keys
      const secretKey = paymentSettings.find((s: any) => s.key === "payment_flip_api_key" || s.key === "payment_flip_secret_key")?.value;
      const validationToken = paymentSettings.find((s: any) => s.key === "payment_flip_webhook" || s.key === "payment_flip_validation_token")?.value;
      const mode = paymentSettings.find((s: any) => s.key === "payment_flip_environment" || s.key === "payment_flip_mode")?.value || "sandbox";

      if (!secretKey) {
        return error(c, "Flip credentials not configured", 500);
      }

      credentials = {
        secretKey,
        merchantId: validationToken || "",
      };
      isProduction = mode === "production";
    } else if (gatewayCode === "xendit") {
      const secretKey = paymentSettings.find((s: any) => s.key === "payment_xendit_secret_key" || s.key === "xendit_secret_key")?.value;
      const callbackToken = paymentSettings.find((s: any) => s.key === "payment_xendit_callback_token" || s.key === "xendit_callback_token")?.value;

      if (!secretKey) {
        return error(c, "Xendit credentials not configured", 500);
      }

      credentials = {
        secretKey,
        callbackToken,
      };
    }
  } else {
    // Use database credentials for other gateways
    const credential = await db.query.paymentGatewayCredentials.findFirst({
      where: and(
        eq(paymentGatewayCredentials.gatewayId, gateway.id),
        eq(paymentGatewayCredentials.isActive, true)
      ),
    });

    if (!credential) {
      return error(c, "Gateway not configured", 500);
    }

    try {
      credentials = JSON.parse(credential.credentials);
    } catch {
      return error(c, "Invalid credentials", 500);
    }
  }

  // Phase 3: Handle Flip form-urlencoded webhook body
  let payload: any;
  let signature: string | undefined;

  if (gatewayCode === "flip") {
    // Flip sends form-urlencoded: data={json}&token={bcrypt}
    const formData = await c.req.parseBody();
    const dataStr = formData.data as string;
    const token = formData.token as string;
    payload = JSON.parse(dataStr);
    signature = token;
  } else {
    payload = await c.req.json();
    signature = c.req.header("X-Callback-Token") || c.req.header("X-Signature") || c.req.header("X-Ipaymu-Signature");
  }

  const adapter = createPaymentAdapter(gateway.code, credentials, isProduction);

  const isValid = await adapter.verifyWebhook(payload, signature);
  if (!isValid) {
    return error(c, "Invalid signature", 401);
  }

  const parsed = adapter.parseWebhook(payload);

  const payment = await db.query.transactionPayments.findFirst({
    where: eq(transactionPayments.externalId, parsed.externalId),
  });

  if (!payment) {
    return success(c, { received: true });
  }

  if (payment.status === "verified") {
    return success(c, { received: true });
  }

  // Get transaction
  const txn = await db.query.transactions.findFirst({
    where: eq(transactions.id, payment.transactionId),
  });

  if (!txn) {
    return success(c, { received: true });
  }

  const newPaymentStatus = parsed.status === "success" ? "paid" : parsed.status === "expired" ? "cancelled" : "pending";
  const newTxPaymentStatus = parsed.status === "success" ? "verified" : parsed.status === "expired" ? "rejected" : "pending";

  // Use transaction to ensure atomicity
  try {
    await db.transaction(async (tx) => {
      // 1. Update transaction payment status
      await tx
        .update(transactionPayments)
        .set({
          status: newTxPaymentStatus,
          verifiedAt: parsed.paidAt,
          webhookPayload: payload,
          updatedAt: new Date(),
        })
        .where(eq(transactionPayments.id, payment.id));

      // 2. Update transaction status
      await tx
        .update(transactions)
        .set({
          paymentStatus: newPaymentStatus,
          paidAt: parsed.paidAt,
          paidAmount: parsed.status === "success" ? txn.totalAmount : 0,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, txn.id));

      // 3. If payment successful, process completion
      if (parsed.status === "success" && txn.productType === "campaign") {
        const campaign = await tx.query.campaigns.findFirst({
          where: eq(campaigns.id, txn.productId),
        });

        if (campaign) {
          // 4. Update campaign collected amount and donor count
          await tx
            .update(campaigns)
            .set({
              collected: campaign.collected + txn.subtotal,
              donorCount: campaign.donorCount + 1,
              updatedAt: new Date(),
            })
            .where(eq(campaigns.id, campaign.id));

          // 5. Send email (outside transaction - non-critical)
          if (txn.donorEmail && c.env.RESEND_API_KEY) {
            c.set('emailToSend', {
              donorEmail: txn.donorEmail,
              donorName: txn.donorName,
              campaignTitle: campaign.title,
              amount: txn.subtotal,
              invoiceNumber: txn.transactionNumber,
              paymentMethod: payment.paymentMethod || "Unknown",
            });
          }
        }
      }
    });

    // Keep qurban savings balance consistent when gateway webhook updates a savings transaction.
    const savingsId = (txn.typeSpecificData as any)?.savings_id;
    if (txn.category === "qurban_savings" && savingsId) {
      await syncQurbanSavingsBalance(db, savingsId);
    }

    // Qurban shared group: confirm slot when payment succeeds via gateway
    if (parsed.status === "success" && txn.productType === "qurban") {
      const { TransactionService } = await import("../services/transaction");
      const txnService = new TransactionService(db);
      await txnService.confirmSharedGroupSlot(txn.id);
    }

    // Send email after transaction successfully committed
    const emailData = c.get('emailToSend');
    if (emailData && c.env.RESEND_API_KEY) {
      try {
        const emailService = createEmailService(c.env.RESEND_API_KEY, c.env.FROM_EMAIL || "noreply@bantuanku.org");
        await emailService.sendPaymentSuccess(emailData);
      } catch (emailError) {
        // Log email error but don't fail the webhook
        console.error("Failed to send payment success email:", emailError);
      }
    }
  } catch (txError) {
    // Transaction failed - all changes rolled back
    console.error("Payment webhook transaction failed:", txError);
    return error(c, "Failed to process payment", 500);
  }

  return success(c, { received: true });
});

export default paymentsRoute;
