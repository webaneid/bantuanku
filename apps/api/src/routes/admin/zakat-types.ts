import { Hono } from "hono";
import { zakatTypes, mitra, eq, and, createId, count, sql } from "@bantuanku/db";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { paginated } from "../../lib/response";
import type { Env, Variables } from "../../types";
import { extractPath } from "./media";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: semua endpoint zakat types butuh auth
app.use("*", requireAuth);

/**
 * GET /admin/zakat/types
 * List all zakat types with pagination
 */
app.get("/", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const isActive = c.req.query("isActive");

  const offset = (page - 1) * limit;
  const user = c.get("user");
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");

  let conditions: any[] = [];

  if (isActive !== undefined) {
    conditions.push(eq(zakatTypes.isActive, isActive === "true"));
  }

  // Mitra hanya bisa melihat jenis zakat yang dia buat sendiri
  if (isMitra) {
    conditions.push(eq(zakatTypes.createdBy, user!.id));
  }

  const whereClause = conditions.length > 1
    ? and(...conditions)
    : conditions.length === 1
      ? conditions[0]
      : undefined;

  const db = c.get("db");

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(zakatTypes)
      .where(whereClause)
      .orderBy(zakatTypes.displayOrder)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(zakatTypes)
      .where(whereClause),
  ]);

  // Construct full URLs for images
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  const constructUrl = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return urlOrPath;
    // If already full URL (GCS CDN), return as-is
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    // If relative path, prepend API URL
    return `${apiUrl}${urlOrPath}`;
  };

  const enrichedData = data.map(type => ({
    ...type,
    imageUrl: constructUrl(type.imageUrl),
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

/**
 * GET /admin/zakat/types/:id
 * Get single zakat type by ID
 */
app.get("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");

  const zakatType = await db
    .select()
    .from(zakatTypes)
    .where(eq(zakatTypes.id, id))
    .limit(1);

  if (!zakatType || zakatType.length === 0) {
    return c.json({ error: "Zakat type not found" }, 404);
  }

  // Mitra hanya bisa melihat jenis zakat miliknya sendiri
  if (isMitra && zakatType[0].createdBy !== user!.id) {
    return c.json({ error: "Anda tidak memiliki akses ke jenis zakat ini." }, 403);
  }

  // Construct full URLs for images
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  const constructUrl = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return urlOrPath;
    // If already full URL (GCS CDN), return as-is
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    // If relative path, prepend API URL
    return `${apiUrl}${urlOrPath}`;
  };

  const enrichedType = {
    ...zakatType[0],
    imageUrl: constructUrl(zakatType[0].imageUrl),
  };

  return c.json({
    success: true,
    data: enrichedType,
  });
});

/**
 * POST /admin/zakat/types
 * Create new zakat type (admin only)
 */
app.post("/", requireRoles("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const user = c.get("user");

  // Mitra must be verified
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || mitraRecord.status !== "verified") {
      return c.json({ error: "Mitra Anda belum diverifikasi. Hanya mitra yang sudah diverifikasi yang dapat membuat paket zakat." }, 403);
    }
  }

  const { name, slug, description, imageUrl, icon, hasCalculator, isActive, displayOrder, calculatorType, fitrahAmount,
    metaTitle, metaDescription, focusKeyphrase, canonicalUrl, noIndex, noFollow, ogTitle, ogDescription, ogImageUrl, seoScore } = body;

  if (!name || !slug) {
    return c.json({ error: "Name and slug are required" }, 400);
  }

  // Check if slug already exists
  const existing = await db
    .select()
    .from(zakatTypes)
    .where(eq(zakatTypes.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Slug already exists" }, 400);
  }

  // Store GCS URLs as-is, extract path for local uploads
  const cleanImageUrl = imageUrl
    ? (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
      ? imageUrl // Keep GCS CDN URL as-is
      : extractPath(imageUrl) // Extract path for local
    : null;

  const newZakatType = await db
    .insert(zakatTypes)
    .values({
      id: createId(),
      name,
      slug,
      description: description || null,
      imageUrl: cleanImageUrl,
      icon: icon || null,
      hasCalculator: hasCalculator ?? true,
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
      calculatorType: calculatorType || null,
      fitrahAmount: fitrahAmount != null && fitrahAmount !== "" ? String(fitrahAmount) : null,
      // SEO fields
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      focusKeyphrase: focusKeyphrase || null,
      canonicalUrl: canonicalUrl || null,
      noIndex: noIndex ?? false,
      noFollow: noFollow ?? false,
      ogTitle: ogTitle || null,
      ogDescription: ogDescription || null,
      ogImageUrl: ogImageUrl || null,
      seoScore: seoScore ?? 0,
      createdBy: user!.id,
    })
    .returning();

  return c.json({
    success: true,
    data: newZakatType[0],
  }, 201);
});

/**
 * PUT /admin/zakat/types/:id
 * Update zakat type (admin only)
 */
app.put("/:id", requireRoles("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();
  const user = c.get("user");

  // Mitra must be verified
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || mitraRecord.status !== "verified") {
      return c.json({ error: "Mitra Anda belum diverifikasi." }, 403);
    }
  }

  const { name, slug, description, imageUrl, icon, hasCalculator, isActive, displayOrder, calculatorType, fitrahAmount,
    metaTitle, metaDescription, focusKeyphrase, canonicalUrl, noIndex, noFollow, ogTitle, ogDescription, ogImageUrl, seoScore } = body;

  // Check if exists
  const existing = await db
    .select()
    .from(zakatTypes)
    .where(eq(zakatTypes.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat type not found" }, 404);
  }

  // Mitra hanya bisa edit jenis zakat miliknya sendiri
  if (isMitra && existing[0].createdBy !== user!.id) {
    return c.json({ error: "Anda tidak memiliki akses untuk mengedit jenis zakat ini." }, 403);
  }

  // If slug is being changed, check if new slug already exists
  if (slug && slug !== existing[0].slug) {
    const slugExists = await db
      .select()
      .from(zakatTypes)
      .where(eq(zakatTypes.slug, slug))
      .limit(1);

    if (slugExists.length > 0) {
      return c.json({ error: "Slug already exists" }, 400);
    }
  }

  // Store GCS URLs as-is, extract path for local uploads
  const cleanImageUrl = imageUrl !== undefined
    ? (imageUrl
        ? (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
          ? imageUrl // Keep GCS CDN URL as-is
          : extractPath(imageUrl) // Extract path for local
        : null)
    : existing[0].imageUrl;

  const updated = await db
    .update(zakatTypes)
    .set({
      name: name ?? existing[0].name,
      slug: slug ?? existing[0].slug,
      description: description !== undefined ? description : existing[0].description,
      imageUrl: cleanImageUrl,
      icon: icon !== undefined ? icon : existing[0].icon,
      hasCalculator: hasCalculator !== undefined ? hasCalculator : existing[0].hasCalculator,
      isActive: isActive !== undefined ? isActive : existing[0].isActive,
      displayOrder: displayOrder !== undefined ? displayOrder : existing[0].displayOrder,
      calculatorType: calculatorType !== undefined ? (calculatorType || null) : existing[0].calculatorType,
      fitrahAmount: fitrahAmount !== undefined
        ? (fitrahAmount != null && fitrahAmount !== "" ? String(fitrahAmount) : null)
        : existing[0].fitrahAmount,
      // SEO fields
      metaTitle: metaTitle !== undefined ? (metaTitle || null) : existing[0].metaTitle,
      metaDescription: metaDescription !== undefined ? (metaDescription || null) : existing[0].metaDescription,
      focusKeyphrase: focusKeyphrase !== undefined ? (focusKeyphrase || null) : existing[0].focusKeyphrase,
      canonicalUrl: canonicalUrl !== undefined ? (canonicalUrl || null) : existing[0].canonicalUrl,
      noIndex: noIndex !== undefined ? noIndex : existing[0].noIndex,
      noFollow: noFollow !== undefined ? noFollow : existing[0].noFollow,
      ogTitle: ogTitle !== undefined ? (ogTitle || null) : existing[0].ogTitle,
      ogDescription: ogDescription !== undefined ? (ogDescription || null) : existing[0].ogDescription,
      ogImageUrl: ogImageUrl !== undefined ? (ogImageUrl || null) : existing[0].ogImageUrl,
      seoScore: seoScore !== undefined ? seoScore : existing[0].seoScore,
      updatedAt: new Date(),
    })
    .where(eq(zakatTypes.id, id))
    .returning();

  return c.json({
    success: true,
    data: updated[0],
  });
});

/**
 * DELETE /admin/zakat/types/:id
 * Delete zakat type (admin only)
 */
app.delete("/:id", requireRoles("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");

  // Mitra must be verified
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || mitraRecord.status !== "verified") {
      return c.json({ error: "Mitra Anda belum diverifikasi." }, 403);
    }
  }

  const existing = await db
    .select()
    .from(zakatTypes)
    .where(eq(zakatTypes.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Zakat type not found" }, 404);
  }

  // Mitra hanya bisa hapus jenis zakat miliknya sendiri
  if (isMitra && existing[0].createdBy !== user!.id) {
    return c.json({ error: "Anda tidak memiliki akses untuk menghapus jenis zakat ini." }, 403);
  }

  await db.delete(zakatTypes).where(eq(zakatTypes.id, id));

  return c.json({
    success: true,
    message: "Zakat type deleted successfully",
  });
});

export default app;
