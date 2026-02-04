import { Hono } from "hono";
import { eq, sql, and, gte } from "drizzle-orm";
import { donations, campaigns } from "@bantuanku/db";
import { success } from "../../lib/response";
import type { Env, Variables } from "../../types";
import { getStartOfMonthWIB } from "../../utils/timezone";

const dashboard = new Hono<{ Bindings: Env; Variables: Variables }>();

dashboard.get("/stats", async (c) => {
  const db = c.get("db");

  const now = new Date();
  const startOfMonth = getStartOfMonthWIB(now);

  const [
    totalDonations,
    totalAmount,
    totalCampaigns,
    monthlyDonations,
    monthlyAmount,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(eq(donations.paymentStatus, "success")),
    db
      .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(donations)
      .where(eq(donations.paymentStatus, "success")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(
        and(
          eq(donations.paymentStatus, "success"),
          gte(donations.paidAt, startOfMonth)
        )
      ),
    db
      .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(donations)
      .where(
        and(
          eq(donations.paymentStatus, "success"),
          gte(donations.paidAt, startOfMonth)
        )
      ),
  ]);

  return success(c, {
    totalDonations: Number(totalDonations[0]?.count || 0),
    totalAmount: Number(totalAmount[0]?.sum || 0),
    totalCampaigns: Number(totalCampaigns[0]?.count || 0),
    monthlyDonations: Number(monthlyDonations[0]?.count || 0),
    monthlyAmount: Number(monthlyAmount[0]?.sum || 0),
  });
});

dashboard.get("/recent-donations", async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "10");

  const data = await db.query.donations.findMany({
    where: eq(donations.paymentStatus, "success"),
    limit,
    orderBy: (donations, { desc }) => [desc(donations.paidAt)],
    columns: {
      id: true,
      referenceId: true,
      donorName: true,
      isAnonymous: true,
      amount: true,
      paidAt: true,
      campaignId: true,
    },
  });

  return success(c, data);
});

export default dashboard;
