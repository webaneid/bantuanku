import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { activityReports, campaigns, users, employees, createId } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const activityReportsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  campaignId: z.string(),
  title: z.string().min(3),
  activityDate: z.string(),
  description: z.string().min(10),
  gallery: z.array(z.string()).optional().default([]),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

const updateSchema = createSchema.partial();

const publishSchema = z.object({
  status: z.enum(["draft", "published"]),
});

// GET /admin/activity-reports - List all activity reports
activityReportsAdmin.get("/", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const campaignId = c.req.query("campaignId");
  const status = c.req.query("status");

  const conditions = [];
  if (campaignId) {
    conditions.push(eq(activityReports.campaignId, campaignId));
  }
  if (status) {
    conditions.push(eq(activityReports.status, status));
  }

  // If program_coordinator, filter by their campaigns only
  if (user?.roles?.includes("program_coordinator")) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user.id),
    });

    if (employee) {
      // Get campaigns where they are coordinator
      const userCampaigns = await db.query.campaigns.findMany({
        where: eq(campaigns.coordinatorId, employee.id),
        columns: { id: true },
      });

      const campaignIds = userCampaigns.map(c => c.id);

      if (campaignIds.length === 0) {
        // No campaigns assigned, return empty
        return success(c, []);
      }

      // Add campaign filter
      if (campaignId && campaignIds.includes(campaignId)) {
        // campaignId already in conditions, keep it
      } else if (!campaignId) {
        // No specific campaign requested, filter by all their campaigns
        // We'll do post-filtering since drizzle doesn't have IN for this query
      }
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let results = await db.query.activityReports.findMany({
    where: whereClause,
    with: {
      campaign: true,
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [desc(activityReports.createdAt)],
  });

  // Post-filter for program_coordinator
  if (user?.roles?.includes("program_coordinator")) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user.id),
    });

    if (employee) {
      const userCampaigns = await db.query.campaigns.findMany({
        where: eq(campaigns.coordinatorId, employee.id),
        columns: { id: true },
      });

      const campaignIds = userCampaigns.map(c => c.id);
      results = results.filter(r => campaignIds.includes(r.campaignId));
    }
  }

  return success(c, results);
});

// GET /admin/activity-reports/:id - Get single activity report
activityReportsAdmin.get("/:id", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const report = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
    with: {
      campaign: true,
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!report) {
    return error(c, "Activity report not found", 404);
  }

  return success(c, report);
});

// POST /admin/activity-reports - Create new activity report
activityReportsAdmin.post("/", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  // Verify campaign exists
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, body.campaignId),
  });

  if (!campaign) {
    return error(c, "Campaign not found", 404);
  }

  // If program_coordinator, check ownership
  if (user?.roles?.includes("program_coordinator")) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user.id),
    });

    if (employee) {
      const isOwner = campaign.coordinatorId === employee.id || campaign.createdBy === user.id;

      if (!isOwner) {
        return error(c, "You can only create reports for campaigns you are responsible for", 403);
      }
    } else {
      return error(c, "Employee record not found", 403);
    }
  }

  const [report] = await db
    .insert(activityReports)
    .values({
      id: createId(),
      campaignId: body.campaignId,
      title: body.title,
      activityDate: new Date(body.activityDate),
      description: body.description,
      gallery: body.gallery || [],
      status: body.status || "draft",
      publishedAt: body.status === "published" ? new Date() : null,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return success(c, report, "Activity report created successfully", 201);
});

// PUT /admin/activity-reports/:id - Update activity report
activityReportsAdmin.put("/:id", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
  });

  if (!existing) {
    return error(c, "Activity report not found", 404);
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.title) updateData.title = body.title;
  if (body.activityDate) updateData.activityDate = new Date(body.activityDate);
  if (body.description) updateData.description = body.description;
  if (body.gallery !== undefined) updateData.gallery = body.gallery;
  if (body.campaignId) updateData.campaignId = body.campaignId;
  if (body.status) {
    updateData.status = body.status;
    updateData.publishedAt = body.status === "published" ? new Date() : null;
  }

  const [updated] = await db
    .update(activityReports)
    .set(updateData)
    .where(eq(activityReports.id, id))
    .returning();

  return success(c, updated, "Activity report updated successfully");
});

// POST /admin/activity-reports/:id/publish - Publish/unpublish activity report
activityReportsAdmin.post("/:id/publish", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), zValidator("json", publishSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const { status } = c.req.valid("json");

  const existing = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
  });

  if (!existing) {
    return error(c, "Activity report not found", 404);
  }

  const [updated] = await db
    .update(activityReports)
    .set({
      status,
      publishedAt: status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(activityReports.id, id))
    .returning();

  return success(c, updated, `Activity report ${status === "published" ? "published" : "unpublished"} successfully`);
});

// DELETE /admin/activity-reports/:id - Delete activity report
activityReportsAdmin.delete("/:id", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
  });

  if (!existing) {
    return error(c, "Activity report not found", 404);
  }

  await db.delete(activityReports).where(eq(activityReports.id, id));

  return success(c, null, "Activity report deleted successfully");
});

export default activityReportsAdmin;
