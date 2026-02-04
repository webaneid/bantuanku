import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, asc, ilike, and, isNull } from "drizzle-orm";
import { chartOfAccounts } from "@bantuanku/db";
import { success, error as errorResponse } from "../../lib/response";
import type { Env, Variables } from "../../types";

const coaAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation function for COA consistency
function validateCOAConsistency(type: string, normalBalance: string): { valid: boolean; error?: string } {
  const rules: Record<string, string> = {
    'asset': 'debit',
    'expense': 'debit',
    'liability': 'credit',
    'equity': 'credit',
    'income': 'credit',
  };

  const expectedBalance = rules[type];
  if (!expectedBalance) {
    return { valid: false, error: `Invalid account type: ${type}` };
  }

  if (expectedBalance !== normalBalance) {
    return {
      valid: false,
      error: `Account type "${type}" must have normalBalance="${expectedBalance}", got "${normalBalance}". Asset and Expense must be debit. Liability, Equity, and Income must be credit.`
    };
  }

  return { valid: true };
}

// GET /admin/coa - List all COA with optional filters
const listQuerySchema = z.object({
  type: z.enum(["asset", "liability", "equity", "income", "expense"]).optional(),
  category: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  level: z.coerce.number().optional(),
  search: z.string().optional(),
});

coaAdmin.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = c.get("db");
  const query = c.req.valid("query");

  const conditions = [];

  if (query.type) {
    conditions.push(eq(chartOfAccounts.type, query.type));
  }

  if (query.category) {
    conditions.push(eq(chartOfAccounts.category, query.category));
  }

  if (query.active) {
    conditions.push(eq(chartOfAccounts.isActive, query.active === "true"));
  }

  if (query.level) {
    conditions.push(eq(chartOfAccounts.level, query.level));
  }

  if (query.search) {
    conditions.push(
      ilike(chartOfAccounts.name, `%${query.search}%`)
    );
  }

  const data = await db.query.chartOfAccounts.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [asc(chartOfAccounts.code)],
  });

  return success(c, data);
});

// GET /admin/coa/tree - Get hierarchical tree structure
coaAdmin.get("/tree", async (c) => {
  const db = c.get("db");

  const allAccounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.isActive, true),
    orderBy: [asc(chartOfAccounts.code)],
  });

  // Build tree structure
  const tree = allAccounts
    .filter((acc) => !acc.parentId)
    .map((parent) => ({
      ...parent,
      children: buildChildren(parent.id, allAccounts),
    }));

  return success(c, tree);
});

function buildChildren(parentId: string, allAccounts: any[]): any[] {
  return allAccounts
    .filter((acc) => acc.parentId === parentId)
    .map((child) => ({
      ...child,
      children: buildChildren(child.id, allAccounts),
    }));
}

// GET /admin/coa/:id - Get single COA
coaAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const account = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.id, id),
  });

  if (!account) {
    return errorResponse(c, "Account not found", 404);
  }

  return success(c, account);
});

// POST /admin/coa - Create new COA
const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  category: z.string().optional(),
  normalBalance: z.enum(["debit", "credit"]),
  parentId: z.string().optional(),
  level: z.number().default(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

coaAdmin.post("/", zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  // Validate COA consistency
  const validation = validateCOAConsistency(body.type, body.normalBalance);
  if (!validation.valid) {
    return errorResponse(c, validation.error || "Invalid account configuration", 400);
  }

  // Check if code already exists
  const existing = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.code, body.code),
  });

  if (existing) {
    return errorResponse(c, "Account code already exists", 400);
  }

  const [account] = await db
    .insert(chartOfAccounts)
    .values(body)
    .returning();

  return success(c, account, "Account created successfully", 201);
});

// PATCH /admin/coa/:id - Update COA
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().optional(),
  level: z.number().optional(),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]).optional(),
  normalBalance: z.enum(["debit", "credit"]).optional(),
});

coaAdmin.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Account not found", 404);
  }

  // Validate COA consistency if type or normalBalance is being updated
  if (body.type || body.normalBalance) {
    const newType = body.type || existing.type;
    const newBalance = body.normalBalance || existing.normalBalance;
    const validation = validateCOAConsistency(newType, newBalance);
    if (!validation.valid) {
      return errorResponse(c, validation.error || "Invalid account configuration", 400);
    }
  }

  if (existing.isSystem) {
    // System accounts can only update certain fields
    const allowedFields = { description: body.description };
    const [updated] = await db
      .update(chartOfAccounts)
      .set({ ...allowedFields, updatedAt: new Date() })
      .where(eq(chartOfAccounts.id, id))
      .returning();

    return success(c, updated, "System account updated");
  }

  const [updated] = await db
    .update(chartOfAccounts)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(chartOfAccounts.id, id))
    .returning();

  return success(c, updated, "Account updated successfully");
});

// DELETE /admin/coa/:id - Delete COA
coaAdmin.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.id, id),
  });

  if (!existing) {
    return errorResponse(c, "Account not found", 404);
  }

  if (existing.isSystem) {
    return errorResponse(c, "Cannot delete system account", 400);
  }

  // Check if account has children
  const children = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.parentId, id),
  });

  if (children) {
    return errorResponse(c, "Cannot delete account with children. Delete or move child accounts first.", 400);
  }

  // Soft delete by setting isActive to false
  await db
    .update(chartOfAccounts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(chartOfAccounts.id, id));

  return success(c, null, "Account deleted successfully");
});

export default coaAdmin;
