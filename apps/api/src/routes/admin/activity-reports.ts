import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { activityReports, transactions, settings, createId } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import { WhatsAppService } from "../../services/whatsapp";
import type { Env, Variables } from "../../types";

// Helper to get frontend URL: env first, fallback to organization_website setting
const getFrontendUrl = async (db: any, env?: Env): Promise<string> => {
  if (env?.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/+$/, "");
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "organization_website"),
  });
  return (row?.value || "").replace(/\/+$/, "");
};

const activityReportsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  referenceType: z.enum(["campaign", "zakat_period", "zakat_disbursement", "qurban_period"]),
  referenceId: z.string(),
  referenceName: z.string().optional(),
  title: z.string().min(10, "Judul harus minimal 10 karakter").max(200, "Judul maksimal 200 karakter"),
  activityDate: z.string(),
  description: z.string().min(50, "Deskripsi harus minimal 50 karakter"),
  gallery: z.array(z.string()).max(20).optional().default([]),
  videoUrl: z.preprocess((val) => val === '' ? undefined : val, z.string().url("URL video tidak valid").optional()),
  typeSpecificData: z.record(z.any()).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

const updateSchema = createSchema.partial();

// GET /admin/activity-reports - List all activity reports
activityReportsAdmin.get("/", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const referenceType = c.req.query("reference_type");
  const referenceId = c.req.query("reference_id");
  const status = c.req.query("status");

  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");

  const conditions = [];

  // Program coordinator can only see reports they created
  if (isCoordinator) {
    conditions.push(eq(activityReports.createdBy, user!.id));
  }

  if (referenceType) {
    conditions.push(eq(activityReports.referenceType, referenceType));
  }
  if (referenceId) {
    conditions.push(eq(activityReports.referenceId, referenceId));
  }
  if (status) {
    conditions.push(eq(activityReports.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db.query.activityReports.findMany({
    where: whereClause,
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [desc(activityReports.activityDate)],
  });

  return success(c, results);
});

// GET /admin/activity-reports/:id - Get single activity report
activityReportsAdmin.get("/:id", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const report = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, id),
    with: {
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

  // Program coordinator can only view their own reports
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  if (isCoordinator && report.createdBy !== user!.id) {
    return error(c, "Activity report not found", 404);
  }

  return success(c, report);
});

// POST /admin/activity-reports - Create new activity report
activityReportsAdmin.post("/", requireRole("super_admin", "admin_campaign", "program_coordinator"), zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  const [report] = await db
    .insert(activityReports)
    .values({
      id: createId(),
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      referenceName: body.referenceName || null,
      title: body.title,
      activityDate: new Date(body.activityDate),
      description: body.description,
      gallery: body.gallery || [],
      videoUrl: body.videoUrl || null,
      typeSpecificData: body.typeSpecificData || null,
      status: body.status || "draft",
      publishedAt: body.status === "published" ? new Date() : null,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // WhatsApp notification: laporan kegiatan dipublikasikan
  if (report.status === "published" && report.referenceId) {
    try {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      const frontendUrl = await getFrontendUrl(db, c.env);
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").substring(0, 200);

      // Get unique donatur phones from transactions for this reference
      const donorTransactions = await db
        .select({
          donorPhone: transactions.donorPhone,
          donorName: transactions.donorName,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.productId, report.referenceId),
            eq(transactions.paymentStatus, "paid")
          )
        );

      const uniqueDonors = new Map<string, string>();
      for (const tx of donorTransactions) {
        if (tx.donorPhone && !uniqueDonors.has(tx.donorPhone)) {
          uniqueDonors.set(tx.donorPhone, tx.donorName);
        }
      }

      const recipients = Array.from(uniqueDonors.entries()).map(([phone, name]) => ({
        phone,
        variables: {
          customer_name: name,
          product_name: report.referenceName || "",
          report_title: report.title,
          report_date: wa.formatDate(new Date(report.activityDate)),
          report_description: stripHtml(report.description || ""),
          report_url: `${frontendUrl}/program/${report.referenceId}`,
        },
      }));

      if (recipients.length > 0) {
        await wa.sendBulk(recipients, "wa_tpl_report_published");
      }
    } catch (err) {
      console.error("WA report-published notification error:", err);
    }
  }

  return success(c, report, "Activity report created successfully", 201);
});

// PUT /admin/activity-reports/:id - Update activity report
activityReportsAdmin.put("/:id", requireRole("super_admin", "admin_campaign", "program_coordinator"), zValidator("json", updateSchema), async (c) => {
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

  if (body.referenceType) updateData.referenceType = body.referenceType;
  if (body.referenceId) updateData.referenceId = body.referenceId;
  if (body.referenceName !== undefined) updateData.referenceName = body.referenceName;
  if (body.title) updateData.title = body.title;
  if (body.activityDate) updateData.activityDate = new Date(body.activityDate);
  if (body.description) updateData.description = body.description;
  if (body.gallery !== undefined) updateData.gallery = body.gallery;
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.typeSpecificData !== undefined) updateData.typeSpecificData = body.typeSpecificData;
  if (body.status) {
    updateData.status = body.status;
    updateData.publishedAt = body.status === "published" ? new Date() : null;
  }

  const [updated] = await db
    .update(activityReports)
    .set(updateData)
    .where(eq(activityReports.id, id))
    .returning();

  // WhatsApp notification: laporan kegiatan dipublikasikan
  // Only send if status changed to published (was not already published)
  if (body.status === "published" && existing.status !== "published" && updated.referenceId) {
    try {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      const frontendUrl = await getFrontendUrl(db, c.env);
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").substring(0, 200);

      const donorTransactions = await db
        .select({
          donorPhone: transactions.donorPhone,
          donorName: transactions.donorName,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.productId, updated.referenceId),
            eq(transactions.paymentStatus, "paid")
          )
        );

      const uniqueDonors = new Map<string, string>();
      for (const tx of donorTransactions) {
        if (tx.donorPhone && !uniqueDonors.has(tx.donorPhone)) {
          uniqueDonors.set(tx.donorPhone, tx.donorName);
        }
      }

      const recipients = Array.from(uniqueDonors.entries()).map(([phone, name]) => ({
        phone,
        variables: {
          customer_name: name,
          product_name: updated.referenceName || "",
          report_title: updated.title,
          report_date: wa.formatDate(new Date(updated.activityDate)),
          report_description: stripHtml(updated.description || ""),
          report_url: `${frontendUrl}/program/${updated.referenceId}`,
        },
      }));

      if (recipients.length > 0) {
        await wa.sendBulk(recipients, "wa_tpl_report_published");
      }
    } catch (err) {
      console.error("WA report-published notification error:", err);
    }
  }

  return success(c, updated, "Activity report updated successfully");
});

// DELETE /admin/activity-reports/:id - Delete activity report
activityReportsAdmin.delete("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
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
