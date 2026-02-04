import { Hono } from "hono";
import { eq, and, desc, like, gte, lte, sql } from "drizzle-orm";
import { auditLogs } from "@bantuanku/db";
import { success, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const auditAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

auditAdmin.get("/", requireRole("super_admin"), async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const entity = c.req.query("entity");
  const action = c.req.query("action");
  const userId = c.req.query("userId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (entity) {
    conditions.push(eq(auditLogs.entity, entity));
  }

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.auditLogs.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(auditLogs.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

auditAdmin.get("/stats", requireRole("super_admin"), async (c) => {
  const db = c.get("db");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [];

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const byEntity = await db
    .select({
      entity: auditLogs.entity,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.entity)
    .orderBy(desc(sql<number>`count(*)`));

  const byAction = await db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.action)
    .orderBy(desc(sql<number>`count(*)`));

  const byDate = await db
    .select({
      date: sql<string>`date(${auditLogs.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(sql`date(${auditLogs.createdAt})`)
    .orderBy(sql`date(${auditLogs.createdAt})`);

  return success(c, {
    byEntity,
    byAction,
    byDate,
  });
});

export default auditAdmin;
