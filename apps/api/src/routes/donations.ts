import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { donations, campaigns, donationEvidences, media, invoices, settings, payments, paymentMethods, donationPayments, generateReferenceId, createId } from "@bantuanku/db";
import { success, error } from "../lib/response";
import { optionalAuthMiddleware } from "../middleware/auth";
import { createEmailService } from "../services/email";
import type { Env, Variables } from "../types";
import { addHoursWIB } from "../utils/timezone";
import { uploadToGCS, generateGCSPath, type GCSConfig } from "../lib/gcs";
import * as fs from "fs";
import * as pathModule from "path";

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

const donationsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createDonationSchema = z.object({
  campaignId: z.string(),
  amount: z.number().min(10000).optional(), // Optional for Fidyah (will be calculated)
  donorName: z.string().min(2),
  donorEmail: z.string().email().optional(),
  donorPhone: z.string().optional(),
  isAnonymous: z.boolean().optional().default(false),
  message: z.string().optional(),
  // Fidyah-specific fields
  fidyahPersonCount: z.number().min(1).optional(),
  fidyahDayCount: z.number().min(1).optional(),
});

donationsRoute.post("/", optionalAuthMiddleware, zValidator("json", createDonationSchema), async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");
  const user = c.get("user");

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, body.campaignId),
  });

  if (!campaign) {
    return error(c, "Campaign not found", 404);
  }

  if (campaign.status !== "active") {
    return error(c, "Campaign is not active", 400);
  }

  // Calculate amount for Fidyah if metadata is provided
  let finalAmount = body.amount || 0;
  let metadata: any = null;

  if (campaign.pillar?.toLowerCase() === 'fidyah' && body.fidyahPersonCount && body.fidyahDayCount) {
    // Fetch fidyah price from settings
    const fidyahSetting = await db.query.settings.findFirst({
      where: (settings: any, { eq }: any) => eq(settings.key, "fidyah_amount_per_day"),
    });

    if (!fidyahSetting || !fidyahSetting.value) {
      return error(c, "Fidyah price not configured", 400);
    }

    const pricePerDay = parseInt(fidyahSetting.value);
    finalAmount = pricePerDay * body.fidyahPersonCount * body.fidyahDayCount;

    metadata = {
      fidyah_person_count: body.fidyahPersonCount,
      fidyah_day_count: body.fidyahDayCount,
      fidyah_price_per_day: pricePerDay,
    };
  }

  // Validate amount
  if (finalAmount < 10000) {
    return error(c, "Minimum donation amount is Rp 10,000", 400);
  }

  const donationId = createId();
  const referenceId = generateReferenceId("DNT");

  const expiredAt = addHoursWIB(new Date(), 24);

  await db.insert(donations).values({
    id: donationId,
    referenceId,
    campaignId: body.campaignId,
    userId: user?.id,
    source: user ? "user" : "guest",
    donorName: body.donorName,
    donorEmail: body.donorEmail,
    donorPhone: body.donorPhone,
    isAnonymous: body.isAnonymous,
    amount: finalAmount,
    feeAmount: 0,
    totalAmount: finalAmount,
    paymentStatus: "pending",
    expiredAt,
    message: body.message,
    metadata,
  });

  // Create invoice for this donation
  const invoiceNumber = generateReferenceId("INV");
  await db.insert(invoices).values({
    id: createId(),
    invoiceNumber,
    donationId,
    issuedAt: new Date(),
    subtotal: finalAmount,
    feeAmount: 0,
    totalAmount: finalAmount,
    payerName: body.donorName,
    payerEmail: body.donorEmail,
    payerPhone: body.donorPhone,
    status: "issued",
    dueDate: expiredAt,
  });

  // Send email notification
  if (body.donorEmail && c.env.RESEND_API_KEY) {
    const emailService = createEmailService(c.env.RESEND_API_KEY, c.env.FROM_EMAIL || "noreply@bantuanku.org");
    await emailService.sendDonationConfirmation({
      donorEmail: body.donorEmail,
      donorName: body.donorName,
      campaignTitle: campaign.title,
      amount: finalAmount,
      invoiceNumber: invoiceNumber,
      paymentMethod: "Pending",
    });
  }

  return success(
    c,
    {
      id: donationId,
      referenceId,
      amount: finalAmount,
      expiredAt,
      metadata,
    },
    "Donation created",
    201
  );
});

donationsRoute.get("/invoice/:referenceId", async (c) => {
  const db = c.get("db");
  const referenceId = c.req.param("referenceId");

  const donation = await db.query.donations.findFirst({
    where: eq(donations.referenceId, referenceId),
    with: {
      campaign: {
        columns: {
          id: true,
          title: true,
          slug: true,
          pillar: true,
        },
        with: {
          category: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  // Get evidences
  const { donationEvidences } = await import("@bantuanku/db");
  const evidences = await db.query.donationEvidences.findMany({
    where: eq(donationEvidences.donationId, donation.id),
  });

  // Format evidence URLs
  const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
  const formattedEvidences = evidences.map((evidence) => ({
    ...evidence,
    fileUrl: evidence.fileUrl.startsWith("http") ? evidence.fileUrl : `${apiUrl}${evidence.fileUrl}`,
  }));

  return success(c, { ...donation, evidences: formattedEvidences });
});

donationsRoute.get("/:id", optionalAuthMiddleware, async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, id),
    columns: {
      id: true,
      referenceId: true,
      campaignId: true,
      donorName: true,
      isAnonymous: true,
      amount: true,
      feeAmount: true,
      totalAmount: true,
      paymentStatus: true,
      paidAt: true,
      expiredAt: true,
      message: true,
      createdAt: true,
    },
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  return success(c, donation);
});

// Get payment details for a donation
donationsRoute.get("/:id/payment", optionalAuthMiddleware, async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  // First check if donation exists
  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, id),
    columns: {
      id: true,
      paymentStatus: true,
      expiredAt: true,
    },
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  // Get payment details
  const payment = await db.query.payments.findFirst({
    where: eq(payments.donationId, id),
    columns: {
      id: true,
      methodId: true,
      paymentCode: true,
      paymentUrl: true,
      qrCode: true,
      status: true,
      expiredAt: true,
      paidAt: true,
      createdAt: true,
    },
  });

  if (!payment) {
    return success(c, null);
  }

  return success(c, payment);
});

donationsRoute.get("/check/:referenceId", async (c) => {
  const db = c.get("db");
  const referenceId = c.req.param("referenceId");

  const donation = await db.query.donations.findFirst({
    where: eq(donations.referenceId, referenceId),
    columns: {
      id: true,
      referenceId: true,
      campaignId: true,
      donorName: true,
      isAnonymous: true,
      amount: true,
      totalAmount: true,
      paymentStatus: true,
      paidAt: true,
      expiredAt: true,
      createdAt: true,
    },
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  return success(c, donation);
});

// GET /donations/campaign/:campaignId - Get donations for a campaign (public)
donationsRoute.get("/campaign/:campaignId", async (c) => {
  const db = c.get("db");
  const campaignId = c.req.param("campaignId");
  const limit = parseInt(c.req.query("limit") || "20");
  const page = parseInt(c.req.query("page") || "1");
  const offset = (page - 1) * limit;

  const { desc, and, count } = await import("drizzle-orm");

  // Count total successful donations for this campaign
  const [totalResult] = await db
    .select({ count: count() })
    .from(donations)
    .where(
      and(
        eq(donations.campaignId, campaignId),
        eq(donations.paymentStatus, "success")
      )
    );

  const total = totalResult?.count || 0;
  const totalPages = Math.ceil(total / limit);

  // Get paginated donations
  const donationsList = await db.query.donations.findMany({
    where: and(
      eq(donations.campaignId, campaignId),
      eq(donations.paymentStatus, "success")
    ),
    columns: {
      id: true,
      donorName: true,
      isAnonymous: true,
      amount: true,
      message: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: [desc(donations.paidAt)],
    limit,
    offset,
  });

  // Mask anonymous donors
  const publicDonations = donationsList.map((d) => ({
    id: d.id,
    donorName: d.isAnonymous ? "Hamba Allah" : d.donorName,
    amount: d.amount,
    message: d.message,
    paidAt: d.paidAt,
    createdAt: d.createdAt,
  }));

  return c.json({
    success: true,
    data: publicDonations,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

// POST /donations/:id/upload-proof - Upload payment proof (public endpoint for donors)
donationsRoute.post("/:id/upload-proof", async (c) => {
  try {
    const donationId = c.req.param("id");
    const db = c.get("db");

    // Verify donation exists
    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, donationId),
    });

    if (!donation) {
      return error(c, "Donation not found", 404);
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

    // Get buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if CDN is enabled
    const cdnConfig = await fetchCDNSettings(db);
    let path: string;
    let fullUrl: string;

    if (cdnConfig) {
      // CDN Mode: Upload to Google Cloud Storage
      console.log("CDN enabled, uploading payment proof to GCS...");

      try {
        const gcsPath = generateGCSPath(finalFilename);
        fullUrl = await uploadToGCS(cdnConfig, buffer, gcsPath, file.type);
        path = fullUrl; // Store full GCS URL
        console.log("Payment proof uploaded to GCS:", fullUrl);
      } catch (error) {
        console.error("GCS upload failed, falling back to local storage:", error);
        // Fallback to local storage if GCS fails
        path = `/uploads/${finalFilename}`;
        fullUrl = path;

        // Store locally as fallback
        try {
          const uploadsDir = pathModule.join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          fs.writeFileSync(pathModule.join(uploadsDir, finalFilename), buffer);
        } catch (fsError) {
          console.error("Local storage also failed:", fsError);
        }
      }
    } else {
      // Local Mode: Store in filesystem
      console.log("CDN disabled, using local storage for payment proof");
      path = `/uploads/${finalFilename}`;
      fullUrl = path;

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

      // Store in global map for immediate access (local mode only)
      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      global.uploadedFiles.set(finalFilename, buffer);
    }

    // Save to media table with financial category
    // Note: id is auto-generated by $defaultFn
    await db
      .insert(media)
      .values({
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path,
        path: path,
        folder: cdnConfig ? "gcs" : "uploads",
        category: "financial", // Kategori finansial untuk bukti transfer
      });

    // Save evidence to database (linked to donation)
    const [evidence] = await db
      .insert(donationEvidences)
      .values({
        donationId: donationId,
        type: "proof_of_payment",
        title: "Bukti Transfer",
        fileUrl: path,
      })
      .returning();

    // Construct URL from path
    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
    const fileUrl = fullUrl.startsWith('http') ? fullUrl : `${apiUrl}${fullUrl}`;

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
    if (transferAmount > donation.totalAmount) {
      const excess = transferAmount - donation.totalAmount;
      paymentNotes += ` (Transfer lebih: ${excess})`;
    } else if (transferAmount < donation.totalAmount) {
      const shortage = donation.totalAmount - transferAmount;
      paymentNotes += ` (Transfer kurang: ${shortage}, pembayaran sebagian)`;
    }

    // Generate payment number
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const paymentNumber = `PAY-DON-${timestamp}-${randomStr}`;

    // Create payment record
    const paymentData = {
      id: createId(),
      paymentNumber: paymentNumber,
      donationId: donationId,
      amount: transferAmount, // Use actual transfer amount
      paymentMethod: paymentMethodType,
      paymentChannel: paymentChannel,
      paymentProof: fileUrl,
      status: "pending" as const,
      notes: paymentNotes,
    };

    await db.insert(donationPayments).values(paymentData);

    // Update donation with actual transfer amount
    const newPaidAmount = donation.paidAmount + transferAmount;

    await db
      .update(donations)
      .set({
        paidAmount: newPaidAmount,
        paymentStatus: "pending", // Keep pending until admin verifies
        updatedAt: new Date(),
      })
      .where(eq(donations.id, donationId));

    return success(c, {
      id: evidence.id,
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

// POST /donations/:id/confirm-payment - Confirm payment method selection
const confirmPaymentSchema = z.object({
  paymentMethodId: z.string(),
  metadata: z.record(z.any()).optional(),
});

donationsRoute.post("/:id/confirm-payment", zValidator("json", confirmPaymentSchema), async (c) => {
  const donationId = c.req.param("id");
  const { paymentMethodId, metadata: providedMetadata } = c.req.valid("json");
  const db = c.get("db");

  // Verify donation exists
  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, donationId),
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  // Update donation with payment method
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
    .update(donations)
    .set(updateData)
    .where(eq(donations.id, donationId));

  return success(c, { id: donationId, paymentMethodId }, "Payment method confirmed");
});

export default donationsRoute;
