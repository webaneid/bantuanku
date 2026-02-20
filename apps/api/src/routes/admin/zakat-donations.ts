import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { transactions } from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const zakatDonationsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET all zakat donations (zakat transactions)
zakatDonationsAdmin.get("/", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;
  const paymentStatus = c.req.query("paymentStatus");

  const conditions = [eq(transactions.productType, "zakat")];

  if (paymentStatus === "success") {
    conditions.push(eq(transactions.paymentStatus, "paid"));
  } else if (paymentStatus === "pending") {
    conditions.push(eq(transactions.paymentStatus, "pending"));
  } else if (paymentStatus === "failed") {
    conditions.push(eq(transactions.paymentStatus, "failed"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rawData, countResult] = await Promise.all([
    db
      .select()
      .from(transactions)
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
  const data = rawData.map((transaction) => ({
    ...transaction,
    amount: transaction.totalAmount,
    zakatTypeName: transaction.productName, // productName contains zakat type name
  }));

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

export default zakatDonationsAdmin;
