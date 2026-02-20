import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { settings, entityBankAccounts, bankAccounts } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";
import { z } from "zod";

const bankAccountsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /admin/bank-accounts - Get bank accounts from settings
bankAccountsAdmin.get("/", requireRole("super_admin", "admin_finance"), async (c) => {
  const db = c.get("db");

  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, "payment_bank_accounts"),
  });

  if (!setting || !setting.value) {
    return success(c, []);
  }

  try {
    const bankAccounts = JSON.parse(setting.value);
    return success(c, bankAccounts);
  } catch (err) {
    console.error("Failed to parse payment_bank_accounts:", err);
    return error(c, "Invalid bank accounts data", 500);
  }
});

// GET /admin/bank-accounts/source - Get source bank accounts from settings JSON
bankAccountsAdmin.get("/source", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");

  try {
    // Get from settings JSON (not bank_accounts table)
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "payment_bank_accounts"),
    });

    if (!setting || !setting.value) {
      return success(c, []);
    }

    const accounts = JSON.parse(setting.value);

    // Map to include isForZakat flag based on programs array
    const mappedAccounts = accounts.map((acc: any) => ({
      ...acc,
      id: acc.id,
      bankName: acc.bankName,
      bank_name: acc.bankName,
      accountNumber: acc.accountNumber,
      account_number: acc.accountNumber,
      accountName: acc.accountName,
      programs: acc.programs || ["general"],
      isForZakat: (acc.programs || []).includes("zakat"),
      is_for_zakat: (acc.programs || []).includes("zakat"),
    }));

    return success(c, mappedAccounts);
  } catch (err) {
    console.error("Failed to fetch bank accounts:", err);
    return error(c, "Failed to fetch bank accounts", 500);
  }
});

// POST /admin/bank-accounts/entity - Create entity bank account
bankAccountsAdmin.post("/entity", requireRole("super_admin", "admin_finance", "admin_campaign"), async (c) => {
  const db = c.get("db");

  const schema = z.object({
    entityType: z.string(),
    entityId: z.string(),
    bankName: z.string().min(1),
    accountNumber: z.string().min(1),
    accountHolderName: z.string().min(1),
  });

  try {
    const body = await c.req.json();
    const validated = schema.parse(body);

    const [newAccount] = await db.insert(entityBankAccounts).values({
      entityType: validated.entityType,
      entityId: validated.entityId,
      bankName: validated.bankName,
      accountNumber: validated.accountNumber,
      accountHolderName: validated.accountHolderName,
    }).returning();

    return success(c, newAccount);
  } catch (err) {
    console.error("Failed to create bank account:", err);
    return error(c, "Failed to create bank account", 400);
  }
});

export default bankAccountsAdmin;
