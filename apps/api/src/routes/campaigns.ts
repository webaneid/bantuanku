import { Hono } from "hono";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { campaigns, campaignUpdates, donations, categories } from "@bantuanku/db";
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

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.slug, idOrSlug),
  });

  if (!campaign) {
    const campaignById = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, idOrSlug),
    });

    if (!campaignById) {
      return error(c, "Campaign not found", 404);
    }

    return success(c, campaignById);
  }

  return success(c, campaign);
});

campaignsRoute.get("/:id/donations", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.query.donations.findMany({
      where: and(
        eq(donations.campaignId, id),
        eq(donations.paymentStatus, "success")
      ),
      limit,
      offset,
      orderBy: [desc(donations.paidAt)],
      columns: {
        id: true,
        donorName: true,
        amount: true,
        message: true,
        isAnonymous: true,
        paidAt: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(
        and(eq(donations.campaignId, id), eq(donations.paymentStatus, "success"))
      ),
  ]);

  const maskedData = data.map((d) => ({
    ...d,
    donorName: d.isAnonymous ? "Hamba Allah" : d.donorName,
  }));

  return paginated(c, maskedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
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

export default campaignsRoute;
