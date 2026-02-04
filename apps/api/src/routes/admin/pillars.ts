import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { pillars, generateSlug, createId } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const pillarsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const createPillarSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updatePillarSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET all pillars (admin view)
pillarsAdmin.get("/", async (c) => {
  const db = c.get("db");

  const data = await db.query.pillars.findMany({
    orderBy: (pillars, { asc }) => [asc(pillars.sortOrder)],
  });

  return success(c, data);
});

// POST create pillar
pillarsAdmin.post(
  "/",
  requireRole("super_admin"),
  zValidator("json", createPillarSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");

    const pillarId = createId();
    const slug = generateSlug(body.name);

    await db.insert(pillars).values({
      id: pillarId,
      name: body.name,
      slug,
      description: body.description,
      icon: body.icon,
      color: body.color,
    });

    return success(c, { id: pillarId, slug }, "Pillar created", 201);
  }
);

// GET single pillar
pillarsAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const pillar = await db.query.pillars.findFirst({
    where: eq(pillars.id, id),
  });

  if (!pillar) {
    return error(c, "Pillar not found", 404);
  }

  return success(c, pillar);
});

// PUT update pillar
pillarsAdmin.put(
  "/:id",
  requireRole("super_admin"),
  zValidator("json", updatePillarSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.get("db");

    const pillar = await db.query.pillars.findFirst({
      where: eq(pillars.id, id),
    });

    if (!pillar) {
      return error(c, "Pillar not found", 404);
    }

    // Prevent editing default pillars
    if (pillar.isDefault) {
      return error(c, "Cannot edit default pillar", 403);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
      updateData.slug = generateSlug(body.name);
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;

    await db
      .update(pillars)
      .set(updateData)
      .where(eq(pillars.id, id));

    return success(c, null, "Pillar updated");
  }
);

// DELETE pillar
pillarsAdmin.delete(
  "/:id",
  requireRole("super_admin"),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const pillar = await db.query.pillars.findFirst({
      where: eq(pillars.id, id),
    });

    if (!pillar) {
      return error(c, "Pillar not found", 404);
    }

    // Prevent deleting default pillars
    if (pillar.isDefault) {
      return error(c, "Cannot delete default pillar", 403);
    }

    await db.delete(pillars).where(eq(pillars.id, id));

    return success(c, null, "Pillar deleted");
  }
);

export default pillarsAdmin;
