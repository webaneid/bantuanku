import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, asc, sql } from "drizzle-orm";
import { incomeRanges } from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const incomeRangesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  label: z.string().trim().min(1, "Label wajib diisi"),
  description: z.string().trim().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const updateSchema = z.object({
  label: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET all
incomeRangesAdmin.get("/", async (c) => {
  const db = c.get("db");

  const data = await db
    .select()
    .from(incomeRanges)
    .orderBy(asc(incomeRanges.displayOrder));

  return success(c, data);
});

// POST create
incomeRangesAdmin.post(
  "/",
  requireRole("super_admin"),
  zValidator("json", createSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");

    const [created] = await db
      .insert(incomeRanges)
      .values(body)
      .returning();

    return success(c, created, "Penghasilan berhasil ditambahkan", 201);
  }
);

// GET single
incomeRangesAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));

  const data = await db.query.incomeRanges.findFirst({
    where: eq(incomeRanges.id, id),
  });

  if (!data) return error(c, "Data tidak ditemukan", 404);
  return success(c, data);
});

// PUT update
incomeRangesAdmin.put(
  "/:id",
  requireRole("super_admin"),
  zValidator("json", updateSchema),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = c.req.valid("json");
    const db = c.get("db");

    const existing = await db.query.incomeRanges.findFirst({
      where: eq(incomeRanges.id, id),
    });

    if (!existing) return error(c, "Data tidak ditemukan", 404);

    const [updated] = await db
      .update(incomeRanges)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(incomeRanges.id, id))
      .returning();

    return success(c, updated, "Penghasilan berhasil diperbarui");
  }
);

// DELETE
incomeRangesAdmin.delete(
  "/:id",
  requireRole("super_admin"),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const db = c.get("db");

    const existing = await db.query.incomeRanges.findFirst({
      where: eq(incomeRanges.id, id),
    });

    if (!existing) return error(c, "Data tidak ditemukan", 404);

    await db.delete(incomeRanges).where(eq(incomeRanges.id, id));

    return success(c, null, "Penghasilan berhasil dihapus");
  }
);

export default incomeRangesAdmin;
