import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql, like, or, lte, gte } from "drizzle-orm";
import {
  qurbanDiscounts,
  qurbanDiscountUsages,
  qurbanOrders,
  qurbanSavings,
  createId,
} from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const discountCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["automatic", "voucher"]),
  discountType: z.enum(["percentage", "nominal"]),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().nullable().optional(),
  scopeType: z.enum(["all", "package", "package_period", "animal_type"]).default("all"),
  scopeId: z.string().nullable().optional(),
  code: z.string().toUpperCase().nullable().optional(),
  startDate: z.string(), // ISO string from frontend
  endDate: z.string(),
  maxUsage: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  description: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.type === "voucher" && !data.code) {
    ctx.addIssue({ code: "custom", message: "Kode voucher wajib diisi untuk tipe voucher", path: ["code"] });
  }
  if (data.type === "automatic" && data.code) {
    ctx.addIssue({ code: "custom", message: "Discount otomatis tidak boleh punya kode", path: ["code"] });
  }
  if (data.discountType === "percentage" && (data.discountValue < 1 || data.discountValue > 100)) {
    ctx.addIssue({ code: "custom", message: "Persentase harus antara 1-100", path: ["discountValue"] });
  }
  if (data.scopeType !== "all" && !data.scopeId) {
    ctx.addIssue({ code: "custom", message: "scopeId wajib diisi jika scopeType bukan 'all'", path: ["scopeId"] });
  }
});

// GET / — list discounts with filters
app.get("/", async (c) => {
  const db = c.get("db");
  const { type, status, scopeType, search, page = "1", limit = "20" } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const now = new Date();
  const conditions: any[] = [];

  if (type) conditions.push(eq(qurbanDiscounts.type, type));
  if (scopeType) conditions.push(eq(qurbanDiscounts.scopeType, scopeType));
  if (search) {
    conditions.push(
      or(
        like(qurbanDiscounts.name, `%${search}%`),
        like(qurbanDiscounts.code, `%${search}%`)
      )
    );
  }
  if (status === "active") {
    conditions.push(
      and(
        eq(qurbanDiscounts.isActive, true),
        lte(qurbanDiscounts.startDate, now),
        gte(qurbanDiscounts.endDate, now)
      )
    );
  } else if (status === "expired") {
    conditions.push(lte(qurbanDiscounts.endDate, now));
  } else if (status === "inactive") {
    conditions.push(eq(qurbanDiscounts.isActive, false));
  } else if (status === "exhausted") {
    conditions.push(sql`${qurbanDiscounts.maxUsage} IS NOT NULL AND ${qurbanDiscounts.usageCount} >= ${qurbanDiscounts.maxUsage}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [total, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(qurbanDiscounts).where(where),
    db.select().from(qurbanDiscounts).where(where).orderBy(desc(qurbanDiscounts.createdAt)).limit(limitNum).offset(offset),
  ]);

  return paginated(c, rows, { total: Number(total[0].count), page: pageNum, limit: limitNum });
});

// POST / — create discount
app.post(
  "/",
  requireRole("super_admin", "admin_campaign"),
  zValidator("json", discountCreateSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const data = c.req.valid("json");

    // Cek kode unik jika voucher
    if (data.code) {
      const existing = await db
        .select({ id: qurbanDiscounts.id })
        .from(qurbanDiscounts)
        .where(sql`lower(${qurbanDiscounts.code}) = lower(${data.code})`)
        .limit(1);
      if (existing.length > 0) return error(c, "Kode voucher sudah digunakan", 400);
    }

    const newDiscount = await db
      .insert(qurbanDiscounts)
      .values({
        id: createId(),
        name: data.name,
        type: data.type,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscount: data.maxDiscount ?? null,
        scopeType: data.scopeType,
        scopeId: data.scopeId ?? null,
        code: data.code ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        maxUsage: data.maxUsage ?? null,
        isActive: data.isActive,
        description: data.description ?? null,
        createdBy: user!.id,
      })
      .returning();

    return success(c, newDiscount[0], "Discount berhasil dibuat");
  }
);

// GET /:id — detail
app.get("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const [discount] = await db.select().from(qurbanDiscounts).where(eq(qurbanDiscounts.id, id)).limit(1);
  if (!discount) return error(c, "Discount tidak ditemukan", 404);

  return success(c, discount);
});

// PUT /:id — edit
app.put(
  "/:id",
  requireRole("super_admin", "admin_campaign"),
  async (c) => {
    const db = c.get("db");
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db.select().from(qurbanDiscounts).where(eq(qurbanDiscounts.id, id)).limit(1);
    if (!existing) return error(c, "Discount tidak ditemukan", 404);

    // Blokir edit field krusial jika sudah ada usage
    if (existing.usageCount > 0) {
      const immutableFields = ["type", "discountType", "discountValue", "code"];
      for (const field of immutableFields) {
        if (field in body && (body as any)[field] !== (existing as any)[field]) {
          return error(c, `Field '${field}' tidak bisa diubah setelah ada penggunaan`, 400);
        }
      }
    }

    // Cek kode unik jika diubah
    if (body.code && body.code !== existing.code) {
      const dup = await db
        .select({ id: qurbanDiscounts.id })
        .from(qurbanDiscounts)
        .where(and(sql`lower(${qurbanDiscounts.code}) = lower(${body.code})`, sql`${qurbanDiscounts.id} <> ${id}`))
        .limit(1);
      if (dup.length > 0) return error(c, "Kode voucher sudah digunakan discount lain", 400);
    }

    const updateData: Partial<typeof qurbanDiscounts.$inferInsert> = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      "name", "isActive", "description", "maxUsage", "maxDiscount",
      "startDate", "endDate", "scopeType", "scopeId",
    ];
    for (const field of allowedFields) {
      if (field in body) {
        if (field === "startDate" || field === "endDate") {
          (updateData as any)[field] = new Date(body[field]);
        } else {
          (updateData as any)[field] = body[field];
        }
      }
    }

    // Allow edit krusial jika belum ada usage
    if (existing.usageCount === 0) {
      const krusialFields = ["type", "discountType", "discountValue", "code"];
      for (const field of krusialFields) {
        if (field in body) (updateData as any)[field] = body[field];
      }
    }

    const [updated] = await db.update(qurbanDiscounts).set(updateData).where(eq(qurbanDiscounts.id, id)).returning();
    return success(c, updated, "Discount berhasil diupdate");
  }
);

// POST /:id/deactivate — nonaktifkan tanpa hapus
app.post(
  "/:id/deactivate",
  requireRole("super_admin", "admin_campaign"),
  async (c) => {
    const db = c.get("db");
    const { id } = c.req.param();

    const [existing] = await db.select({ id: qurbanDiscounts.id }).from(qurbanDiscounts).where(eq(qurbanDiscounts.id, id)).limit(1);
    if (!existing) return error(c, "Discount tidak ditemukan", 404);

    await db.update(qurbanDiscounts).set({ isActive: false, updatedAt: new Date() }).where(eq(qurbanDiscounts.id, id));
    return success(c, { id }, "Discount berhasil dinonaktifkan");
  }
);

// DELETE /:id — hapus (blokir jika ada usage)
app.delete(
  "/:id",
  requireRole("super_admin"),
  async (c) => {
    const db = c.get("db");
    const { id } = c.req.param();

    const [existing] = await db.select().from(qurbanDiscounts).where(eq(qurbanDiscounts.id, id)).limit(1);
    if (!existing) return error(c, "Discount tidak ditemukan", 404);

    if (existing.usageCount > 0) {
      return error(c, `Discount ini sudah digunakan ${existing.usageCount} kali dan tidak bisa dihapus. Gunakan deactivate untuk menonaktifkan.`, 400);
    }

    await db.delete(qurbanDiscounts).where(eq(qurbanDiscounts.id, id));
    return success(c, { id }, "Discount berhasil dihapus");
  }
);

// GET /:id/usages — riwayat penggunaan
app.get("/:id/usages", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const { page = "1", limit = "20" } = c.req.query();

  const [existing] = await db.select({ id: qurbanDiscounts.id }).from(qurbanDiscounts).where(eq(qurbanDiscounts.id, id)).limit(1);
  if (!existing) return error(c, "Discount tidak ditemukan", 404);

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const [total, usages] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(qurbanDiscountUsages).where(eq(qurbanDiscountUsages.discountId, id)),
    db
      .select({
        id: qurbanDiscountUsages.id,
        orderId: qurbanDiscountUsages.orderId,
        savingsId: qurbanDiscountUsages.savingsId,
        userId: qurbanDiscountUsages.userId,
        donorPhone: qurbanDiscountUsages.donorPhone,
        discountAmount: qurbanDiscountUsages.discountAmount,
        appliedAt: qurbanDiscountUsages.appliedAt,
        orderNumber: qurbanOrders.orderNumber,
        donorName: qurbanOrders.donorName,
        savingsNumber: qurbanSavings.savingsNumber,
      })
      .from(qurbanDiscountUsages)
      .leftJoin(qurbanOrders, eq(qurbanDiscountUsages.orderId, qurbanOrders.id))
      .leftJoin(qurbanSavings, eq(qurbanDiscountUsages.savingsId, qurbanSavings.id))
      .where(eq(qurbanDiscountUsages.discountId, id))
      .orderBy(desc(qurbanDiscountUsages.appliedAt))
      .limit(limitNum)
      .offset(offset),
  ]);

  return paginated(c, usages, { total: Number(total[0].count), page: pageNum, limit: limitNum });
});

export default app;
