import { Hono } from "hono";
import { eq, or, and, like, gte, lte, desc, sql } from "drizzle-orm";
import { campaigns, users } from "@bantuanku/db";
import { success, paginated } from "../lib/response";
import type { Env, Variables } from "../types";

const searchRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

searchRoute.get("/", async (c) => {
  const db = c.get("db");
  const query = c.req.query("q");
  const type = c.req.query("type") || "all";
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  if (!query || query.length < 2) {
    return success(c, { campaigns: [], donations: [], users: [] });
  }

  const results: {
    campaigns?: unknown[];
    users?: unknown[];
  } = {};

  if (type === "all" || type === "campaigns") {
    const campaignResults = await db.query.campaigns.findMany({
      where: and(
        eq(campaigns.status, "active"),
        or(like(campaigns.title, `%${query}%`), like(campaigns.description, `%${query}%`))
      ),
      limit: type === "all" ? 5 : limit,
      offset: type === "all" ? 0 : offset,
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
        status: true,
        createdAt: true,
      },
    });
    results.campaigns = campaignResults;
  }

  if (type === "all" || type === "users") {
    const userResults = await db.query.users.findMany({
      where: or(like(users.name, `%${query}%`), like(users.email, `%${query}%`)),
      limit: type === "all" ? 5 : limit,
      offset: type === "all" ? 0 : offset,
      orderBy: [desc(users.createdAt)],
      columns: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    results.users = userResults;
  }

  return success(c, results);
});

searchRoute.get("/campaigns", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  const search = c.req.query("search");
  const category = c.req.query("category");
  const pillar = c.req.query("pillar");
  const status = c.req.query("status") || "active";
  const isFeatured = c.req.query("isFeatured");
  const isUrgent = c.req.query("isUrgent");
  const minGoal = c.req.query("minGoal");
  const maxGoal = c.req.query("maxGoal");
  const minCollected = c.req.query("minCollected");
  const maxCollected = c.req.query("maxCollected");
  const sort = c.req.query("sort") || "latest";

  const conditions = [];

  if (status) {
    conditions.push(eq(campaigns.status, status));
  }

  if (search) {
    conditions.push(or(like(campaigns.title, `%${search}%`), like(campaigns.description, `%${search}%`)));
  }

  if (category) {
    conditions.push(eq(campaigns.category, category));
  }

  if (pillar) {
    conditions.push(eq(campaigns.pillar, pillar));
  }

  if (isFeatured !== undefined) {
    conditions.push(eq(campaigns.isFeatured, isFeatured === "true"));
  }

  if (isUrgent !== undefined) {
    conditions.push(eq(campaigns.isUrgent, isUrgent === "true"));
  }

  if (minGoal) {
    conditions.push(gte(campaigns.goal, parseInt(minGoal)));
  }

  if (maxGoal) {
    conditions.push(lte(campaigns.goal, parseInt(maxGoal)));
  }

  if (minCollected) {
    conditions.push(gte(campaigns.collected, parseInt(minCollected)));
  }

  if (maxCollected) {
    conditions.push(lte(campaigns.collected, parseInt(maxCollected)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  switch (sort) {
    case "popular":
      orderBy = [desc(campaigns.donorCount)];
      break;
    case "collected":
      orderBy = [desc(campaigns.collected)];
      break;
    case "urgent":
      orderBy = [desc(campaigns.isUrgent), desc(campaigns.createdAt)];
      break;
    case "ending":
      orderBy = [desc(campaigns.endDate)];
      break;
    default:
      orderBy = [desc(campaigns.createdAt)];
  }

  const [data, countResult] = await Promise.all([
    db.query.campaigns.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(whereClause),
  ]);

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

export default searchRoute;
