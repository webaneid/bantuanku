import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { donationEvidences, donations } from "@bantuanku/db";
import { success, error as errorResponse } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const donationEvidencesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /admin/donations/:donationId/evidence - List evidences for a donation
donationEvidencesAdmin.get("/:donationId/evidence", async (c) => {
  const db = c.get("db");
  const donationId = c.req.param("donationId");

  const data = await db.query.donationEvidences.findMany({
    where: eq(donationEvidences.donationId, donationId),
    orderBy: [desc(donationEvidences.uploadedAt)],
    with: {
      uploader: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return success(c, data);
});

// POST /admin/donations/:donationId/evidence - Create new evidence
const createSchema = z.object({
  type: z.enum(["proof_of_payment", "receipt", "other"]),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url(),
});

donationEvidencesAdmin.post(
  "/:donationId/evidence",
  requireRole("super_admin", "admin_finance", "admin_campaign"),
  zValidator("json", createSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const donationId = c.req.param("donationId");
    const body = c.req.valid("json");

    // Verify donation exists
    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, donationId),
    });

    if (!donation) {
      return errorResponse(c, "Donation not found", 404);
    }

    const [evidence] = await db
      .insert(donationEvidences)
      .values({
        donationId,
        ...body,
        uploadedBy: user!.id,
      })
      .returning();

    return success(c, evidence, "Evidence uploaded successfully", 201);
  }
);

// DELETE /admin/donations/:donationId/evidence/:id - Delete evidence
donationEvidencesAdmin.delete(
  "/:donationId/evidence/:id",
  requireRole("super_admin", "admin_finance", "admin_campaign"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const donationId = c.req.param("donationId");

    const existing = await db.query.donationEvidences.findFirst({
      where: eq(donationEvidences.id, id),
    });

    if (!existing) {
      return errorResponse(c, "Evidence not found", 404);
    }

    if (existing.donationId !== donationId) {
      return errorResponse(c, "Evidence does not belong to this donation", 400);
    }

    await db.delete(donationEvidences).where(eq(donationEvidences.id, id));

    return success(c, null, "Evidence deleted successfully");
  }
);

export default donationEvidencesAdmin;
