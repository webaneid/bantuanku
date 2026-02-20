import { Hono } from "hono";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { campaigns, campaignUpdates, categories, transactions, mitra, employees } from "@bantuanku/db";
import { success, error, paginated } from "../lib/response";
import { optionalAuthMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const campaignsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

campaignsRoute.get("/", optionalAuthMiddleware, async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const category = c.req.query("category");
  const search = c.req.query("search");
  const status = c.req.query("status") || "active";

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

campaignsRoute.get("/featured", async (c) => {
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

campaignsRoute.get("/urgent", async (c) => {
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

campaignsRoute.get("/:idOrSlug", async (c) => {
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

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

export default campaignsRoute;
