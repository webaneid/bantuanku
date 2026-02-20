import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { categories, generateSlug, createId } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const categoriesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const seoFields = {
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(170).optional(),
  focusKeyphrase: z.string().max(100).optional(),
  canonicalUrl: z.string().optional(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImageUrl: z.string().optional(),
  seoScore: z.number().optional(),
};

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  ...seoFields,
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  ...seoFields,
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
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
      focusKeyphrase: body.focusKeyphrase || null,
      canonicalUrl: body.canonicalUrl || null,
      noIndex: body.noIndex ?? false,
      noFollow: body.noFollow ?? false,
      ogTitle: body.ogTitle || null,
      ogDescription: body.ogDescription || null,
      ogImageUrl: body.ogImageUrl || null,
      seoScore: body.seoScore ?? 0,
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
    if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle || null;
    if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription || null;
    if (body.focusKeyphrase !== undefined) updateData.focusKeyphrase = body.focusKeyphrase || null;
    if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl || null;
    if (body.noIndex !== undefined) updateData.noIndex = body.noIndex;
    if (body.noFollow !== undefined) updateData.noFollow = body.noFollow;
    if (body.ogTitle !== undefined) updateData.ogTitle = body.ogTitle || null;
    if (body.ogDescription !== undefined) updateData.ogDescription = body.ogDescription || null;
    if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl || null;
    if (body.seoScore !== undefined) updateData.seoScore = body.seoScore;

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
