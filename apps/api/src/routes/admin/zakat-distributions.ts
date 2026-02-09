import { Hono } from "hono";
import { zakatDistributions, zakatTypes, users, ledger, chartOfAccounts, eq, and, sql, desc } from "@bantuanku/db";
import type { Env, Variables } from "../../types";
import { createId } from "@bantuanku/db";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { coordinatorFilter } from "../../middleware/coordinator-filter";
import { paginated } from "../../lib/response";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: semua endpoint zakat distributions butuh auth
app.use("*", requireAuth);

/**
 * GET /admin/zakat/distributions
 * List all zakat distributions with pagination and filters
 */
app.get("/", coordinatorFilter, async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const zakatTypeId = c.req.query("zakatTypeId");
  const recipientCategory = c.req.query("recipientCategory");
  const status = c.req.query("status");
  const mustahiqId = c.req.query("mustahiqId");
  const coordinatorId = c.req.query("coordinatorId"); // Query param for filtering by coordinator
  const coordinatorEmployeeId = c.get("coordinatorEmployeeId"); // From middleware

  const offset = (page - 1) * limit;

  let conditions: any[] = [];

  if (zakatTypeId) {
    conditions.push(eq(zakatDistributions.zakatTypeId, zakatTypeId));
  }

  if (recipientCategory) {
    conditions.push(eq(zakatDistributions.recipientCategory, recipientCategory));
  }

  if (status) {
    conditions.push(eq(zakatDistributions.status, status));
  }

  if (mustahiqId) {
    conditions.push(eq(zakatDistributions.mustahiqId, mustahiqId));
  }

  // Filter by coordinator from query param (for employee detail page)
  if (coordinatorId) {
    conditions.push(eq(zakatDistributions.coordinatorId, coordinatorId));
  }
  // Or filter by coordinator if user is program_coordinator (from middleware)
  else if (coordinatorEmployeeId) {
    conditions.push(eq(zakatDistributions.coordinatorId, coordinatorEmployeeId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        distribution: zakatDistributions,
        zakatType: zakatTypes,
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(zakatDistributions)
      .leftJoin(zakatTypes, eq(zakatDistributions.zakatTypeId, zakatTypes.id))
      .leftJoin(users, eq(zakatDistributions.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(zakatDistributions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(zakatDistributions)
      .where(whereClause),
  ]);

  // Enrich data
  const enrichedData = data.map((row) => ({
    ...row.distribution,
    zakatTypeName: row.zakatType?.name,
    zakatTypeSlug: row.zakatType?.slug,
    creatorName: row.creator?.name,
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

/**
 * GET /admin/zakat/distributions/:id
 * Get single zakat distribution by ID
 */
app.get("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const result = await db
    .select({
      distribution: zakatDistributions,
      zakatType: zakatTypes,
      creator: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(zakatDistributions)
    .leftJoin(zakatTypes, eq(zakatDistributions.zakatTypeId, zakatTypes.id))
    .leftJoin(users, eq(zakatDistributions.createdBy, users.id))
    .where(eq(zakatDistributions.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    return c.json({ error: "Zakat distribution not found" }, 404);
  }

  // Get approver and disburser info if exists
  let approver = null;
  let disburser = null;

  if (result[0].distribution.approvedBy) {
    const approverData = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, result[0].distribution.approvedBy))
      .limit(1);
    approver = approverData[0] || null;
  }

  if (result[0].distribution.disbursedBy) {
    const disburserData = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, result[0].distribution.disbursedBy))
      .limit(1);
    disburser = disburserData[0] || null;
  }

  const enrichedData = {
    ...result[0].distribution,
    zakatType: result[0].zakatType,
    creator: result[0].creator,
    approver,
    disburser,
  };

  return c.json({
    success: true,
    data: enrichedData,
  });
});

/**
 * POST /admin/zakat/distributions
 * Create new zakat distribution
 */
app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const user = c.get("user");

  const {
    zakatTypeId,
    recipientType,
    coordinatorId,
    mustahiqId,
    recipientCategory,
    recipientName,
    recipientContact,
    distributionLocation,
    recipientCount,
    amount,
    purpose,
    description,
    notes,
    status,
  } = body;

  if (!zakatTypeId || !recipientCategory || !recipientName || !amount || !purpose) {
    return c.json(
      {
        error: "zakatTypeId, recipientCategory, recipientName, amount, and purpose are required",
      },
      400
    );
  }

  // Validate recipient category (8 Asnaf)
  const validCategories = [
    "fakir",
    "miskin",
    "amil",
    "mualaf",
    "riqab",
    "gharim",
    "fisabilillah",
    "ibnus_sabil",
  ];

  if (!validCategories.includes(recipientCategory)) {
    return c.json(
      {
        error: `Invalid recipient category. Must be one of: ${validCategories.join(", ")}`,
      },
      400
    );
  }

  // Generate reference ID
  const referenceId = `DIST-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  const newDistribution = await db
    .insert(zakatDistributions)
    .values({
      id: createId(),
      referenceId,
      zakatTypeId,
      recipientType: recipientType || null,
      coordinatorId: coordinatorId || null,
      mustahiqId: mustahiqId || null,
      recipientCategory,
      recipientName,
      recipientContact: recipientContact || null,
      distributionLocation: distributionLocation || null,
      recipientCount: recipientCount || null,
      amount,
      purpose,
      description: description || null,
      notes: notes || null,
      status: status || "draft",
      createdBy: user.id,
    })
    .returning();

  return c.json(
    {
      success: true,
      data: newDistribution[0],
    },
    201
  );
});

/**
 * PUT /admin/zakat/distributions/:id
 * Update zakat distribution (only if status is draft)
 */
app.put("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(zakatDistributions)
    .where(eq(zakatDistributions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat distribution not found" }, 404);
  }

  // Only allow update if status is draft
  if (existing[0].status !== "draft") {
    return c.json(
      { error: "Can only update distribution in draft status" },
      400
    );
  }

  const {
    recipientCategory,
    recipientName,
    recipientContact,
    amount,
    purpose,
    description,
    notes,
  } = body;

  // Validate recipient category if provided
  if (recipientCategory) {
    const validCategories = [
      "fakir",
      "miskin",
      "amil",
      "mualaf",
      "riqab",
      "gharim",
      "fisabilillah",
      "ibnus_sabil",
    ];

    if (!validCategories.includes(recipientCategory)) {
      return c.json(
        {
          error: `Invalid recipient category. Must be one of: ${validCategories.join(", ")}`,
        },
        400
      );
    }
  }

  const updated = await db
    .update(zakatDistributions)
    .set({
      recipientCategory: recipientCategory ?? existing[0].recipientCategory,
      recipientName: recipientName ?? existing[0].recipientName,
      recipientContact: recipientContact !== undefined ? recipientContact : existing[0].recipientContact,
      amount: amount ?? existing[0].amount,
      purpose: purpose ?? existing[0].purpose,
      description: description !== undefined ? description : existing[0].description,
      notes: notes !== undefined ? notes : existing[0].notes,
      updatedAt: new Date(),
    })
    .where(eq(zakatDistributions.id, id))
    .returning();

  return c.json({
    success: true,
    data: updated[0],
  });
});

/**
 * POST /admin/zakat/distributions/:id/approve
 * Approve zakat distribution (authenticated admin only)
 * Body: { sourceBankId, sourceBankName, sourceBankAccount, targetBankName, targetBankAccount, targetBankAccountName, transferProof }
 */
app.post("/:id/approve", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");
  
  const body = await c.req.json();
  const {
    sourceBankId,
    sourceBankName,
    sourceBankAccount,
    targetBankName,
    targetBankAccount,
    targetBankAccountName,
    transferProof,
  } = body;

  const existing = await db
    .select()
    .from(zakatDistributions)
    .where(eq(zakatDistributions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat distribution not found" }, 404);
  }

  if (existing[0].status !== "draft") {
    return c.json(
      { error: "Can only approve distribution in draft status" },
      400
    );
  }

  // Validate required fields
  if (!sourceBankId || !sourceBankName || !sourceBankAccount) {
    return c.json({ error: "Source bank information is required" }, 400);
  }

  if (!targetBankName || !targetBankAccount || !targetBankAccountName) {
    return c.json({ error: "Target bank information is required" }, 400);
  }

  if (!transferProof) {
    return c.json({ error: "Transfer proof is required" }, 400);
  }

  const updated = await db
    .update(zakatDistributions)
    .set({
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      sourceBankId,
      sourceBankName,
      sourceBankAccount,
      targetBankName,
      targetBankAccount,
      targetBankAccountName,
      transferProof,
      updatedAt: new Date(),
    })
    .where(eq(zakatDistributions.id, id))
    .returning();

  return c.json({
    success: true,
    data: updated[0],
    message: "Distribution approved successfully",
  });
});

/**
 * POST /admin/zakat/distributions/:id/disburse
 * Mark distribution as disbursed (authenticated admin only)
 */
app.post("/:id/disburse", async (c) => {
  try {
    const db = c.get("db");
    const { id } = c.req.param();
    const user = c.get("user");

    const existing = await db
      .select()
      .from(zakatDistributions)
      .where(eq(zakatDistributions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: "Zakat distribution not found" }, 404);
    }

    if (existing[0].status !== "approved") {
      return c.json(
        { error: "Can only disburse distribution that is approved" },
        400
      );
    }

    const updated = await db
      .update(zakatDistributions)
      .set({
        status: "disbursed",
        disbursedBy: user.id,
        disbursedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(zakatDistributions.id, id))
      .returning();

    // Auto-create ledger entry when disbursed
    const zakatType = await db
      .select()
      .from(zakatTypes)
      .where(eq(zakatTypes.id, existing[0].zakatTypeId))
      .limit(1);

    if (zakatType.length > 0) {
      // Map zakat type slug to COA code (expense side: 72xx)
      const coaMapping: Record<string, string> = {
        "zakat-maal": "7201",
        "zakat-fitrah": "7202",
        "zakat-profesi": "7203",
        "zakat-pertanian": "7204",
        "zakat-peternakan": "7205",
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
            description: `Penyaluran ${zakatType[0].name} kepada ${existing[0].recipientName} (${existing[0].recipientCategory})`,
            reference: existing[0].referenceId,
            referenceType: "zakat_distribution",
            referenceId: existing[0].id,
            coaId: coaAccount[0].id,
            debit: existing[0].amount,
            credit: 0,
            status: "paid",
          });
        }
      }
    }

    return c.json({
      success: true,
      data: updated[0],
      message: "Distribution marked as disbursed successfully",
    });
  } catch (error) {
    console.error("Error in disburse endpoint:", error);
    return c.json({ 
      error: "Failed to disburse distribution", 
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * POST /admin/zakat/distributions/:id/add-report
 * Add activity report for coordinator distribution (authenticated admin only)
 * Body: { reportDate, reportDescription, reportPhotos[] }
 */
app.post("/:id/add-report", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");
  
  const body = await c.req.json();
  const {
    reportDate,
    reportDescription,
    reportPhotos,
  } = body;

  const existing = await db
    .select()
    .from(zakatDistributions)
    .where(eq(zakatDistributions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat distribution not found" }, 404);
  }

  if (existing[0].status !== "disbursed") {
    return c.json(
      { error: "Can only add report for disbursed distribution" },
      400
    );
  }

  if (existing[0].recipientType !== "coordinator") {
    return c.json(
      { error: "Report can only be added for coordinator type distribution" },
      400
    );
  }

  if (existing[0].reportAddedAt) {
    return c.json(
      { error: "Report has already been added" },
      400
    );
  }

  // Validate required fields
  if (!reportDate) {
    return c.json({ error: "Report date is required" }, 400);
  }

  if (!reportDescription) {
    return c.json({ error: "Report description is required" }, 400);
  }

  if (!reportPhotos || reportPhotos.length === 0) {
    return c.json({ error: "At least one photo is required" }, 400);
  }

  const updated = await db
    .update(zakatDistributions)
    .set({
      reportDate: new Date(reportDate),
      reportDescription,
      reportPhotos: JSON.stringify(reportPhotos),
      reportAddedBy: user.id,
      reportAddedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(zakatDistributions.id, id))
    .returning();

  return c.json({
    success: true,
    data: updated[0],
    message: "Activity report added successfully",
  });
});

/**
 * DELETE /admin/zakat/distributions/:id
 * Delete zakat distribution (authenticated admin only, only if draft)
 */
app.delete("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const existing = await db
    .select()
    .from(zakatDistributions)
    .where(eq(zakatDistributions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat distribution not found" }, 404);
  }

  // Only allow delete if status is draft
  if (existing[0].status !== "draft") {
    return c.json(
      { error: "Can only delete distribution in draft status" },
      400
    );
  }

  await db.delete(zakatDistributions).where(eq(zakatDistributions.id, id));

  return c.json({
    success: true,
    message: "Zakat distribution deleted successfully",
  });
});

export default app;
