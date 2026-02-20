import { Hono } from "hono";
import { eq, desc, and, sql, isNull, isNotNull } from "drizzle-orm";
import { zakatPeriods, zakatTypes, mitra, createId } from "@bantuanku/db";
import type { Env, Variables } from "../../types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { paginated, success, error } from "../../lib/response";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", requireAuth);

// GET /admin/zakat/periods - List all zakat periods
app.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const zakatTypeId = c.req.query("zakatTypeId");
  const year = c.req.query("year");
  const status = c.req.query("status");
  const mitraScope = c.req.query("mitraScope"); // "internal" | "mitra"
  const mitraIdFilter = c.req.query("mitraId"); // specific mitra ID

  const offset = (page - 1) * limit;
  let conditions: any[] = [];

  if (zakatTypeId) conditions.push(eq(zakatPeriods.zakatTypeId, zakatTypeId));
  if (year) conditions.push(eq(zakatPeriods.year, parseInt(year)));
  if (status) conditions.push(eq(zakatPeriods.status, status));

  // Scope filter: internal (mitraId IS NULL) or mitra (mitraId IS NOT NULL)
  if (mitraScope === "internal") {
    conditions.push(isNull(zakatPeriods.mitraId));
  } else if (mitraScope === "mitra") {
    conditions.push(isNotNull(zakatPeriods.mitraId));
  }

  // Specific mitra filter
  if (mitraIdFilter) {
    conditions.push(eq(zakatPeriods.mitraId, mitraIdFilter));
  }

  // Filter by mitra if user has mitra role only
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra && user) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user.id),
    });
    if (mitraRecord) {
      conditions.push(eq(zakatPeriods.mitraId, mitraRecord.id));
    } else {
      conditions.push(eq(zakatPeriods.mitraId, "no-mitra-record"));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        period: zakatPeriods,
        zakatType: zakatTypes,
        mitra: mitra,
      })
      .from(zakatPeriods)
      .leftJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
      .leftJoin(mitra, eq(zakatPeriods.mitraId, mitra.id))
      .where(whereClause)
      .orderBy(desc(zakatPeriods.year), desc(zakatPeriods.startDate))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(zakatPeriods)
      .where(whereClause),
  ]);

  const enrichedData = data.map((row) => ({
    ...row.period,
    zakatTypeName: row.zakatType?.name,
    zakatTypeSlug: row.zakatType?.slug,
    mitraName: row.mitra?.name || null,
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

// GET /admin/zakat/periods/:id - Get single period
app.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const result = await db
    .select({
      period: zakatPeriods,
      zakatType: zakatTypes,
    })
    .from(zakatPeriods)
    .leftJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .where(eq(zakatPeriods.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    return error(c, "Zakat period not found", 404);
  }

  const enrichedData = {
    ...result[0].period,
    zakatType: result[0].zakatType,
  };

  return success(c, enrichedData);
});

// POST /admin/zakat/periods - Create new period
app.post("/", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await c.req.json();

  const {
    zakatTypeId,
    name,
    year,
    hijriYear,
    startDate,
    endDate,
    executionDate,
    status,
    description,
  } = body;

  if (!zakatTypeId || !name || !year || !startDate || !endDate) {
    return error(c, "zakatTypeId, name, year, startDate, and endDate are required", 400);
  }

  // If mitra, auto-assign mitraId and force draft status
  let finalMitraId: string | null = null;
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord) {
      return error(c, "Mitra record not found for this user", 403);
    }
    finalMitraId = mitraRecord.id;
  }

  const newPeriod = await db
    .insert(zakatPeriods)
    .values({
      id: createId(),
      zakatTypeId,
      name,
      year: parseInt(year),
      hijriYear: hijriYear || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      executionDate: executionDate ? new Date(executionDate) : null,
      status: isMitra ? "draft" : (status || "draft"),
      description: description || null,
      mitraId: finalMitraId,
    })
    .returning();

  return success(c, newPeriod[0], undefined, 201);
});

// PATCH /admin/zakat/periods/:id - Update period
app.patch("/:id", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(zakatPeriods)
    .where(eq(zakatPeriods.id, id))
    .limit(1);

  if (existing.length === 0) {
    return error(c, "Zakat period not found", 404);
  }

  // Mitra can only edit their own periods
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || existing[0].mitraId !== mitraRecord.id) {
      return error(c, "Forbidden", 403);
    }
  }

  const updated = await db
    .update(zakatPeriods)
    .set({
      name: body.name ?? existing[0].name,
      year: body.year ? parseInt(body.year) : existing[0].year,
      hijriYear: body.hijriYear !== undefined ? body.hijriYear : existing[0].hijriYear,
      startDate: body.startDate ? new Date(body.startDate) : existing[0].startDate,
      endDate: body.endDate ? new Date(body.endDate) : existing[0].endDate,
      executionDate: body.executionDate !== undefined ? (body.executionDate ? new Date(body.executionDate) : null) : existing[0].executionDate,
      status: isMitra ? existing[0].status : (body.status ?? existing[0].status),
      description: body.description !== undefined ? body.description : existing[0].description,
      updatedAt: new Date(),
    })
    .where(eq(zakatPeriods.id, id))
    .returning();

  return success(c, updated[0]);
});

// GET /admin/zakat/periods/:id/detail - Get period detail with donations
app.get("/:id/detail", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  // Get period
  const periodResult = await db
    .select({
      period: zakatPeriods,
      zakatType: zakatTypes,
    })
    .from(zakatPeriods)
    .leftJoin(zakatTypes, eq(zakatPeriods.zakatTypeId, zakatTypes.id))
    .where(eq(zakatPeriods.id, id))
    .limit(1);

  if (!periodResult || periodResult.length === 0) {
    return error(c, "Zakat period not found", 404);
  }

  const period = periodResult[0].period;
  const zakatType = periodResult[0].zakatType;

  // Get transactions for this period from universal transactions table
  const { transactions } = await import("@bantuanku/db");

  const rawTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.productType, "zakat"),
        eq(transactions.productId, id)
      )
    )
    .orderBy(transactions.createdAt);

  // Map transactions to muzaki format
  const muzaki = rawTransactions.map((t: any) => {
    const typeData = t.typeSpecificData || {};

    return {
      transaction_id: t.id,
      transaction_number: t.transactionNumber,
      muzaki_name: t.donorName,
      muzaki_email: t.donorEmail || "",
      muzaki_phone: t.donorPhone || "",
      on_behalf_of:
        (typeof typeData.onBehalfOf === "string" && typeData.onBehalfOf.trim()) ||
        (typeof typeData.on_behalf_of === "string" && typeData.on_behalf_of.trim()) ||
        t.donorName,
      zakat_type_name: typeData.zakat_type_name || zakatType?.name || "",
      amount: t.totalAmount,
      payment_status: t.paymentStatus,
      is_anonymous: t.isAnonymous,
      message: t.message,
      created_at: t.createdAt,
      paid_at: t.paidAt,
    };
  });

  // Calculate stats
  const totalMuzaki = muzaki.length;
  const totalAmount = muzaki.reduce((sum: number, m: any) => sum + Number(m.amount), 0);
  const paidDonations = muzaki.filter((m: any) => m.payment_status === "paid");
  const paidMuzaki = paidDonations.length;
  const paidAmount = paidDonations.reduce((sum: number, m: any) => sum + Number(m.amount), 0);
  const pendingMuzaki = muzaki.filter((m: any) => m.payment_status === "pending" || m.payment_status === "partial").length;

  return c.json({
    period: {
      ...period,
      zakatTypeName: zakatType?.name,
    },
    muzaki: muzaki,
    stats: {
      totalMuzaki,
      totalAmount,
      paidMuzaki,
      paidAmount,
      pendingMuzaki,
    },
  });
});

// DELETE /admin/zakat/periods/:id - Delete period
app.delete("/:id", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await db
    .select()
    .from(zakatPeriods)
    .where(eq(zakatPeriods.id, id))
    .limit(1);

  if (existing.length === 0) {
    return error(c, "Zakat period not found", 404);
  }

  // Mitra can only delete their own periods
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || existing[0].mitraId !== mitraRecord.id) {
      return error(c, "Forbidden", 403);
    }
  }

  await db.delete(zakatPeriods).where(eq(zakatPeriods.id, id));

  return success(c, { message: "Zakat period deleted successfully" });
});

export default app;
