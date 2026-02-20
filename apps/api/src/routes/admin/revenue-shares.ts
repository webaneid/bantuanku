import { Hono } from "hono";
import { z } from "zod";
import { RevenueShareService } from "../../services/revenue-share";
import { error, success } from "../../lib/response";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const listQuerySchema = z.object({
  transaction_id: z.string().optional(),
  fundraiser_id: z.string().optional(),
  mitra_id: z.string().optional(),
  status: z.string().optional(),
  product_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

function parseDateStart(input?: string): Date | undefined {
  if (!input) return undefined;
  const date = new Date(`${input}T00:00:00.000`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseDateEnd(input?: string): Date | undefined {
  if (!input) return undefined;
  const date = new Date(`${input}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

// GET /admin/revenue-shares
app.get("/", async (c) => {
  try {
    const query = listQuerySchema.parse(c.req.query());
    const service = new RevenueShareService(c.get("db"));

    const result = await service.list({
      transactionId: query.transaction_id,
      fundraiserId: query.fundraiser_id,
      mitraId: query.mitra_id,
      status: query.status,
      productType: query.product_type,
      dateFrom: parseDateStart(query.date_from),
      dateTo: parseDateEnd(query.date_to),
      page: query.page ? Number.parseInt(query.page, 10) : undefined,
      limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
    });

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err: any) {
    console.error("Error fetching revenue shares:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0]?.message || "Invalid query params", 400);
    }
    return error(c, err.message || "Failed to fetch revenue shares", 500);
  }
});

// GET /admin/revenue-shares/summary
app.get("/summary", async (c) => {
  try {
    const query = listQuerySchema.parse(c.req.query());
    const service = new RevenueShareService(c.get("db"));

    const summary = await service.summary({
      transactionId: query.transaction_id,
      fundraiserId: query.fundraiser_id,
      mitraId: query.mitra_id,
      status: query.status,
      productType: query.product_type,
      dateFrom: parseDateStart(query.date_from),
      dateTo: parseDateEnd(query.date_to),
    });

    return success(c, summary);
  } catch (err: any) {
    console.error("Error fetching revenue share summary:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0]?.message || "Invalid query params", 400);
    }
    return error(c, err.message || "Failed to fetch revenue share summary", 500);
  }
});

// GET /admin/revenue-shares/:id
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const service = new RevenueShareService(c.get("db"));
    const detail = await service.getById(id);

    if (!detail) {
      return error(c, "Revenue share not found", 404);
    }

    return success(c, detail);
  } catch (err: any) {
    console.error("Error fetching revenue share detail:", err);
    return error(c, err.message || "Failed to fetch revenue share detail", 500);
  }
});

export default app;
