import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { pages } from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const pagesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeOptionalText(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasMeaningfulContent(html: string) {
  const textOnly = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return textOnly.length > 0;
}

const pagePayloadSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi"),
  slug: z.string().trim().min(1, "Slug wajib diisi").regex(slugRegex, "Format slug tidak valid"),
  featureImageUrl: z.string().trim().optional().nullable(),
  excerpt: z.string().trim().optional().nullable(),
  content: z.string().min(1, "Konten wajib diisi"),
  isPublished: z.boolean().optional(),
  // SEO fields
  metaTitle: z.string().trim().max(70).optional().nullable(),
  metaDescription: z.string().trim().max(170).optional().nullable(),
  focusKeyphrase: z.string().trim().max(100).optional().nullable(),
  canonicalUrl: z.string().trim().optional().nullable(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  ogTitle: z.string().trim().max(70).optional().nullable(),
  ogDescription: z.string().trim().max(200).optional().nullable(),
  ogImageUrl: z.string().trim().optional().nullable(),
  seoScore: z.number().int().min(0).max(100).optional(),
});

pagesAdmin.use("*", requireRole("super_admin", "admin_campaign"));

pagesAdmin.get("/", async (c) => {
  const db = c.get("db");
  const search = (c.req.query("search") || "").trim();
  const status = (c.req.query("status") || "all").toLowerCase();
  const page = Math.max(1, Number.parseInt(c.req.query("page") || "1", 10) || 1);
  const rawLimit = Number.parseInt(c.req.query("limit") || "20", 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  if (search) {
    conditions.push(or(ilike(pages.title, `%${search}%`), ilike(pages.slug, `%${search}%`)));
  }

  if (status === "published") {
    conditions.push(eq(pages.isPublished, true));
  } else if (status === "draft") {
    conditions.push(eq(pages.isPublished, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db.query.pages.findMany({
      where: whereClause,
      orderBy: [desc(pages.updatedAt)],
      limit,
      offset,
      columns: {
        id: true,
        title: true,
        slug: true,
        featureImageUrl: true,
        excerpt: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(pages).where(whereClause),
  ]);

  return paginated(c, rows, {
    page,
    limit,
    total: Number(countRows[0]?.count || 0),
  });
});

pagesAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const record = await db.query.pages.findFirst({
    where: eq(pages.id, id),
  });

  if (!record) {
    return error(c, "Page not found", 404);
  }

  return success(c, record);
});

pagesAdmin.post("/", zValidator("json", pagePayloadSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  const user = c.get("user");

  if (!hasMeaningfulContent(body.content)) {
    return error(c, "Konten wajib diisi", 400);
  }

  const existingSlug = await db.query.pages.findFirst({
    where: eq(pages.slug, body.slug),
    columns: { id: true },
  });

  if (existingSlug) {
    return error(c, "Slug sudah digunakan", 409);
  }

  const now = new Date();
  const isPublished = body.isPublished === true;

  const [created] = await db
    .insert(pages)
    .values({
      title: body.title.trim(),
      slug: body.slug.trim(),
      featureImageUrl: normalizeOptionalText(body.featureImageUrl),
      excerpt: normalizeOptionalText(body.excerpt),
      content: body.content,
      isPublished,
      publishedAt: isPublished ? now : null,
      createdBy: user?.id || null,
      updatedAt: now,
      // SEO fields
      metaTitle: normalizeOptionalText(body.metaTitle),
      metaDescription: normalizeOptionalText(body.metaDescription),
      focusKeyphrase: normalizeOptionalText(body.focusKeyphrase),
      canonicalUrl: normalizeOptionalText(body.canonicalUrl),
      noIndex: body.noIndex ?? false,
      noFollow: body.noFollow ?? false,
      ogTitle: normalizeOptionalText(body.ogTitle),
      ogDescription: normalizeOptionalText(body.ogDescription),
      ogImageUrl: normalizeOptionalText(body.ogImageUrl),
      seoScore: body.seoScore ?? 0,
    })
    .returning({
      id: pages.id,
      slug: pages.slug,
    });

  return success(c, created, "Page created", 201);
});

pagesAdmin.put("/:id", zValidator("json", pagePayloadSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  if (!hasMeaningfulContent(body.content)) {
    return error(c, "Konten wajib diisi", 400);
  }

  const existing = await db.query.pages.findFirst({
    where: eq(pages.id, id),
  });

  if (!existing) {
    return error(c, "Page not found", 404);
  }

  const slugUsed = await db.query.pages.findFirst({
    where: and(eq(pages.slug, body.slug), ne(pages.id, id)),
    columns: { id: true },
  });

  if (slugUsed) {
    return error(c, "Slug sudah digunakan", 409);
  }

  const now = new Date();
  let nextPublishedAt = existing.publishedAt;

  if (body.isPublished === true) {
    nextPublishedAt = existing.publishedAt || now;
  } else if (body.isPublished === false) {
    nextPublishedAt = null;
  }

  await db
    .update(pages)
    .set({
      title: body.title.trim(),
      slug: body.slug.trim(),
      featureImageUrl: normalizeOptionalText(body.featureImageUrl),
      excerpt: normalizeOptionalText(body.excerpt),
      content: body.content,
      isPublished: body.isPublished ?? existing.isPublished,
      publishedAt: nextPublishedAt,
      updatedAt: now,
      // SEO fields
      metaTitle: normalizeOptionalText(body.metaTitle),
      metaDescription: normalizeOptionalText(body.metaDescription),
      focusKeyphrase: normalizeOptionalText(body.focusKeyphrase),
      canonicalUrl: normalizeOptionalText(body.canonicalUrl),
      noIndex: body.noIndex ?? existing.noIndex ?? false,
      noFollow: body.noFollow ?? existing.noFollow ?? false,
      ogTitle: normalizeOptionalText(body.ogTitle),
      ogDescription: normalizeOptionalText(body.ogDescription),
      ogImageUrl: normalizeOptionalText(body.ogImageUrl),
      seoScore: body.seoScore ?? existing.seoScore ?? 0,
    })
    .where(eq(pages.id, id));

  return success(c, null, "Page updated");
});

pagesAdmin.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.pages.findFirst({
    where: eq(pages.id, id),
    columns: { id: true },
  });

  if (!existing) {
    return error(c, "Page not found", 404);
  }

  await db.delete(pages).where(eq(pages.id, id));
  return success(c, null, "Page deleted");
});

export default pagesAdmin;
