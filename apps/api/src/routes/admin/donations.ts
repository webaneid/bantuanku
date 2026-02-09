import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, like, sql, gte, lte } from "drizzle-orm";
import { donations, campaigns, donatur, generateReferenceId, createId, donationEvidences } from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import { createDonationLedgerEntry } from "../../services/ledger";
import type { Env, Variables } from "../../types";

const donationsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const manualDonationSchema = z.object({
  campaignId: z.string(),
  donaturId: z.string().optional(), // ID donatur dari database donatur
  amount: z.number().min(1000),
  donorName: z.string().min(2),
  donorEmail: z.string().email().optional(),
  donorPhone: z.string().optional(),
  isAnonymous: z.boolean().optional().default(false),
  message: z.string().optional(),
  note: z.string().optional(),
  paymentMethodId: z.string().optional(),
  paymentStatus: z.enum(["pending", "success", "failed", "expired"]).optional().default("success"),
});

donationsAdmin.get("/", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const status = c.req.query("status");
  const campaignId = c.req.query("campaignId");
  const donaturId = c.req.query("donaturId");
  const search = c.req.query("search");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const offset = (page - 1) * limit;

  const conditions = [];

  if (status) {
    conditions.push(eq(donations.paymentStatus, status));
  }
  if (campaignId) {
    conditions.push(eq(donations.campaignId, campaignId));
  }
  if (donaturId) {
    conditions.push(eq(donations.donaturId, donaturId));
  }
  if (search) {
    conditions.push(like(donations.donorName, `%${search}%`));
  }
  if (startDate) {
    conditions.push(gte(donations.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(donations.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.donations.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(donations.createdAt)],
      with: {
        campaign: {
          columns: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(whereClause),
  ]);

  // Enrich data with campaignTitle
  const enrichedData = data.map(donation => ({
    ...donation,
    campaignTitle: donation.campaign?.title,
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

donationsAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const donation = await db.query.donations.findFirst({
    where: eq(donations.id, id),
    with: {
      campaign: {
        with: {
          category: true,
        },
      },
      payment: true, // Include payment gateway records
      manualPayments: true, // Include manual payment proofs (NEW: donation_payments table)
      // paymentMethod tidak ada lagi, sekarang paymentMethodId adalah string code
    },
  });

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  // Get evidences (payment proofs) for this donation - LEGACY system
  const evidences = await db.query.donationEvidences.findMany({
    where: eq(donationEvidences.donationId, id),
    orderBy: [desc(donationEvidences.uploadedAt)],
  });

  return success(c, {
    ...donation,
    evidences, // Legacy evidences from donation_evidences table
    // manualPayments is already included in donation object from the relation above
  });
});

// Create donation (POST /)
donationsAdmin.post(
  "/",
  requireRole("super_admin", "admin_finance", "admin_campaign"),
  zValidator("json", manualDonationSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const user = c.get("user");

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, body.campaignId),
    });

    if (!campaign) {
      return error(c, "Campaign not found", 404);
    }

    const donationId = createId();
    const referenceId = generateReferenceId("DNT");
    const now = new Date();

    // Build metadata - include bank details if payment method is bank transfer
    const metadata: any = { createdBy: user!.id };

    // Jika payment method adalah transfer bank, ambil detail bank dari settings
    if (body.paymentMethodId && body.paymentMethodId.startsWith('bank-')) {
      const allSettings = await db.query.settings.findMany();
      const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
      const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

      if (bankAccountsSetting?.value) {
        try {
          const bankAccounts = JSON.parse(bankAccountsSetting.value);
          const selectedBank = bankAccounts.find((bank: any) =>
            bank.id === body.paymentMethodId
          );

          if (selectedBank) {
            metadata.bankName = selectedBank.bankName;
            metadata.accountNumber = selectedBank.accountNumber;
            metadata.accountName = selectedBank.accountName;
          }
        } catch (e) {
          console.error("Failed to parse bank accounts:", e);
        }
      }
    }

    await db.insert(donations).values({
      id: donationId,
      referenceId,
      campaignId: body.campaignId,
      donaturId: body.donaturId || null, // Simpan relasi ke donatur
      source: "admin",
      donorName: body.donorName, // Always save real name
      donorEmail: body.donorEmail,
      donorPhone: body.donorPhone,
      isAnonymous: body.isAnonymous || false, // Flag for display purposes
      amount: body.amount,
      feeAmount: 0,
      totalAmount: body.amount,
      paymentMethodId: body.paymentMethodId || null,
      paymentStatus: body.paymentStatus || "success",
      paidAt: body.paymentStatus === "success" ? now : null,
      message: body.message,
      note: body.note,
      metadata,
    });

    // Only update campaign stats if payment status is success
    if (body.paymentStatus === "success") {
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} + ${body.amount}`,
          donorCount: sql`${campaigns.donorCount} + 1`,
          updatedAt: now,
        })
        .where(eq(campaigns.id, body.campaignId));

      // Update donatur statistics if donaturId is provided
      if (body.donaturId) {
        await db
          .update(donatur)
          .set({
            totalDonations: sql`${donatur.totalDonations} + 1`,
            totalAmount: sql`${donatur.totalAmount} + ${body.amount}`,
            updatedAt: now,
          })
          .where(eq(donatur.id, body.donaturId));
      }

      // Create ledger entry for manual donation (only for success)
      try {
        await createDonationLedgerEntry(db, {
          donationId,
          amount: body.amount,
          campaignTitle: campaign.title,
          donorName: body.donorName, // Always use real name in ledger
          paymentMethod: body.paymentMethodId || 'Manual Entry',
          bankAccountCode: body.paymentMethodId?.startsWith('bank-') ? '1020' : '1010',
          createdBy: user!.id,
        });
      } catch (ledgerError) {
        console.error("Failed to create ledger entry for manual donation:", ledgerError);
        // Don't fail the donation creation if ledger entry fails
      }
    }

    return success(c, { id: donationId, referenceId }, "Donasi berhasil dibuat", 201);
  }
);

// Legacy endpoint for backward compatibility
donationsAdmin.post(
  "/manual",
  requireRole("super_admin", "admin_finance"),
  zValidator("json", manualDonationSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const user = c.get("user");

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, body.campaignId),
    });

    if (!campaign) {
      return error(c, "Campaign not found", 404);
    }

    const donationId = createId();
    const referenceId = generateReferenceId("DNT");
    const now = new Date();

    await db.insert(donations).values({
      id: donationId,
      referenceId,
      campaignId: body.campaignId,
      source: "admin",
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      donorPhone: body.donorPhone,
      isAnonymous: body.isAnonymous,
      amount: body.amount,
      feeAmount: 0,
      totalAmount: body.amount,
      paymentStatus: "success",
      paidAt: now,
      message: body.message,
      note: body.note,
      metadata: { createdBy: user!.id },
    });

    await db
      .update(campaigns)
      .set({
        collected: sql`${campaigns.collected} + ${body.amount}`,
        donorCount: sql`${campaigns.donorCount} + 1`,
        updatedAt: now,
      })
      .where(eq(campaigns.id, body.campaignId));

    // Create ledger entry for manual donation
    try {
      await createDonationLedgerEntry(db, {
        donationId,
        amount: body.amount,
        campaignTitle: campaign.title,
        donorName: body.donorName,
        paymentMethod: body.paymentMethodId || 'Manual Entry',
        bankAccountCode: body.paymentMethodId?.startsWith('bank-') ? '1020' : '1010',
        createdBy: user!.id,
      });
    } catch (ledgerError) {
      console.error("Failed to create ledger entry for manual donation:", ledgerError);
      // Don't fail the donation creation if ledger entry fails
    }

    return success(c, { id: donationId, referenceId }, "Manual donation created", 201);
  }
);

// Update donation (PUT /:id)
const updateDonationSchema = z.object({
  campaignId: z.string().optional(),
  amount: z.number().min(1000).optional(),
  donorName: z.string().min(2).optional(),
  donorEmail: z.string().email().optional(),
  donorPhone: z.string().optional(),
  isAnonymous: z.boolean().optional(),
  message: z.string().optional(),
  paymentStatus: z.enum(["pending", "success", "failed", "expired"]).optional(),
  paymentMethodId: z.string().optional(),
});

donationsAdmin.put(
  "/:id",
  requireRole("super_admin", "admin_finance", "admin_campaign"),
  zValidator("json", updateDonationSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const id = c.req.param("id");
    const user = c.get("user");

    const existingDonation = await db.query.donations.findFirst({
      where: eq(donations.id, id),
      with: {
        campaign: true,
      },
    });

    if (!existingDonation) {
      return error(c, "Donation not found", 404);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.campaignId !== undefined) updateData.campaignId = body.campaignId;
    if (body.amount !== undefined) {
      updateData.amount = body.amount;
      updateData.totalAmount = body.amount;
    }
    if (body.donorName !== undefined) updateData.donorName = body.donorName;
    if (body.donorEmail !== undefined) updateData.donorEmail = body.donorEmail;
    if (body.donorPhone !== undefined) updateData.donorPhone = body.donorPhone;
    if (body.isAnonymous !== undefined) {
      updateData.isAnonymous = body.isAnonymous;
      // Don't replace donorName - keep real name in database
    }
    if (body.message !== undefined) updateData.message = body.message;
    if (body.paymentStatus !== undefined) {
      updateData.paymentStatus = body.paymentStatus;
      // Set paidAt when status becomes success
      if (body.paymentStatus === "success" && existingDonation.paymentStatus !== "success") {
        updateData.paidAt = new Date();
      }
    }
    if (body.paymentMethodId !== undefined) {
      updateData.paymentMethodId = body.paymentMethodId;

      // Add bank details to metadata if payment method is bank transfer
      if (body.paymentMethodId.startsWith('bank-')) {
        const allSettings = await db.query.settings.findMany();
        const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
        const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

        if (bankAccountsSetting?.value) {
          try {
            const bankAccounts = JSON.parse(bankAccountsSetting.value);
            const selectedBank = bankAccounts.find((bank: any) =>
              bank.id === body.paymentMethodId
            );

            if (selectedBank) {
              // Merge with existing metadata
              const existingMetadata = existingDonation.metadata || {};
              updateData.metadata = {
                ...existingMetadata,
                bankName: selectedBank.bankName,
                accountNumber: selectedBank.accountNumber,
                accountName: selectedBank.accountName,
              };
            }
          } catch (e) {
            console.error("Failed to parse bank accounts:", e);
          }
        }
      }
    }

    await db.update(donations).set(updateData).where(eq(donations.id, id));

    // Handle campaign statistics when payment status changes
    const finalAmount = body.amount || existingDonation.amount;
    const wasPreviouslySuccess = existingDonation.paymentStatus === "success";
    const isNowSuccess = (body.paymentStatus !== undefined ? body.paymentStatus : existingDonation.paymentStatus) === "success";

    // Status changed from success to non-success: subtract from campaign
    if (wasPreviouslySuccess && !isNowSuccess) {
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} - ${existingDonation.amount}`,
          donorCount: sql`${campaigns.donorCount} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, existingDonation.campaignId));
    }

    // Status changed from non-success to success: add to campaign
    if (!wasPreviouslySuccess && isNowSuccess) {
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} + ${finalAmount}`,
          donorCount: sql`${campaigns.donorCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, existingDonation.campaignId));

      // Create ledger entry if payment status changed to success
      try {
        await createDonationLedgerEntry(db, {
          donationId: id,
          amount: finalAmount,
          campaignTitle: existingDonation.campaign?.title || 'Unknown Campaign',
          donorName: body.donorName || existingDonation.donorName,
          paymentMethod: body.paymentMethodId || existingDonation.paymentMethodId || 'Manual Update',
          bankAccountCode: (body.paymentMethodId || existingDonation.paymentMethodId)?.startsWith('bank-') ? '1020' : '1010',
          createdBy: user!.id,
        });
      } catch (ledgerError) {
        console.error("Failed to create ledger entry when updating donation status:", ledgerError);
        // Don't fail the update if ledger entry fails
      }
    }

    // Amount changed while status is success: update campaign collected
    if (wasPreviouslySuccess && isNowSuccess && body.amount !== undefined && body.amount !== existingDonation.amount) {
      const amountDiff = body.amount - existingDonation.amount;
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} + ${amountDiff}`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, existingDonation.campaignId));
    }

    return success(c, { id }, "Donasi berhasil diperbarui");
  }
);

// Delete donation (DELETE /:id)
donationsAdmin.delete(
  "/:id",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");

    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, id),
    });

    if (!donation) {
      return error(c, "Donation not found", 404);
    }

    // Update campaign collected amount and donor count
    if (donation.paymentStatus === "success") {
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} - ${donation.amount}`,
          donorCount: sql`${campaigns.donorCount} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, donation.campaignId));
    }

    await db.delete(donations).where(eq(donations.id, id));

    return success(c, { id }, "Donasi berhasil dihapus");
  }
);

donationsAdmin.get("/export", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const status = c.req.query("status");
  const campaignId = c.req.query("campaignId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (status) {
    conditions.push(eq(donations.paymentStatus, status));
  }
  if (campaignId) {
    conditions.push(eq(donations.campaignId, campaignId));
  }
  if (startDate) {
    conditions.push(gte(donations.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(donations.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.donations.findMany({
    where: whereClause,
    orderBy: [desc(donations.createdAt)],
  });

  return success(c, data);
});

// ===== DONATION EVIDENCE ROUTES =====

// GET /admin/donations/:id/evidence - List evidences for a donation
donationsAdmin.get("/:id/evidence", async (c) => {
  const db = c.get("db");
  const donationId = c.req.param("id");

  const data = await db.query.donationEvidences.findMany({
    where: eq(donationEvidences.donationId, donationId),
    orderBy: [desc(donationEvidences.uploadedAt)],
    with: {
      uploader: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return success(c, data);
});

// POST /admin/donations/:id/evidence - Create new evidence
const createEvidenceSchema = z.object({
  type: z.enum(["proof_of_payment", "receipt", "other"]),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url(),
});

donationsAdmin.post(
  "/:id/evidence",
  requireRole("super_admin", "admin_finance", "admin_campaign"),
  zValidator("json", createEvidenceSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const donationId = c.req.param("id");
    const body = c.req.valid("json");

    // Verify donation exists
    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, donationId),
    });

    if (!donation) {
      return error(c, "Donation not found", 404);
    }

    const [evidence] = await db
      .insert(donationEvidences)
      .values({
        donationId,
        ...body,
        uploadedBy: user!.id,
      })
      .returning();

    return success(c, evidence, "Evidence uploaded successfully", 201);
  }
);

// DELETE /admin/donations/:id/evidence/:evidenceId - Delete evidence
donationsAdmin.delete(
  "/:id/evidence/:evidenceId",
  requireRole("super_admin", "admin_finance", "admin_campaign"),
  async (c) => {
    const db = c.get("db");
    const evidenceId = c.req.param("evidenceId");
    const donationId = c.req.param("id");

    const existing = await db.query.donationEvidences.findFirst({
      where: eq(donationEvidences.id, evidenceId),
    });

    if (!existing) {
      return error(c, "Evidence not found", 404);
    }

    if (existing.donationId !== donationId) {
      return error(c, "Evidence does not belong to this donation", 400);
    }

    await db.delete(donationEvidences).where(eq(donationEvidences.id, evidenceId));

    return success(c, null, "Evidence deleted successfully");
  }
);

// POST /admin/donations/:id/approve-payment - Approve payment
donationsAdmin.post(
  "/:id/approve-payment",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const donationId = c.req.param("id");

    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, donationId),
      with: {
        campaign: true,
      },
    });

    if (!donation) {
      return error(c, "Donation not found", 404);
    }

    if (donation.paymentStatus !== "processing") {
      return error(c, "Only donations with status 'processing' can be approved", 400);
    }

    // Update donation status to success
    await db
      .update(donations)
      .set({
        paymentStatus: "success",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(donations.id, donationId));

    // Update campaign collected amount
    if (donation.campaign) {
      await db
        .update(campaigns)
        .set({
          collected: sql`${campaigns.collected} + ${donation.amount}`,
          donorCount: sql`${campaigns.donorCount} + 1`,
        })
        .where(eq(campaigns.id, donation.campaignId));
    }

    // Create ledger entry
    try {
      await createDonationLedgerEntry(db, {
        donationId: donation.id,
        amount: donation.amount,
        campaignTitle: donation.campaign?.title || 'Unknown Campaign',
        donorName: donation.donorName,
        paymentMethod: donation.paymentMethodId || 'Manual Approval',
        bankAccountCode: donation.paymentMethodId?.startsWith('bank-') ? '1020' : '1010',
        createdBy: c.get("user")?.id,
      });
    } catch (ledgerError) {
      console.error("Failed to create ledger entry when approving payment:", ledgerError);
      // Don't fail the approval if ledger entry fails
    }

    return success(c, null, "Payment approved successfully");
  }
);

// POST /admin/donations/:id/reject-payment - Reject payment
const rejectPaymentSchema = z.object({
  reason: z.string().optional(),
});

donationsAdmin.post(
  "/:id/reject-payment",
  requireRole("super_admin", "admin_finance"),
  zValidator("json", rejectPaymentSchema),
  async (c) => {
    const db = c.get("db");
    const donationId = c.req.param("id");
    const { reason } = c.req.valid("json");

    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, donationId),
    });

    if (!donation) {
      return error(c, "Donation not found", 404);
    }

    if (donation.paymentStatus !== "processing") {
      return error(c, "Only donations with status 'processing' can be rejected", 400);
    }

    // Update donation status to failed
    const updateData: any = {
      paymentStatus: "failed",
      updatedAt: new Date(),
    };

    if (reason) {
      updateData.note = reason;
    }

    await db
      .update(donations)
      .set(updateData)
      .where(eq(donations.id, donationId));

    return success(c, null, "Payment rejected");
  }
);

export default donationsAdmin;
