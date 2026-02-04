import { Hono } from "hono";
import { eq, sql, countDistinct } from "drizzle-orm";
import { donations, campaigns } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const publicStats = new Hono<{ Bindings: Env; Variables: Variables }>();

publicStats.get("/", async (c) => {
  const db = c.get("db");

  const [
    totalDonors,
    totalCampaigns,
    totalDisbursed,
  ] = await Promise.all([
    // Count unique donors (by email) from successful donations
    db
      .select({ count: countDistinct(donations.donorEmail) })
      .from(donations)
      .where(eq(donations.paymentStatus, "success")),

    // Count active campaigns
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),

    // Total amount disbursed (all successful donations)
    db
      .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(donations)
      .where(eq(donations.paymentStatus, "success")),
  ]);

  return success(c, {
    totalDonors: Number(totalDonors[0]?.count || 0),
    totalCampaigns: Number(totalCampaigns[0]?.count || 0),
    totalDisbursed: Number(totalDisbursed[0]?.sum || 0),
    totalPartners: 50, // Dummy data for now
  });
});

export default publicStats;
