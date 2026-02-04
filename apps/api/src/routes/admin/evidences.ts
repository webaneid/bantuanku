import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { evidences, ledger } from "@bantuanku/db";
import { success, error as errorResponse } from "../../lib/response";
import type { Env, Variables } from "../../types";

const evidencesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /admin/evidences?disbursementId=xxx - List evidences for a disbursement
const listQuerySchema = z.object({
  disbursementId: z.string(),
});

evidencesAdmin.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = c.get("db");
  const query = c.req.valid("query");

  const data = await db.query.evidences.findMany({
    where: eq(evidences.disbursementId, query.disbursementId),
    orderBy: [desc(evidences.uploadedAt)],
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

// GET /admin/evidences/:id - Get single evidence
evidencesAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const evidence = await db.query.evidences.findFirst({
    where: eq(evidences.id, id),
    with: {
      uploader: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      disbursement: true,
    },
  });

  if (!evidence) {
    return errorResponse(c, "Evidence not found", 404);
  }

  return success(c, evidence);
});

// POST /admin/evidences - Create new evidence
const createSchema = z.object({
  disbursementId: z.string(),
  type: z.enum(["receipt", "invoice", "photo", "document"]),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  amount: z.number().optional(),
});

evidencesAdmin.post("/", zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  // Verify disbursement exists
  const disbursement = await db.query.ledger.findFirst({
    where: eq(ledger.id, body.disbursementId),
  });

  if (!disbursement) {
    return errorResponse(c, "Disbursement not found", 404);
  }

  const [evidence] = await db
    .insert(evidences)
    .values({
      ...body,
      uploadedBy: user.id,
    })
    .returning();

  return success(c, evidence, "Evidence uploaded successfully", 201);
});

// PATCH /admin/evidences/:id - Update evidence
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
});

evidencesAdmin.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.evidences.findFirst({
    where: eq(evidences.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Evidence not found", 404);
  }

  const [updated] = await db
    .update(evidences)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(evidences.id, id))
    .returning();

  return success(c, updated, "Evidence updated successfully");
});

// DELETE /admin/evidences/:id - Delete evidence
evidencesAdmin.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.evidences.findFirst({
    where: eq(evidences.id, id),
    with: {
      disbursement: true,
    },
  });

  if (!existing) {
    return errorResponse(c, "Evidence not found", 404);
  }

  // Only allow deletion if disbursement is still in draft or submitted status
  if (existing.disbursement.status !== "draft" && existing.disbursement.status !== "submitted") {
    return errorResponse(c, "Cannot delete evidence from approved/paid disbursement", 400);
  }

  await db.delete(evidences).where(eq(evidences.id, id));

  return success(c, null, "Evidence deleted successfully");
});

export default evidencesAdmin;
