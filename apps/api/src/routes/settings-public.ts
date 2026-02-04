import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { settings, bankAccounts } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const settingsPublic = new Hono<{ Bindings: Env; Variables: Variables }>();

settingsPublic.get("/", async (c) => {
  const db = c.get("db");

  const publicSettings = await db.query.settings.findMany({
    where: eq(settings.isPublic, true),
    columns: {
      key: true,
      value: true,
      type: true,
    },
  });

  const settingsMap: Record<string, string | number | boolean> = {};
  for (const s of publicSettings) {
    if (s.type === "number") {
      settingsMap[s.key] = parseInt(s.value);
    } else if (s.type === "boolean") {
      settingsMap[s.key] = s.value === "true";
    } else {
      settingsMap[s.key] = s.value;
    }
  }

  return success(c, settingsMap);
});

settingsPublic.get("/bank-accounts", async (c) => {
  const db = c.get("db");

  const accounts = await db.query.bankAccounts.findMany({
    where: eq(bankAccounts.isActive, true),
    columns: {
      id: true,
      bankCode: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      isDefault: true,
    },
    orderBy: (ba, { asc }) => [asc(ba.sortOrder)],
  });

  return success(c, accounts);
});

export default settingsPublic;
