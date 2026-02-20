import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import { mitra, settings, zakatPeriods, zakatTypes } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const zakat = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /zakat/config - Public endpoint
zakat.get("/config", async (c) => {
  const db = c.get("db");

  // Fetch zakat-related settings
  const allSettings = await db.query.settings.findMany({
    where: eq(settings.category, "zakat"),
  });

  const config: Record<string, any> = {
    zakatFitrahPerPerson: 50000, // Default fallback
    goldPricePerGram: 1200000,
    ricePricePerKg: 15000,
    fidyahPerDay: 50000,
  };

  // Map settings to config
  allSettings.forEach((setting) => {
    const value = parseFloat(setting.value) || setting.value;

    switch (setting.key) {
      case "zakat_fitrah_amount":
        config.zakatFitrahPerPerson = value;
        break;
      case "zakat_gold_price":
        config.goldPricePerGram = value;
        break;
      case "zakat_rice_price":
        config.ricePricePerKg = value;
        break;
      case "zakat_fidyah_amount":
        config.fidyahPerDay = value;
        break;
    }
  });

  return success(c, config);
});

// GET /zakat/periods - Get active zakat periods
zakat.get("/periods", async (c) => {
  const db = c.get("db");

  const periods = await db.query.zakatPeriods.findMany({
    where: eq(zakatPeriods.status, "active"),
    orderBy: [desc(zakatPeriods.year)],
  });

  return success(c, periods);
});

// GET /zakat/types - Get active zakat types
zakat.get("/types", async (c) => {
  const db = c.get("db");

  const types = await db.query.zakatTypes.findMany({
    where: eq(zakatTypes.isActive, true),
    orderBy: [zakatTypes.displayOrder],
  });

  const creatorUserIds = Array.from(
    new Set(
      types
        .map((type) => type.createdBy)
        .filter((createdBy): createdBy is string => !!createdBy)
    )
  );

  const mitraByUserId = new Map<string, { name: string; slug: string | null; logoUrl: string | null }>();

  if (creatorUserIds.length > 0) {
    const mitraRows = await db
      .select({
        userId: mitra.userId,
        name: mitra.name,
        slug: mitra.slug,
        logoUrl: mitra.logoUrl,
      })
      .from(mitra)
      .where(inArray(mitra.userId, creatorUserIds));

    for (const row of mitraRows) {
      if (!row.userId) continue;
      mitraByUserId.set(row.userId, {
        name: row.name,
        slug: row.slug,
        logoUrl: row.logoUrl,
      });
    }
  }

  const enrichedTypes = types.map((type) => {
    const mitraOwner = type.createdBy ? mitraByUserId.get(type.createdBy) : undefined;

    return {
      ...type,
      ownerType: mitraOwner ? "mitra" : "organization",
      ownerName: mitraOwner?.name ?? null,
      ownerSlug: mitraOwner?.slug ?? null,
      ownerLogoUrl: mitraOwner?.logoUrl ?? null,
    };
  });

  return success(c, enrichedTypes);
});

export default zakat;
