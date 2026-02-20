import { Hono } from "hono";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { transactions, campaigns } from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const donationsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET all donations (campaign transactions)
donationsAdmin.get("/", requireRole("super_admin", "admin_campaign", "admin_finance"), async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;
  const status = c.req.query("status");

  const conditions = [eq(transactions.productType, "campaign")];

  if (status === "success") {
    conditions.push(eq(transactions.paymentStatus, "paid"));
  } else if (status === "pending") {
    conditions.push(eq(transactions.paymentStatus, "pending"));
  } else if (status === "failed") {
    conditions.push(eq(transactions.paymentStatus, "failed"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rawData, countResult] = await Promise.all([
    db
      .select({
        transaction: transactions,
        campaign: campaigns,
      })
      .from(transactions)
      .leftJoin(campaigns, eq(transactions.productId, campaigns.id))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause),
  ]);

  // Transform to match frontend expectations
  const data = rawData.map((row) => ({
    ...row.transaction,
    amount: row.transaction.totalAmount,
    campaign: row.campaign ? { title: row.campaign.title } : null,
  }));

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

export default donationsAdmin;
