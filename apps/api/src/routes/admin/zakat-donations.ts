import { Hono } from "hono";
import { zakatDonations, zakatTypes, donatur, ledger, chartOfAccounts, media, settings, eq, and, sql, desc } from "@bantuanku/db";
import type { Env, Variables } from "../../types";
import { createId } from "@bantuanku/db";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { paginated } from "../../lib/response";
import { uploadToGCS, generateGCSPath, type GCSConfig } from "../../lib/gcs";

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

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: semua endpoint zakat donations butuh auth
app.use("*", requireAuth);

/**
 * GET /admin/zakat/donations
 * List all zakat donations with pagination and filters
 */
app.get("/", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const zakatTypeId = c.req.query("zakatTypeId");
  const donaturId = c.req.query("donaturId");
  const paymentStatus = c.req.query("paymentStatus");

  const offset = (page - 1) * limit;

  let conditions: any[] = [];

  if (zakatTypeId) {
    conditions.push(eq(zakatDonations.zakatTypeId, zakatTypeId));
  }

  if (donaturId) {
    conditions.push(eq(zakatDonations.donaturId, donaturId));
  }

  if (paymentStatus) {
    conditions.push(eq(zakatDonations.paymentStatus, paymentStatus));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        donation: zakatDonations,
        zakatType: zakatTypes,
        donatur: donatur,
      })
      .from(zakatDonations)
      .leftJoin(zakatTypes, eq(zakatDonations.zakatTypeId, zakatTypes.id))
      .leftJoin(donatur, eq(zakatDonations.donaturId, donatur.id))
      .where(whereClause)
      .orderBy(desc(zakatDonations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(zakatDonations)
      .where(whereClause),
  ]);

  // Enrich data
  const enrichedData = data.map((row) => ({
    ...row.donation,
    zakatTypeName: row.zakatType?.name,
    zakatTypeSlug: row.zakatType?.slug,
    donaturName: row.donatur?.name,
    donaturEmail: row.donatur?.email,
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

/**
 * GET /admin/zakat/donations/:id
 * Get single zakat donation by ID
 */
app.get("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const result = await db
    .select({
      donation: zakatDonations,
      zakatType: zakatTypes,
      donatur: donatur,
    })
    .from(zakatDonations)
    .leftJoin(zakatTypes, eq(zakatDonations.zakatTypeId, zakatTypes.id))
    .leftJoin(donatur, eq(zakatDonations.donaturId, donatur.id))
    .where(eq(zakatDonations.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    return c.json({ error: "Zakat donation not found" }, 404);
  }

  const enrichedData = {
    ...result[0].donation,
    zakatType: result[0].zakatType,
    donatur: result[0].donatur,
  };

  return c.json({
    success: true,
    data: enrichedData,
  });
});

/**
 * POST /admin/zakat/donations
 * Create new zakat donation
 */
app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  console.log("Received body:", body);

  const {
    zakatTypeId,
    donaturId,
    donorName,
    donorEmail,
    donorPhone,
    isAnonymous,
    amount,
    calculatorData,
    calculatedZakat,
    paymentMethodId,
    paymentStatus,
    paymentGateway,
    paymentReference,
    notes,
    message,
  } = body;

  if (!zakatTypeId || !donorName || !amount) {
    return c.json(
      { error: "zakatTypeId, donorName, and amount are required" },
      400
    );
  }

  try {
    // Generate reference ID
    const referenceId = `ZKT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Get zakat type untuk mapping COA
    const zakatType = await db
      .select()
      .from(zakatTypes)
      .where(eq(zakatTypes.id, zakatTypeId))
      .limit(1);

    if (!zakatType || zakatType.length === 0) {
      return c.json({ error: "Zakat type not found" }, 404);
    }

    const newDonation = await db
      .insert(zakatDonations)
      .values({
        id: createId(),
        referenceId,
        zakatTypeId,
        donaturId: donaturId || null,
        donorName,
        donorEmail: donorEmail || null,
        donorPhone: donorPhone || null,
        isAnonymous: isAnonymous ?? false,
        amount,
        calculatorData: calculatorData || null,
        calculatedZakat: calculatedZakat || null,
        paymentMethodId: paymentMethodId || null,
        paymentStatus: paymentStatus || "pending",
        paymentGateway: paymentGateway || null,
        paymentReference: paymentReference || null,
        paidAt: paymentStatus === "success" ? new Date() : null,
        notes: notes || null,
        message: message || null,
      })
      .returning();

    // NOTE: Ledger entry untuk zakat TIDAK dibuat otomatis disini
    // karena akan menyebabkan double counting di cash flow report.
    // Zakat donations sudah tercatat di tabel zakat_donations sendiri.

    return c.json(
      {
        success: true,
        data: newDonation[0],
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating zakat donation:", error);
    return c.json(
      { error: error.message || "Internal server error" },
      500
    );
  }
});

/**
 * PUT /admin/zakat/donations/:id
 * Update zakat donation
 */
app.put("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(zakatDonations)
    .where(eq(zakatDonations.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat donation not found" }, 404);
  }

  const {
    donorName,
    donorEmail,
    donorPhone,
    isAnonymous,
    amount,
    calculatorData,
    calculatedZakat,
    paymentMethodId,
    paymentStatus,
    paymentGateway,
    paymentReference,
    paidAt,
    notes,
    message,
  } = body;

  const updated = await db
    .update(zakatDonations)
    .set({
      donorName: donorName ?? existing[0].donorName,
      donorEmail: donorEmail !== undefined ? donorEmail : existing[0].donorEmail,
      donorPhone: donorPhone !== undefined ? donorPhone : existing[0].donorPhone,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : existing[0].isAnonymous,
      amount: amount ?? existing[0].amount,
      calculatorData: calculatorData !== undefined ? calculatorData : existing[0].calculatorData,
      calculatedZakat: calculatedZakat !== undefined ? calculatedZakat : existing[0].calculatedZakat,
      paymentMethodId: paymentMethodId !== undefined ? paymentMethodId : existing[0].paymentMethodId,
      paymentStatus: paymentStatus ?? existing[0].paymentStatus,
      paymentGateway: paymentGateway !== undefined ? paymentGateway : existing[0].paymentGateway,
      paymentReference: paymentReference !== undefined ? paymentReference : existing[0].paymentReference,
      paidAt: paidAt !== undefined ? (paidAt ? new Date(paidAt) : null) : existing[0].paidAt,
      notes: notes !== undefined ? notes : existing[0].notes,
      message: message !== undefined ? message : existing[0].message,
      updatedAt: new Date(),
    })
    .where(eq(zakatDonations.id, id))
    .returning();

  // Create ledger entry if status changed to success and wasn't success before
  if (paymentStatus === "success" && existing[0].paymentStatus !== "success") {
    const zakatType = await db
      .select()
      .from(zakatTypes)
      .where(eq(zakatTypes.id, existing[0].zakatTypeId))
      .limit(1);

    if (zakatType.length > 0) {
      const coaMapping: Record<string, string> = {
        "zakat-maal": "6201",
        "zakat-fitrah": "6202",
        "zakat-profesi": "6203",
        "zakat-pertanian": "6204",
        "zakat-peternakan": "6205",
      };

      const coaCode = coaMapping[zakatType[0].slug];

      if (coaCode) {
        const coaAccount = await db
          .select()
          .from(chartOfAccounts)
          .where(eq(chartOfAccounts.code, coaCode))
          .limit(1);

        if (coaAccount.length > 0) {
          await db.insert(ledger).values({
            id: createId(),
            date: new Date(),
            description: `Donasi ${zakatType[0].name} dari ${updated[0].donorName}`,
            reference: updated[0].referenceId,
            referenceType: "zakat_donation",
            referenceId: updated[0].id,
            coaId: coaAccount[0].id,
            debit: 0,
            credit: updated[0].amount,
            status: "paid",
          });
        }
      }
    }
  }

  return c.json({
    success: true,
    data: updated[0],
  });
});

/**
 * POST /admin/zakat/donations/:id/upload-proof
 * Upload payment proof for zakat donation
 */
app.post("/:id/upload-proof", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  try {
    // Parse multipart form data
    const body = await c.req.parseBody({ all: true });
    const file = body.file as File;
    const paymentStatus = body.paymentStatus as string || 'pending';
    const paymentReference = body.paymentReference as string;

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    // Check if donation exists
    const existing = await db
      .select()
      .from(zakatDonations)
      .where(eq(zakatDonations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: "Zakat donation not found" }, 404);
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '-');
    const finalFilename = `zakat-payment-${id}-${timestamp}.${extension}`;

    // Get buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if CDN is enabled
    const cdnConfig = await fetchCDNSettings(db);
    let path: string;
    let fullUrl: string;

    if (cdnConfig) {
      // CDN Mode: Upload to Google Cloud Storage
      console.log("CDN enabled, uploading zakat payment proof to GCS...");

      try {
        const gcsPath = generateGCSPath(finalFilename);
        fullUrl = await uploadToGCS(cdnConfig, buffer, gcsPath, file.type);
        path = fullUrl; // Store full GCS URL
        console.log("Zakat payment proof uploaded to GCS:", fullUrl);
      } catch (error) {
        console.error("GCS upload failed, using path only:", error);
        // If GCS fails, just use path (admin can re-upload)
        path = `/uploads/${finalFilename}`;
        fullUrl = path;
      }
    } else {
      // Local Mode: Use R2 bucket or local storage
      console.log("CDN disabled, using R2 bucket for zakat payment proof");
      path = `/uploads/${finalFilename}`;
      fullUrl = path;

      // Upload to R2 if available
      try {
        const bucket = c.env.BUCKET;
        if (bucket) {
          await bucket.put(finalFilename, file.stream(), {
            httpMetadata: {
              contentType: file.type,
            },
          });
        }
      } catch (error) {
        console.error("R2 upload error:", error);
      }
    }

    // Create media record
    const mediaRecord = await db.insert(media).values({
      id: createId(),
      filename: finalFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: path,
      path: path,
      folder: cdnConfig ? "gcs" : "uploads",
      category: "financial",
      uploadedAt: new Date(),
    }).returning();

    // Update zakat donation with payment info
    const updated = await db
      .update(zakatDonations)
      .set({
        paymentStatus: paymentStatus,
        paymentReference: paymentReference || `ZKT-${Date.now()}`,
        paidAt: paymentStatus === 'success' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(zakatDonations.id, id))
      .returning();

    return c.json({
      success: true,
      data: updated[0],
      media: mediaRecord[0],
    });
  } catch (error: any) {
    console.error("Error uploading zakat payment proof:", error);
    return c.json(
      { error: error.message || "Failed to upload payment proof" },
      500
    );
  }
});

/**
 * DELETE /admin/zakat/donations/:id
 * Delete zakat donation (admin only)
 */
app.delete("/:id", requireRoles(["admin", "super_admin"]), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const existing = await db
    .select()
    .from(zakatDonations)
    .where(eq(zakatDonations.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat donation not found" }, 404);
  }

  await db.delete(zakatDonations).where(eq(zakatDonations.id, id));

  return c.json({
    success: true,
    message: "Zakat donation deleted successfully",
  });
});

export default app;
