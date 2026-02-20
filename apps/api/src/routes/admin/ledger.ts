/**
 * @deprecated Legacy Ledger System - Read-Only
 *
 * This endpoint is deprecated. All new disbursements should use /admin/disbursements instead.
 * This route is kept for backward compatibility and historical data access only.
 *
 * Migration: Historical ledger data has been migrated to the disbursements table (migration 061).
 * Legacy data remains in this table for audit trail purposes.
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { ledger, campaigns, users, evidences, chartOfAccounts, createId, generateReferenceId } from "@bantuanku/db";
import { success, error as errorResponse, paginated } from "../../lib/response";
import { createDisbursementLedgerEntry } from "../../services/ledger";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const ledgerAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Legacy ledger is fully deprecated (migration anti-legacy phase)
ledgerAdmin.use("*", async (c) => {
  return errorResponse(
    c,
    "Legacy ledger endpoint is deprecated. Use /admin/disbursements and /admin/reports endpoints (universal transactions + disbursements).",
    410
  );
});

// GET /admin/ledger - List with pagination and filters
const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  status: z.enum(["draft", "submitted", "approved", "rejected", "paid"]).optional(),
  campaignId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

ledgerAdmin.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = c.get("db");
  const query = c.req.valid("query");

  const offset = (query.page - 1) * query.limit;
  const conditions = [];

  if (query.status) {
    conditions.push(eq(ledger.status, query.status));
  }

  if (query.campaignId) {
    conditions.push(eq(ledger.campaignId, query.campaignId));
  }

  if (query.startDate) {
    conditions.push(gte(ledger.paidAt, new Date(query.startDate)));
  }

  if (query.endDate) {
    conditions.push(lte(ledger.paidAt, new Date(query.endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.ledger.findMany({
      where: whereClause,
      limit: query.limit,
      offset,
      orderBy: [desc(ledger.createdAt)],
      with: {
        campaign: {
          columns: {
            id: true,
            title: true,
            slug: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        payer: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        expenseAccount: {
          columns: {
            id: true,
            code: true,
            name: true,
            type: true,
            normalBalance: true,
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(ledger)
      .where(whereClause),
  ]);

  return paginated(c, data, {
    page: query.page,
    limit: query.limit,
    total: Number(countResult[0]?.count || 0),
  });
});

// GET /admin/ledger/:id - Get single ledger entry with evidences
ledgerAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const entry = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
    with: {
      campaign: true,
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      submitter: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      approver: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      rejecter: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      payer: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      expenseAccount: true,
    },
  });

  if (!entry) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  // Get evidences
  const evidencesList = await db.query.evidences.findMany({
    where: eq(evidences.disbursementId, id),
    orderBy: [desc(evidences.uploadedAt)],
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

  return success(c, {
    ...entry,
    evidences: evidencesList,
  });
});

// POST /admin/ledger - Create new ledger entry (draft)
const createSchema = z.object({
  campaignId: z.string(),
  amount: z.number().min(1),
  expenseAccountId: z.string(),
  recipientName: z.string().min(1),
  recipientBank: z.string().optional(),
  recipientAccount: z.string().optional(),
  recipientPhone: z.string().optional(),
  purpose: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
});

ledgerAdmin.post("/", zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  // Verify campaign exists
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, body.campaignId),
  });

  if (!campaign) {
    return errorResponse(c, "Campaign not found", 404);
  }

  // Verify expense account exists
  const expenseAccount = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.id, body.expenseAccountId),
  });

  if (!expenseAccount) {
    return errorResponse(c, "Expense account not found", 404);
  }

  if (expenseAccount.type !== "expense") {
    return errorResponse(c, "Selected account must be an expense account", 400);
  }

  const referenceId = generateReferenceId("DSB");

  const [entry] = await db
    .insert(ledger)
    .values({
      referenceId,
      campaignId: body.campaignId,
      amount: body.amount,
      expenseAccountId: body.expenseAccountId,
      recipientName: body.recipientName,
      recipientBank: body.recipientBank,
      recipientAccount: body.recipientAccount,
      recipientPhone: body.recipientPhone,
      purpose: body.purpose,
      description: body.description,
      notes: body.notes,
      status: "draft",
      createdBy: user.id,
    })
    .returning();

  return success(c, entry, "Ledger entry created as draft", 201);
});

// PATCH /admin/ledger/:id - Update draft ledger entry
const updateSchema = z.object({
  amount: z.number().min(1).optional(),
  expenseAccountId: z.string().optional(),
  recipientName: z.string().min(1).optional(),
  recipientBank: z.string().optional(),
  recipientAccount: z.string().optional(),
  recipientPhone: z.string().optional(),
  purpose: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

ledgerAdmin.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  // Only allow updating draft ledger
  if (existing.status !== "draft") {
    return errorResponse(c, "Only draft ledger can be updated", 400);
  }

  const [updated] = await db
    .update(ledger)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(ledger.id, id))
    .returning();

  return success(c, updated, "Ledger entry updated successfully");
});

// POST /admin/ledger/:id/submit - Submit for approval
const submitSchema = z.object({}).optional();

ledgerAdmin.post("/:id/submit", requireRole("super_admin", "admin_finance"), zValidator("json", submitSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  if (existing.status !== "draft") {
    return errorResponse(c, "Only draft ledger can be submitted", 400);
  }

  // Evidence is optional for submission (not required)
  // User can submit without evidence

  const [updated] = await db
    .update(ledger)
    .set({
      status: "submitted",
      submittedBy: user.id,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ledger.id, id))
    .returning();

  return success(c, updated, "Ledger entry submitted for approval");
});

// POST /admin/ledger/:id/approve - Approve ledger entry
const approveSchema = z.object({}).optional();

ledgerAdmin.post("/:id/approve", requireRole("super_admin", "admin_finance"), zValidator("json", approveSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  if (existing.status !== "submitted") {
    return errorResponse(c, "Only submitted ledger can be approved", 400);
  }

  const [updated] = await db
    .update(ledger)
    .set({
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ledger.id, id))
    .returning();

  return success(c, updated, "Ledger entry approved");
});

// POST /admin/ledger/:id/reject - Reject ledger entry
const rejectSchema = z.object({
  reason: z.string().min(1),
});

ledgerAdmin.post("/:id/reject", requireRole("super_admin", "admin_finance"), zValidator("json", rejectSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  if (existing.status !== "submitted") {
    return errorResponse(c, "Only submitted ledger can be rejected", 400);
  }

  const [updated] = await db
    .update(ledger)
    .set({
      status: "rejected",
      rejectedBy: user.id,
      rejectedAt: new Date(),
      rejectionReason: body.reason,
      updatedAt: new Date(),
    })
    .where(eq(ledger.id, id))
    .returning();

  return success(c, updated, "Ledger entry rejected");
});

// POST /admin/ledger/:id/pay - Mark as paid and create ledger entry
const paySchema = z.object({
  paymentMethod: z.string().min(1),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  transactionDate: z.string(),
  notes: z.string().optional(),
  proofUrl: z.string().url().optional(),
});

ledgerAdmin.post("/:id/pay", requireRole("super_admin", "admin_finance"), zValidator("json", paySchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  if (existing.status !== "approved") {
    return errorResponse(c, "Only approved ledger can be paid", 400);
  }

  // Store payment details in metadata
  const paymentDetails = {
    bankName: body.bankName,
    accountNumber: body.accountNumber,
    transactionDate: body.transactionDate,
    notes: body.notes,
    proofUrl: body.proofUrl,
  };

  // Use transaction to ensure atomicity
  // If any operation fails, all changes are rolled back
  let updated;
  try {
    updated = await db.transaction(async (tx) => {
      // 1. Update disbursement status to paid
      const [result] = await tx
        .update(ledger)
        .set({
          status: "paid",
          paidBy: user.id,
          paidAt: new Date(body.transactionDate),
          paymentMethod: body.paymentMethod,
          metadata: {
            ...(existing.metadata as any || {}),
            payment: paymentDetails,
          },
          updatedAt: new Date(),
        })
        .where(eq(ledger.id, id))
        .returning();

      // 2. If there's payment proof, attach it as evidence
      if (body.proofUrl) {
        await tx.insert(evidences).values({
          disbursementId: id,
          type: "invoice",
          title: `Payment Proof - ${body.paymentMethod}`,
          description: body.notes || `Payment made via ${body.paymentMethod}`,
          fileUrl: body.proofUrl,
          uploadedBy: user.id,
        });
      }

      // 3. Get campaign and expense account
      const campaign = await tx.query.campaigns.findFirst({
        where: eq(campaigns.id, existing.campaignId),
      });

      const expenseAccount = await tx.query.chartOfAccounts.findFirst({
        where: eq(chartOfAccounts.id, existing.expenseAccountId),
      });

      if (!expenseAccount) {
        throw new Error("Expense account not found");
      }

      return result;
    });

    // 4. Create ledger entry for disbursement (after transaction)
    try {
      await createDisbursementLedgerEntry(db, {
        disbursementId: id,
        amount: existing.amount,
        purpose: existing.purpose,
        recipientName: existing.recipientName,
        campaignTitle: (await db.query.campaigns.findFirst({
          where: eq(campaigns.id, existing.campaignId),
        }))?.title || 'Unknown Campaign',
        paymentMethod: body.paymentMethod,
        createdBy: user.id,
      });
    } catch (ledgerError) {
      console.error("Failed to create disbursement ledger entry:", ledgerError);
      // Ledger entry failed but payment is already saved
      // This is logged for manual reconciliation
    }
  } catch (txError) {
    // Transaction failed - all changes rolled back
    console.error("Disbursement payment transaction failed:", txError);
    return errorResponse(c, "Failed to process disbursement payment", 500);
  }

  return success(c, updated, "Ledger entry marked as paid");
});

// DELETE /admin/ledger/:id - Delete draft ledger entry
ledgerAdmin.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  // Only allow deleting draft ledger
  if (existing.status !== "draft") {
    return errorResponse(c, "Only draft ledger can be deleted", 400);
  }

  // Evidences will be cascade deleted
  await db.delete(ledger).where(eq(ledger.id, id));

  return success(c, null, "Ledger entry deleted successfully");
});

// POST /admin/ledger/:id/evidence - Attach evidence to ledger entry
const attachEvidenceSchema = z.object({
  type: z.enum(["receipt", "invoice", "photo", "document"]),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  amount: z.number().optional(),
});

ledgerAdmin.post("/:id/evidence", zValidator("json", attachEvidenceSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const user = c.get("user");
  const data = c.req.valid("json");

  // Check if ledger entry exists
  const entry = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!entry) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  // Only allow attaching evidence to draft ledger
  if (entry.status !== "draft") {
    return errorResponse(c, "Can only attach evidence to draft ledger", 400);
  }

  // Create evidence
  const evidence = await db
    .insert(evidences)
    .values({
      disbursementId: id,
      type: data.type,
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      amount: data.amount,
      uploadedBy: user.id,
    })
    .returning();

  return success(c, evidence[0], "Evidence attached successfully");
});

// DELETE /admin/ledger/:id/evidence/:evidenceId - Remove evidence
ledgerAdmin.delete("/:id/evidence/:evidenceId", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const evidenceId = c.req.param("evidenceId");

  // Check if ledger entry exists and is draft
  const entry = await db.query.ledger.findFirst({
    where: eq(ledger.id, id),
  });

  if (!entry) {
    return errorResponse(c, "Ledger entry not found", 404);
  }

  if (entry.status !== "draft") {
    return errorResponse(c, "Can only remove evidence from draft ledger", 400);
  }

  // Delete evidence
  await db.delete(evidences).where(eq(evidences.id, evidenceId));

  return success(c, null, "Evidence removed successfully");
});

export default ledgerAdmin;
