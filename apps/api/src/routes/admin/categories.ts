import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { categories, generateSlug, createId } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const categoriesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET all categories (admin view)
categoriesAdmin.get("/", async (c) => {
  const db = c.get("db");

  const data = await db.query.categories.findMany({
    orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
  });

  return success(c, data);
});

// POST create category
categoriesAdmin.post(
  "/",
  requireRole("super_admin"),
  zValidator("json", createCategorySchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");

    const categoryId = createId();
    const slug = generateSlug(body.name);

    await db.insert(categories).values({
      id: categoryId,
      name: body.name,
      slug,
      description: body.description,
      icon: body.icon,
      color: body.color,
    });

    return success(c, { id: categoryId, slug }, "Category created", 201);
  }
);

// GET single category
categoriesAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });

  if (!category) {
    return error(c, "Category not found", 404);
  }

  return success(c, category);
});

// PUT update category
categoriesAdmin.put(
  "/:id",
  requireRole("super_admin"),
  zValidator("json", updateCategorySchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.get("db");

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      return error(c, "Category not found", 404);
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
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id));

    return success(c, null, "Category updated");
  }
);

// DELETE category
categoriesAdmin.delete(
  "/:id",
  requireRole("super_admin"),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      return error(c, "Category not found", 404);
    }

    await db.delete(categories).where(eq(categories.id, id));

    return success(c, null, "Category deleted");
  }
);

export default categoriesAdmin;
