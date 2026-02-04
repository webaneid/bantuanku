import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { donations, payments, campaigns, paymentGateways, paymentMethods, paymentGatewayCredentials, bankAccounts, createId } from "@bantuanku/db";
import { createPaymentAdapter } from "../services/payment";
import { createInvoice } from "../services/invoice";
import { createDonationLedgerEntry } from "../services/ledger";
import { createEmailService } from "../services/email";
import { success, error } from "../lib/response";
import { paymentRateLimit } from "../middleware/ratelimit";
import type { Env, Variables } from "../types";
import type { Database } from "@bantuanku/db";

const paymentsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// Helper function to determine bank account code from payment method (dynamic from settings)
async function determineBankCode(db: Database, paymentMethodId?: string): Promise<string> {
  // Handle cash
  if (paymentMethodId === 'cash') return '1110';

  // Get bank accounts from settings
  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
  const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

  let bankAccounts: any[] = [];
  if (bankAccountsSetting?.value) {
    try {
      bankAccounts = JSON.parse(bankAccountsSetting.value);
    } catch (e) {
      console.error("Failed to parse bank accounts:", e);
    }
  }

  if (!paymentMethodId) {
    // Get first bank or default to 1120
    return bankAccounts[0]?.coaCode || '1120';
  }

  // Try to find bank by matching payment method ID
  const bank = bankAccounts.find((b: any) =>
    paymentMethodId.toLowerCase().includes(b.id.toLowerCase())
  );

  return bank?.coaCode || '1120';
}

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
          nmid: acc.nmid || "",
          imageUrl: acc.imageUrl || "",
          programs: Array.isArray(acc.programs) && acc.programs.length > 0 ? acc.programs : ["general"],
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
            nmid: acc.nmid || undefined,
            imageUrl: acc.imageUrl || undefined,
          },
          programs: acc.programs,
        });
      });
    } else {
      // fallback: single entry using legacy keys if any
      const legacyName = paymentSettings.find((s: any) => s.key === "payment_qris_name")?.value || "QRIS";
      const legacyNmid = paymentSettings.find((s: any) => s.key === "payment_qris_nmid")?.value || "";
      const legacyImage = paymentSettings.find((s: any) => s.key === "payment_qris_image")?.value || "";
      methods.push({
        id: "qris",
        code: "qris",
        name: legacyName,
        type: "qris",
        details: {
          name: legacyName,
          nmid: legacyNmid || undefined,
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
  donationId: z.string(),
  methodId: z.string(),
  channel: z.string().optional(), // Optional channel for payment gateways (e.g., "qris:qris", "va:bca")
});

paymentsRoute.post("/create", paymentRateLimit, zValidator("json", createPaymentSchema), async (c) => {
  const { donationId, methodId, channel } = c.req.valid("json");
  const db = c.get("db");

  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, donationId),
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  if (donation.paymentStatus !== "pending") {
    return error(c, "Donation already processed", 400);
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
      const secretKey = paymentSettings.find((s: any) => s.key === "payment_flip_secret_key" || s.key === "flip_secret_key")?.value;
      const validationToken = paymentSettings.find((s: any) => s.key === "payment_flip_validation_token" || s.key === "flip_validation_token")?.value;
      const mode = paymentSettings.find((s: any) => s.key === "payment_flip_mode" || s.key === "flip_mode")?.value || "sandbox";

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
    donationId: donation.id,
    amount: donation.totalAmount,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail || undefined,
    donorPhone: donation.donorPhone || undefined,
    methodCode,
  });

  if (!result.success) {
    return error(c, result.error || "Payment creation failed", 400);
  }

  const paymentId = createId();

  await db.insert(payments).values({
    id: paymentId,
    donationId: donation.id,
    gatewayId: gateway.id,
    methodId: method?.id || methodId,
    externalId: result.externalId,
    amount: donation.totalAmount,
    paymentCode: result.paymentCode,
    paymentUrl: result.paymentUrl,
    qrCode: result.qrCode,
    status: "pending",
    expiredAt: result.expiredAt,
  });

  await db
    .update(donations)
    .set({
      paymentMethodId: method?.id || methodId,
      paymentStatus: "processing",
      expiredAt: result.expiredAt,
      updatedAt: new Date(),
    })
    .where(eq(donations.id, donation.id));

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
      const secretKey = paymentSettings.find((s: any) => s.key === "payment_flip_secret_key" || s.key === "flip_secret_key")?.value;
      const validationToken = paymentSettings.find((s: any) => s.key === "payment_flip_validation_token" || s.key === "flip_validation_token")?.value;
      const mode = paymentSettings.find((s: any) => s.key === "payment_flip_mode" || s.key === "flip_mode")?.value || "sandbox";

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

  const payload = await c.req.json();
  const signature = c.req.header("X-Callback-Token") || c.req.header("X-Signature") || c.req.header("X-Ipaymu-Signature");

  const adapter = createPaymentAdapter(gateway.code, credentials, isProduction);

  const isValid = await adapter.verifyWebhook(payload, signature);
  if (!isValid) {
    return error(c, "Invalid signature", 401);
  }

  const parsed = adapter.parseWebhook(payload);

  const payment = await db.query.payments.findFirst({
    where: eq(payments.externalId, parsed.externalId),
  });

  if (!payment) {
    return success(c, { received: true });
  }

  if (payment.status === "success") {
    return success(c, { received: true });
  }

  // Get donation first (before transaction)
  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, payment.donationId),
  });

  if (!donation) {
    return success(c, { received: true });
  }

  const newStatus = parsed.status === "success" ? "success" : parsed.status === "expired" ? "expired" : "failed";

  // Use transaction to ensure atomicity
  // If any operation fails, all changes are rolled back
  try {
    await db.transaction(async (tx) => {
      // 1. Update payment status
      await tx
        .update(payments)
        .set({
          status: parsed.status,
          paidAt: parsed.paidAt,
          webhookPayload: payload,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      // 2. Update donation status
      await tx
        .update(donations)
        .set({
          paymentStatus: newStatus,
          paidAt: parsed.paidAt,
          updatedAt: new Date(),
        })
        .where(eq(donations.id, donation.id));

      // 3. If payment successful, process completion
      if (parsed.status === "success") {
        const campaign = await tx.query.campaigns.findFirst({
          where: eq(campaigns.id, donation.campaignId),
        });

        if (campaign) {
          // 4. Update campaign collected amount and donor count
          await tx
            .update(campaigns)
            .set({
              collected: campaign.collected + donation.amount,
              donorCount: campaign.donorCount + 1,
              updatedAt: new Date(),
            })
            .where(eq(campaigns.id, campaign.id));

          // 5. Create invoice
          await createInvoice(tx, {
            donationId: donation.id,
            amount: donation.amount,
            feeAmount: donation.feeAmount,
            payerName: donation.donorName,
            payerEmail: donation.donorEmail || undefined,
            payerPhone: donation.donorPhone || undefined,
          });

          // 6. Create ledger entry
          const method = payment.methodId ? await tx.query.paymentMethods.findFirst({
            where: eq(paymentMethods.id, payment.methodId),
          }) : null;

          const bankCode = await determineBankCode(tx, donation.paymentMethodId);

          await createDonationLedgerEntry(tx, {
            donationId: donation.id,
            amount: donation.amount,
            campaignTitle: campaign.title,
            donorName: donation.donorName,
            paymentMethod: method?.name || donation.paymentMethodId || 'Unknown',
            bankAccountCode: bankCode,
          });

          // 7. Send email (outside transaction - non-critical)
          // Email sending happens after transaction commits
          if (donation.donorEmail && c.env.RESEND_API_KEY && method) {
            // Store email data to send after transaction
            c.set('emailToSend', {
              donorEmail: donation.donorEmail,
              donorName: donation.donorName,
              campaignTitle: campaign.title,
              amount: donation.amount,
              invoiceNumber: donation.referenceId,
              paymentMethod: method?.name || "Unknown",
            });
          }
        }
      }
    });

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
