import { Hono } from "hono";
import { eq, or, inArray } from "drizzle-orm";
import {
  settings,
  bankAccounts,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
} from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const settingsPublic = new Hono<{ Bindings: Env; Variables: Variables }>();

settingsPublic.get("/", async (c) => {
  const db = c.get("db");

  const publicSettings = await db.query.settings.findMany({
    where: or(
      eq(settings.isPublic, true),
      eq(settings.category, "seo_pages")
    ),
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

  // Resolve address names from codes
  const provinceCode = settingsMap.organization_province_code as string | undefined;
  const regencyCode = settingsMap.organization_regency_code as string | undefined;
  const districtCode = settingsMap.organization_district_code as string | undefined;
  const villageCode = settingsMap.organization_village_code as string | undefined;

  if (provinceCode) {
    const row = await db.query.indonesiaProvinces.findFirst({
      where: eq(indonesiaProvinces.code, provinceCode),
      columns: { name: true },
    });
    if (row) settingsMap.organization_province_name = row.name;
  }
  if (regencyCode) {
    const row = await db.query.indonesiaRegencies.findFirst({
      where: eq(indonesiaRegencies.code, regencyCode),
      columns: { name: true },
    });
    if (row) settingsMap.organization_regency_name = row.name;
  }
  if (districtCode) {
    const row = await db.query.indonesiaDistricts.findFirst({
      where: eq(indonesiaDistricts.code, districtCode),
      columns: { name: true },
    });
    if (row) settingsMap.organization_district_name = row.name;
  }
  if (villageCode) {
    const row = await db.query.indonesiaVillages.findFirst({
      where: eq(indonesiaVillages.code, villageCode),
      columns: { name: true },
    });
    if (row) settingsMap.organization_village_name = row.name;
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
