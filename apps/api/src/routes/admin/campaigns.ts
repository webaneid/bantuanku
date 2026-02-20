import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { campaigns, campaignUpdates, users, categories, employees, mitra, generateSlug, createId, ledger } from "@bantuanku/db";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import { coordinatorFilter } from "../../middleware/coordinator-filter";
import { createEmailService } from "../../services/email";
import type { Env, Variables } from "../../types";
import { extractPath } from "./media";

const campaignsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Base schema without refine (for reuse)
const baseCampaignSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional().nullable(),
  videoUrl: z.string().optional(),
  goal: z.number().nullable().optional(),
  category: z.string().optional(),
  categoryId: z.string(),
  pillar: z.string().optional(),
  coordinatorId: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
  isFeatured: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  // SEO fields
  metaTitle: z.string().trim().max(70).optional().nullable(),
  metaDescription: z.string().trim().max(170).optional().nullable(),
  focusKeyphrase: z.string().trim().max(100).optional().nullable(),
  canonicalUrl: z.string().trim().optional().nullable(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  ogTitle: z.string().trim().max(70).optional().nullable(),
  ogDescription: z.string().trim().max(200).optional().nullable(),
  ogImageUrl: z.string().trim().optional().nullable(),
  seoScore: z.number().int().min(0).max(100).optional(),
});

// Create schema with validation
const createCampaignSchema = baseCampaignSchema.refine((data) => {
  // Jika pillar bukan Fidyah, goal wajib diisi dan minimal 100.000
  if (data.pillar?.toLowerCase() !== 'fidyah') {
    if (!data.goal || data.goal === 0) {
      return false;
    }
    if (data.goal < 100000) {
      return false;
    }
  }
  return true;
}, {
  message: "Target donasi wajib diisi minimal Rp 100.000 (kecuali untuk Fidyah)",
  path: ["goal"],
});

// Update schema (partial of base, then add refine)
const updateCampaignSchema = baseCampaignSchema.partial().refine((data) => {
  // Jika pillar bukan Fidyah, goal wajib diisi dan minimal 100.000
  if (data.pillar?.toLowerCase() !== 'fidyah') {
    if (data.goal !== undefined && data.goal !== null) {
      if (data.goal === 0 || data.goal < 100000) {
        return false;
      }
    }
  }
  return true;
}, {
  message: "Target donasi wajib diisi minimal Rp 100.000 (kecuali untuk Fidyah)",
  path: ["goal"],
});

campaignsAdmin.get("/", coordinatorFilter, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const status = c.req.query("status");
  const search = c.req.query("search");
  const coordinatorEmployeeId = c.get("coordinatorEmployeeId");

  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) {
    conditions.push(eq(campaigns.status, status));
  }
  if (search) {
    conditions.push(like(campaigns.title, `%${search}%`));
  }
  // Filter by coordinator if user is program_coordinator
  if (coordinatorEmployeeId) {
    conditions.push(eq(campaigns.coordinatorId, coordinatorEmployeeId));
  }

  // Filter by mitra if user has mitra role only
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra && user) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user.id),
    });
    if (mitraRecord) {
      conditions.push(eq(campaigns.mitraId, mitraRecord.id));
    } else {
      // No mitra record found, show nothing
      conditions.push(eq(campaigns.mitraId, "no-mitra-record"));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult, categoriesResult, employeesResult] = await Promise.all([
    db.query.campaigns.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(campaigns.createdAt)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(whereClause),
    db.query.categories.findMany(),
    db.query.employees.findMany(),
  ]);

  // Construct full URLs for images
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  // Helper to construct full URL (handles both GCS CDN and local paths)
  const constructUrl = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return urlOrPath;
    // If already full URL (GCS CDN), return as-is
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    // If relative path, prepend API URL
    return `${apiUrl}${urlOrPath}`;
  };

  // Map category names and coordinator names to campaigns
  const categoriesMap = new Map(categoriesResult.map(cat => [cat.id, cat.name]));
  const employeesMap = new Map(employeesResult.map(emp => [emp.id, emp.name]));
  const enrichedData = data.map(campaign => ({
    ...campaign,
    categoryName: campaign.categoryId ? categoriesMap.get(campaign.categoryId) : campaign.category,
    coordinatorName: campaign.coordinatorId ? employeesMap.get(campaign.coordinatorId) : undefined,
    imageUrl: constructUrl(campaign.imageUrl),
    images: campaign.images ? campaign.images.map((img: string) => constructUrl(img)) : campaign.images,
  }));

  return paginated(c, enrichedData, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

campaignsAdmin.post(
  "/",
  requireRole("super_admin", "admin_campaign", "program_coordinator", "mitra"),
  zValidator("json", createCampaignSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");
    const user = c.get("user");

    const slug = generateSlug(body.title);
    const campaignId = createId();

    const existingSlug = await db.query.campaigns.findFirst({
      where: eq(campaigns.slug, slug),
    });

    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    // If program_coordinator, auto-assign as coordinator
    let finalCoordinatorId = body.coordinatorId || null;
    if (user?.roles?.includes("program_coordinator")) {
      // Get employee ID for this user
      const employee = await db.query.employees.findFirst({
        where: eq(employees.userId, user.id),
      });
      if (employee) {
        finalCoordinatorId = employee.id;
      }
    }

    // If mitra, auto-assign mitraId (must be verified/approved)
    let finalMitraId: string | null = null;
    const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
    if (isMitra) {
      const mitraRecord = await db.query.mitra.findFirst({
        where: eq(mitra.userId, user!.id),
      });
      if (!mitraRecord) {
        return error(c, "Mitra record not found for this user", 403);
      }
      if (mitraRecord.status !== "verified") {
        return error(c, "Mitra Anda belum diverifikasi. Hanya mitra yang sudah diverifikasi yang dapat membuat campaign.", 403);
      }
      finalMitraId = mitraRecord.id;
    }

    // Store GCS URLs as-is, extract path for local uploads
    const cleanImageUrl = body.imageUrl
      ? (body.imageUrl.startsWith('http://') || body.imageUrl.startsWith('https://'))
        ? body.imageUrl // Keep GCS CDN URL as-is
        : extractPath(body.imageUrl) // Extract path for local
      : body.imageUrl;
    const cleanImages = body.images
      ? body.images.map((img: string) =>
          (img.startsWith('http://') || img.startsWith('https://'))
            ? img // Keep GCS CDN URL as-is
            : extractPath(img) // Extract path for local
        )
      : body.images;

    // Set goal to 0 for Fidyah if not provided (null or undefined)
    const finalGoal = (body.goal === null || body.goal === undefined) && body.pillar?.toLowerCase() === 'fidyah'
      ? 0
      : body.goal;

    await db.insert(campaigns).values({
      id: campaignId,
      title: body.title,
      description: body.description,
      content: body.content,
      imageUrl: cleanImageUrl || "",
      images: cleanImages,
      videoUrl: body.videoUrl,
      goal: finalGoal,
      category: body.category || "",
      categoryId: body.categoryId,
      pillar: body.pillar,
      coordinatorId: finalCoordinatorId,
      mitraId: finalMitraId,
      slug: finalSlug,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isFeatured: body.isFeatured,
      isUrgent: body.isUrgent,
      createdBy: user!.id,
      status: isMitra ? "draft" : (body.status || "draft"),
      // SEO fields
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
      focusKeyphrase: body.focusKeyphrase || null,
      canonicalUrl: body.canonicalUrl || null,
      noIndex: body.noIndex ?? false,
      noFollow: body.noFollow ?? false,
      ogTitle: body.ogTitle || null,
      ogDescription: body.ogDescription || null,
      ogImageUrl: body.ogImageUrl || null,
      seoScore: body.seoScore ?? 0,
    });

    return success(c, { id: campaignId, slug: finalSlug }, "Campaign created", 201);
  }
);

campaignsAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });

  if (!campaign) {
    return error(c, "Campaign not found", 404);
  }

  // Employee-only can only see campaigns where they are coordinator
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("program_coordinator");
  if (isEmployeeOnly) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user!.id),
    });
    if (!employee || campaign.coordinatorId !== employee.id) {
      return error(c, "Campaign not found", 404);
    }
  }

  // Mitra can only see their own campaigns
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || campaign.mitraId !== mitraRecord.id) {
      return error(c, "Campaign not found", 404);
    }
  }

  // Calculate total disbursed from ledger (only paid status)
  const disbursedResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${ledger.amount}), 0)`
    })
    .from(ledger)
    .where(
      and(
        eq(ledger.campaignId, id),
        eq(ledger.status, "paid")
      )
    );

  const totalDisbursed = Number(disbursedResult[0]?.total || 0);

  // Construct full URLs for images
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  // Helper to construct full URL (handles both GCS CDN and local paths)
  const constructUrl = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return urlOrPath;
    // If already full URL (GCS CDN), return as-is
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    // If relative path, prepend API URL
    return `${apiUrl}${urlOrPath}`;
  };

  // Enrich with category name if categoryId exists
  let enrichedCampaign: any = {
    ...campaign,
    disbursed: totalDisbursed,
    imageUrl: constructUrl(campaign.imageUrl),
    images: campaign.images ? campaign.images.map((img: string) => constructUrl(img)) : campaign.images,
  };

  if (campaign.categoryId) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, campaign.categoryId),
    });
    if (category) {
      enrichedCampaign.categoryName = category.name;
    }
  }

  // Enrich with coordinator name if coordinatorId exists
  if (campaign.coordinatorId) {
    const coordinator = await db.query.employees.findFirst({
      where: eq(employees.id, campaign.coordinatorId),
    });
    if (coordinator) {
      enrichedCampaign.coordinatorName = coordinator.name;
    }
  }

  // Enrich with mitra name if mitraId exists
  if (campaign.mitraId) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.id, campaign.mitraId),
    });
    if (mitraRecord) {
      enrichedCampaign.mitraName = mitraRecord.name;
    }
  }

  return success(c, enrichedCampaign);
});

const updateCampaign = async (c: any) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  console.log("Update campaign body:", JSON.stringify(body, null, 2));
  const db = c.get("db");
  const user = c.get("user");

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });

  if (!campaign) {
    return error(c, "Campaign not found", 404);
  }

  // If user is program_coordinator or employee-only, check ownership
  const isEmployeeRole = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("admin_finance");

  if (user?.roles?.includes("program_coordinator") || isEmployeeRole) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, user.id),
    });

    if (employee) {
      // Check if coordinator owns this campaign OR created it
      const isOwner = campaign.coordinatorId === employee.id || campaign.createdBy === user.id;

      if (!isOwner) {
        return error(c, "You can only edit campaigns you are responsible for", 403);
      }
    } else {
      return error(c, "Employee record not found", 403);
    }
  }
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord || campaign.mitraId !== mitraRecord.id) {
      return error(c, "Anda hanya bisa mengedit campaign milik Anda", 403);
    }
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.imageUrl !== undefined) {
    updateData.imageUrl = (body.imageUrl.startsWith('http://') || body.imageUrl.startsWith('https://'))
      ? body.imageUrl // Keep GCS CDN URL as-is
      : extractPath(body.imageUrl); // Extract path for local
  }
  if (body.images !== undefined) {
    updateData.images = body.images.map((img: string) =>
      (img.startsWith('http://') || img.startsWith('https://'))
        ? img // Keep GCS CDN URL as-is
        : extractPath(img) // Extract path for local
    );
  }
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.goal !== undefined) {
    // Set goal to 0 for Fidyah if null
    const pillarValue = body.pillar !== undefined ? body.pillar : campaign.pillar;
    updateData.goal = body.goal === null && pillarValue?.toLowerCase() === 'fidyah'
      ? 0
      : body.goal;
  }
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.pillar !== undefined) updateData.pillar = body.pillar;
  if (body.coordinatorId !== undefined) updateData.coordinatorId = body.coordinatorId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
  if (body.isUrgent !== undefined) updateData.isUrgent = body.isUrgent;
  if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  // SEO fields
  if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle || null;
  if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription || null;
  if (body.focusKeyphrase !== undefined) updateData.focusKeyphrase = body.focusKeyphrase || null;
  if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl || null;
  if (body.noIndex !== undefined) updateData.noIndex = body.noIndex;
  if (body.noFollow !== undefined) updateData.noFollow = body.noFollow;
  if (body.ogTitle !== undefined) updateData.ogTitle = body.ogTitle || null;
  if (body.ogDescription !== undefined) updateData.ogDescription = body.ogDescription || null;
  if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl || null;
  if (body.seoScore !== undefined) updateData.seoScore = body.seoScore;

  await db
    .update(campaigns)
    .set(updateData)
    .where(eq(campaigns.id, id));

  return success(c, null, "Campaign updated");
};

campaignsAdmin.patch(
  "/:id",
  requireRole("super_admin", "admin_campaign", "program_coordinator", "employee", "mitra"),
  zValidator("json", updateCampaignSchema),
  updateCampaign
);

campaignsAdmin.put(
  "/:id",
  requireRole("super_admin", "admin_campaign", "program_coordinator", "employee", "mitra"),
  zValidator("json", updateCampaignSchema, (result, c) => {
    if (!result.success) {
      console.log("Validation error:", result.error.flatten());
      return c.json({ success: false, message: "Validation error", errors: result.error.flatten() }, 400);
    }
  }),
  updateCampaign
);

campaignsAdmin.delete("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });

  if (!campaign) {
    return error(c, "Campaign not found", 404);
  }

  await db.delete(campaigns).where(eq(campaigns.id, id));

  return success(c, null, "Campaign deleted");
});

campaignsAdmin.patch(
  "/:id/status",
  requireRole("super_admin", "admin_campaign"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();

    const { status } = body;

    if (!["draft", "active", "completed", "cancelled"].includes(status)) {
      return error(c, "Invalid status", 400);
    }

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
    });

    if (!campaign) {
      return error(c, "Campaign not found", 404);
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "active" && !campaign.publishedAt) {
      updateData.publishedAt = new Date();
    }

    await db.update(campaigns).set(updateData).where(eq(campaigns.id, id));

    // Send email notification to campaign creator
    if (c.env.RESEND_API_KEY && campaign.createdBy) {
      const creator = await db.query.users.findFirst({
        where: eq(users.id, campaign.createdBy),
      });

      if (creator?.email) {
        const emailService = createEmailService(c.env.RESEND_API_KEY, c.env.FROM_EMAIL || "noreply@bantuanku.org");
        await emailService.sendCampaignStatusUpdate({
          adminEmail: creator.email,
          campaignTitle: campaign.title,
          status,
          reason: body.reason,
        });
      }
    }

    return success(c, null, "Campaign status updated");
  }
);

campaignsAdmin.post(
  "/:id/updates",
  requireRole("super_admin", "admin_campaign", "program_coordinator", "employee", "mitra"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const user = c.get("user");
    const body = await c.req.json();

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
    });

    if (!campaign) {
      return error(c, "Campaign not found", 404);
    }

    // If user is program_coordinator or employee-only, check ownership
    const isEmployeeRole = user?.roles?.includes("employee") &&
      !user?.roles?.includes("super_admin") &&
      !user?.roles?.includes("admin_campaign") &&
      !user?.roles?.includes("admin_finance");

    if (user?.roles?.includes("program_coordinator") || isEmployeeRole) {
      const employee = await db.query.employees.findFirst({
        where: eq(employees.userId, user.id),
      });

      if (employee) {
        // Check if coordinator owns this campaign OR created it
        const isOwner = campaign.coordinatorId === employee.id || campaign.createdBy === user.id;

        if (!isOwner) {
          return error(c, "You can only create updates for campaigns you are responsible for", 403);
        }
      } else {
        return error(c, "Employee record not found", 403);
      }
    }

    // If user is mitra, check ownership via mitraId
    const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
    if (isMitra) {
      const mitraRecord = await db.query.mitra.findFirst({
        where: eq(mitra.userId, user!.id),
      });
      if (!mitraRecord || campaign.mitraId !== mitraRecord.id) {
        return error(c, "Anda hanya bisa membuat update untuk campaign milik Anda", 403);
      }
    }

    const { title, content, images } = body;

    if (!title || !content) {
      return error(c, "Title and content are required", 400);
    }

    const updateId = createId();

    await db.insert(campaignUpdates).values({
      id: updateId,
      campaignId: id,
      title,
      content,
      images,
      createdBy: user!.id,
    });

    return success(c, { id: updateId }, "Update posted", 201);
  }
);

export default campaignsAdmin;
