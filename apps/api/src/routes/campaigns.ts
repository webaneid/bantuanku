import { Hono } from "hono";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { campaigns, campaignUpdates, categories, transactions, mitra, employees } from "@bantuanku/db";
import { success, error, paginated } from "../lib/response";
import { optionalAuthMiddleware } from "../middleware/auth";
import { campaignCache } from "../middleware/cache";
import { publicDonorName } from "../lib/transaction-privacy";
import type { Env, Variables } from "../types";

// Status yang boleh diminta lewat query di endpoint publik (draft sengaja tidak termasuk)
const PUBLIC_LIST_STATUSES = new Set(["active", "completed", "closed"]);

const campaignsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

campaignsRoute.get("/", campaignCache, optionalAuthMiddleware, async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const category = c.req.query("category");
  const search = c.req.query("search");
  // Endpoint publik: hanya status yang boleh dilihat umum (draft tidak boleh bocor lewat ?status=draft)
  const requestedStatus = c.req.query("status");
  const status = requestedStatus && PUBLIC_LIST_STATUSES.has(requestedStatus) ? requestedStatus : "active";

  const offset = (page - 1) * limit;

  const conditions = [eq(campaigns.status, status)];

  if (category) {
    conditions.push(eq(campaigns.category, category));
  }

  if (search) {
    conditions.push(like(campaigns.title, `%${search}%`));
  }

  const whereClause = and(...conditions);

  const [data, countResult, categoriesResult] = await Promise.all([
    db.query.campaigns.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(campaigns.createdAt)],
      columns: {
        id: true,
        title: true,
        slug: true,
        description: true,
        imageUrl: true,
        goal: true,
        collected: true,
        donorCount: true,
        categoryId: true,
        category: true,
        pillar: true,
        isFeatured: true,
        isUrgent: true,
        endDate: true,
        createdAt: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(whereClause),
    db.query.categories.findMany(),
  ]);

  // Enrich with category names
  const categoriesMap = new Map(categoriesResult.map(cat => [cat.id, cat.name]));
  const enrichedData = data.map(campaign => ({
    ...campaign,
    categoryName: campaign.categoryId ? categoriesMap.get(campaign.categoryId) : undefined,
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

campaignsRoute.get("/featured", campaignCache, async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "5");

  const [data, categoriesResult] = await Promise.all([
    db.query.campaigns.findMany({
      where: and(eq(campaigns.status, "active"), eq(campaigns.isFeatured, true)),
      limit,
      orderBy: [desc(campaigns.createdAt)],
      columns: {
        id: true,
        title: true,
        slug: true,
        description: true,
        imageUrl: true,
        goal: true,
        collected: true,
        donorCount: true,
        categoryId: true,
        category: true,
        pillar: true,
        isUrgent: true,
      },
    }),
    db.query.categories.findMany(),
  ]);

  // Enrich with category names
  const categoriesMap = new Map(categoriesResult.map(cat => [cat.id, cat.name]));
  const enrichedData = data.map(campaign => ({
    ...campaign,
    categoryName: campaign.categoryId ? categoriesMap.get(campaign.categoryId) : undefined,
  }));

  return success(c, enrichedData);
});

campaignsRoute.get("/urgent", campaignCache, async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "5");

  const [data, categoriesResult] = await Promise.all([
    db.query.campaigns.findMany({
      where: and(eq(campaigns.status, "active"), eq(campaigns.isUrgent, true)),
      limit,
      orderBy: [desc(campaigns.createdAt)],
      columns: {
        id: true,
        title: true,
        slug: true,
        description: true,
        imageUrl: true,
        goal: true,
        collected: true,
        donorCount: true,
        categoryId: true,
        category: true,
        pillar: true,
      },
    }),
    db.query.categories.findMany(),
  ]);

  // Enrich with category names
  const categoriesMap = new Map(categoriesResult.map(cat => [cat.id, cat.name]));
  const enrichedData = data.map(campaign => ({
    ...campaign,
    categoryName: campaign.categoryId ? categoriesMap.get(campaign.categoryId) : undefined,
  }));

  return success(c, enrichedData);
});

campaignsRoute.get("/:idOrSlug", campaignCache, async (c) => {
  const db = c.get("db");
  const idOrSlug = c.req.param("idOrSlug");

  let campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.slug, idOrSlug),
  });

  if (!campaign) {
    campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, idOrSlug),
    });

    if (!campaign) {
      return error(c, "Campaign not found", 404);
    }
  }

  // Campaign draft belum dipublish — jangan bocorkan ke publik walau URL/ID diketahui.
  // Status lain (active, completed, dst) tetap dapat diakses agar link lama yang sudah
  // dibagikan (invoice, WA, share) tidak mendadak 404 saat campaign selesai.
  if (campaign.status === "draft") {
    return error(c, "Campaign not found", 404);
  }

  // Enrich with mitra data if campaign belongs to a mitra
  const result: any = { ...campaign };

  // Enrich with category name from categories table
  if (campaign.categoryId) {
    const categoryRecord = await db.query.categories.findFirst({
      where: eq(categories.id, campaign.categoryId),
      columns: {
        name: true,
      },
    });

    if (categoryRecord?.name) {
      result.categoryName = categoryRecord.name;
    }
  }
  if (campaign.mitraId) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.id, campaign.mitraId),
      columns: {
        name: true,
        slug: true,
        logoUrl: true,
      },
    });
    if (mitraRecord) {
      result.mitraName = mitraRecord.name;
      result.mitraSlug = mitraRecord.slug;
      result.mitraLogoUrl = mitraRecord.logoUrl;
    }
  }

  // Enrich with coordinator data if available
  if (campaign.coordinatorId) {
    const coordinator = await db.query.employees.findFirst({
      where: eq(employees.id, campaign.coordinatorId),
      columns: {
        name: true,
      },
    });
    if (coordinator) {
      result.coordinatorName = coordinator.name;
    }
  }

  return success(c, result);
});

campaignsRoute.get("/:id/updates", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.query.campaignUpdates.findMany({
      where: eq(campaignUpdates.campaignId, id),
      limit,
      offset,
      orderBy: [desc(campaignUpdates.createdAt)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaignUpdates)
      .where(eq(campaignUpdates.campaignId, id)),
  ]);

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

// GET /campaigns/:id/donors - Get donors for a campaign (from transactions)
campaignsRoute.get("/:id/donors", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.productType, "campaign"),
        eq(transactions.productId, id),
        eq(transactions.paymentStatus, "paid")
      ),
      limit,
      offset,
      orderBy: [desc(transactions.paidAt)],
      columns: {
        id: true,
        donorName: true,
        isAnonymous: true,
        totalAmount: true,
        message: true,
        paidAt: true,
        typeSpecificData: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.productType, "campaign"),
          eq(transactions.productId, id),
          eq(transactions.paymentStatus, "paid")
        )
      ),
  ]);

  // Nama dari profil terdaftar disamarkan; typeSpecificData tidak ikut ke respons publik
  const publicData = data.map(({ typeSpecificData, ...row }: any) => ({
    ...row,
    donorName: publicDonorName(row.donorName, typeSpecificData),
  }));

  return paginated(c, publicData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

export default campaignsRoute;
