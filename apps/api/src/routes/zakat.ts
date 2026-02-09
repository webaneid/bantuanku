import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { zakatCalculatorConfigs, settings, zakatTypes, zakatDonations, zakatPayments, media, createId, paymentMethods } from "@bantuanku/db";
import {
  calculateZakatIncome,
  calculateZakatMaal,
  calculateZakatGold,
  calculateZakatTrade,
  calculateZakatFitrah,
  calculateFidyah,
  saveCalculationLog,
  getGoldPrice,
} from "../services/zakat";
import { success, error } from "../lib/response";
import { optionalAuthMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";
import { extractPath } from "./admin/media";
import * as fs from "fs";
import * as pathModule from "path";

const zakat = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /zakat/types - Public endpoint to get active zakat types
zakat.get("/types", async (c) => {
  const db = c.get("db");

  const types = await db
    .select()
    .from(zakatTypes)
    .where(eq(zakatTypes.isActive, true))
    .orderBy(zakatTypes.displayOrder);

  // Construct full URLs for images
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  const constructUrl = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return urlOrPath;
    // If already full URL (GCS CDN), return as-is
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    // If relative path, prepend API URL
    return `${apiUrl}${urlOrPath}`;
  };

  const enrichedData = types.map(type => ({
    ...type,
    imageUrl: constructUrl(type.imageUrl),
  }));

  return success(c, enrichedData);
});

zakat.get("/config", async (c) => {
  const db = c.get("db");

  const [configs, goldPrice, fitrahSetting, ricePriceSetting, fidyahSetting] = await Promise.all([
    db.query.zakatCalculatorConfigs.findMany({
      where: eq(zakatCalculatorConfigs.isActive, true),
    }),
    getGoldPrice(db),
    db.query.settings.findFirst({ where: eq(settings.key, "zakat_fitrah_amount") }),
    db.query.settings.findFirst({ where: eq(settings.key, "rice_price_per_kg") }),
    db.query.settings.findFirst({ where: eq(settings.key, "fidyah_amount_per_day") }),
  ]);

  return success(c, {
    calculators: configs,
    goldPricePerGram: goldPrice,
    zakatFitrahPerPerson: fitrahSetting ? parseInt(fitrahSetting.value) : 45000,
    ricePricePerKg: ricePriceSetting ? parseInt(ricePriceSetting.value) : 20000,
    fidyahPerDay: fidyahSetting ? parseInt(fidyahSetting.value) : 45000,
  });
});

const incomeSchema = z.object({
  monthlyIncome: z.number().min(0),
  otherIncome: z.number().min(0).optional(),
  monthlyExpenses: z.number().min(0).optional(),
});

zakat.post("/calculate/income", optionalAuthMiddleware, zValidator("json", incomeSchema), async (c) => {
  const params = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const result = await calculateZakatIncome(db, params);
  await saveCalculationLog(db, result, user?.id);

  return success(c, result);
});

const maalSchema = z.object({
  savings: z.number().min(0),
  deposits: z.number().min(0).optional(),
  stocks: z.number().min(0).optional(),
  otherAssets: z.number().min(0).optional(),
  debts: z.number().min(0).optional(),
});

zakat.post("/calculate/maal", optionalAuthMiddleware, zValidator("json", maalSchema), async (c) => {
  const params = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const result = await calculateZakatMaal(db, params);
  await saveCalculationLog(db, result, user?.id);

  return success(c, result);
});

const goldSchema = z.object({
  goldWeight: z.number().min(0),
  goldPrice: z.number().min(0).optional(),
});

zakat.post("/calculate/gold", optionalAuthMiddleware, zValidator("json", goldSchema), async (c) => {
  const params = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const result = await calculateZakatGold(db, params);
  await saveCalculationLog(db, result, user?.id);

  return success(c, result);
});

const tradeSchema = z.object({
  inventory: z.number().min(0),
  receivables: z.number().min(0).optional(),
  cash: z.number().min(0).optional(),
  payables: z.number().min(0).optional(),
});

zakat.post("/calculate/trade", optionalAuthMiddleware, zValidator("json", tradeSchema), async (c) => {
  const params = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const result = await calculateZakatTrade(db, params);
  await saveCalculationLog(db, result, user?.id);

  return success(c, result);
});

const fitrahSchema = z.object({
  numberOfPeople: z.number().min(1),
  pricePerPerson: z.number().min(0).optional(),
});

zakat.post("/calculate/fitrah", optionalAuthMiddleware, zValidator("json", fitrahSchema), async (c) => {
  const params = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const result = await calculateZakatFitrah(db, params);
  await saveCalculationLog(db, result, user?.id);

  return success(c, result);
});

const fidyahSchema = z.object({
  numberOfDays: z.number().min(1),
  pricePerDay: z.number().min(0).optional(),
});

zakat.post("/calculate/fidyah", optionalAuthMiddleware, zValidator("json", fidyahSchema), async (c) => {
  const params = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const result = await calculateFidyah(db, params);
  await saveCalculationLog(db, result, user?.id);

  return success(c, result);
});

// POST /zakat/donations/:id/confirm-payment - Confirm payment method selection
const confirmPaymentSchema = z.object({
  paymentMethodId: z.string(),
  metadata: z.record(z.any()).optional(),
});

zakat.post("/donations/:id/confirm-payment", zValidator("json", confirmPaymentSchema), async (c) => {
  const donationId = c.req.param("id");
  const { paymentMethodId, metadata: providedMetadata } = c.req.valid("json");
  const db = c.get("db");

  // Verify zakat donation exists
  const donation = await db.query.zakatDonations.findFirst({
    where: eq(zakatDonations.id, donationId),
  });

  if (!donation) {
    return error(c, "Zakat donation not found", 404);
  }

  // Update zakat donation with payment method
  const updateData: any = {
    paymentMethodId,
    paymentStatus: "pending", // Pending until proof uploaded
    updatedAt: new Date(),
  };

  // If metadata provided from frontend, use it
  if (providedMetadata && Object.keys(providedMetadata).length > 0) {
    const existingMetadata = donation.metadata || {};
    updateData.metadata = {
      ...existingMetadata,
      ...providedMetadata,
    };
  }
  // Otherwise, try to get from payment_methods table
  else if (paymentMethodId.startsWith('bank-') || paymentMethodId.includes('qris')) {
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.code, paymentMethodId),
    });

    if (paymentMethod?.details) {
      const existingMetadata = donation.metadata || {};
      const newMetadata: any = { ...existingMetadata };

      if (paymentMethodId.startsWith('bank-')) {
        newMetadata.bankName = paymentMethod.details.bankName || paymentMethod.name;
        newMetadata.accountNumber = paymentMethod.details.accountNumber;
        newMetadata.accountName = paymentMethod.details.accountName;
      } else if (paymentMethodId.includes('qris')) {
        newMetadata.qrisName = paymentMethod.details.name || paymentMethod.name;
        if (paymentMethod.details.nmid) {
          newMetadata.nmid = paymentMethod.details.nmid;
        }
      }

      updateData.metadata = newMetadata;
    }
  }

  await db
    .update(zakatDonations)
    .set(updateData)
    .where(eq(zakatDonations.id, donationId));

  return success(c, { id: donationId, paymentMethodId }, "Payment method confirmed");
});

// POST /zakat/donations/:id/upload-proof - Upload payment proof
zakat.post("/donations/:id/upload-proof", async (c) => {
  try {
    const donationId = c.req.param("id");
    const db = c.get("db");

    // Verify zakat donation exists
    const donation = await db.query.zakatDonations.findFirst({
      where: eq(zakatDonations.id, donationId),
    });

    if (!donation) {
      return error(c, "Zakat donation not found", 404);
    }

    // Parse multipart form data
    const body = await c.req.parseBody();
    const file = body.file as File;
    const transferAmount = body.amount ? Number(body.amount) : null;

    if (!file) {
      return error(c, "No file provided", 400);
    }

    // Validate transfer amount
    if (!transferAmount || transferAmount <= 0) {
      return error(c, "Invalid transfer amount", 400);
    }

    // Validate file type (images and PDFs only)
    const allowedTypes = ["image/", "application/pdf"];
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      return error(c, "Only image and PDF files are allowed", 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return error(c, "File size must be less than 5MB", 400);
    }

    // Generate filename
    const sanitizedName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '-');
    const finalFilename = `${Date.now()}-${sanitizedName}`;
    const path = `/uploads/${finalFilename}`;

    // Get buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store in filesystem
    try {
      const uploadsDir = pathModule.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = pathModule.join(uploadsDir, finalFilename);
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      console.error("Filesystem error:", error);
    }

    // Store in global map for immediate access
    if (!global.uploadedFiles) {
      global.uploadedFiles = new Map();
    }
    global.uploadedFiles.set(finalFilename, buffer);

    // Save to media table with financial category
    await db
      .insert(media)
      .values({
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path,
        path: path,
        folder: "uploads",
        category: "financial", // Kategori finansial untuk bukti transfer
      });

    // Construct URL from path
    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
    const fileUrl = `${apiUrl}${path}`;

    // Determine payment method type and channel
    let paymentMethodType = "bank_transfer";
    let paymentChannel = null;

    if (donation.paymentMethodId) {
      const paymentMethodRecord = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.code, donation.paymentMethodId),
      });

      if (paymentMethodRecord) {
        paymentMethodType = paymentMethodRecord.type;
        paymentChannel = donation.paymentMethodId;
      } else {
        // Fallback logic for QRIS/bank detection
        if (donation.paymentMethodId.includes('qris')) {
          paymentMethodType = 'qris';
          paymentChannel = donation.paymentMethodId;
        }
      }
    }

    // Generate notes based on transfer amount
    let paymentNotes = "Bukti pembayaran dari user";
    if (transferAmount > donation.amount) {
      const excess = transferAmount - donation.amount;
      paymentNotes += ` (Transfer lebih: ${excess})`;
    } else if (transferAmount < donation.amount) {
      const shortage = donation.amount - transferAmount;
      paymentNotes += ` (Transfer kurang: ${shortage}, pembayaran sebagian)`;
    }

    // Generate payment number
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const paymentNumber = `PAY-ZKT-${timestamp}-${randomStr}`;

    // Create payment record
    const paymentData = {
      id: createId(),
      paymentNumber: paymentNumber,
      zakatDonationId: donationId,
      amount: transferAmount, // Use actual transfer amount
      paymentMethod: paymentMethodType,
      paymentChannel: paymentChannel,
      paymentProof: fileUrl,
      status: "pending" as const,
      notes: paymentNotes,
    };

    await db.insert(zakatPayments).values(paymentData);

    // Update zakat donation with actual transfer amount
    const newPaidAmount = donation.paidAmount + transferAmount;

    await db
      .update(zakatDonations)
      .set({
        paidAmount: newPaidAmount,
        paymentStatus: "pending", // Keep pending until admin verifies
        updatedAt: new Date(),
      })
      .where(eq(zakatDonations.id, donationId));

    return success(c, {
      url: fileUrl,
      filename: finalFilename,
      paidAmount: newPaidAmount,
      paymentStatus: "pending",
    }, "Payment proof uploaded successfully");

  } catch (err) {
    console.error("Error uploading payment proof:", err);
    return error(c, "Failed to upload payment proof", 500);
  }
});

// POST /zakat/donations - Public endpoint to create zakat donation
const createZakatDonationSchema = z.object({
  zakatTypeId: z.string(),
  donorName: z.string().min(2),
  donorEmail: z.string().email().optional(),
  donorPhone: z.string().optional(),
  isAnonymous: z.boolean().optional().default(false),
  amount: z.number().min(10000),
  calculatorData: z.any().optional(),
  message: z.string().optional(),
});

zakat.post("/donations", optionalAuthMiddleware, zValidator("json", createZakatDonationSchema), async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  // Validate zakat type exists
  const zakatType = await db.query.zakatTypes.findFirst({
    where: eq(zakatTypes.id, body.zakatTypeId),
  });

  if (!zakatType) {
    return error(c, "Zakat type not found", 404);
  }

  // Generate reference ID
  const referenceId = `ZKT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  try {
    const newDonation = await db.insert(zakatDonations).values({
      id: createId(),
      referenceId,
      zakatTypeId: body.zakatTypeId,
      donorName: body.donorName,
      donorEmail: body.donorEmail || null,
      donorPhone: body.donorPhone || null,
      isAnonymous: body.isAnonymous ?? false,
      amount: body.amount,
      calculatorData: body.calculatorData || null,
      paymentStatus: 'pending',
      message: body.message || null,
      userId: user?.id || null,
    }).returning();

    return success(c, newDonation[0], "Zakat donation created successfully", 201);
  } catch (err) {
    console.error("Error creating zakat donation:", err);
    return error(c, "Failed to create zakat donation", 500);
  }
});

// GET /zakat/donations/invoice/:referenceId - Public endpoint to get zakat donation invoice
zakat.get("/donations/invoice/:referenceId", async (c) => {
  const db = c.get("db");
  const referenceId = c.req.param("referenceId");

  const donation = await db.query.zakatDonations.findFirst({
    where: eq(zakatDonations.referenceId, referenceId),
    with: {
      zakatType: {
        columns: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
      },
    },
  });

  if (!donation) {
    return error(c, "Zakat donation not found", 404);
  }

  return success(c, donation);
});

export default zakat;
