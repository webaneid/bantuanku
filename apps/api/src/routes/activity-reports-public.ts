import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { activityReports } from "@bantuanku/db";
import { success, error } from "../lib/response";
import type { Env, Variables } from "../types";

const activityReportsPublic = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /activity-reports/campaign/:campaignId - Get published activity reports for a campaign (public)
activityReportsPublic.get("/campaign/:campaignId", async (c) => {
  const db = c.get("db");
  const campaignId = c.req.param("campaignId");
  const limit = parseInt(c.req.query("limit") || "50");
  const page = parseInt(c.req.query("page") || "1");
  const offset = (page - 1) * limit;

  const reports = await db.query.activityReports.findMany({
    where: and(
      eq(activityReports.campaignId, campaignId),
      eq(activityReports.status, "published")
    ),
    columns: {
      id: true,
      title: true,
      description: true,
      activityDate: true,
      gallery: true,
      createdAt: true,
    },
    orderBy: [desc(activityReports.activityDate)],
    limit,
    offset,
  });

  return success(c, reports);
});

export default activityReportsPublic;
