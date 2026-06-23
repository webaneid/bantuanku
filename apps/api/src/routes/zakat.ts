import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import { mitra, settings, zakatPeriods, zakatTypes, zakatCalculatorConfigs } from "@bantuanku/db";
import { z } from "zod";
import { success, error } from "../lib/response";
import { optionalAuthMiddleware } from "../middleware/auth";
import { getGoldPrice, saveCalculationLog } from "../services/zakat";
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

  // Baca nisab dan rate dari zakatCalculatorConfigs; fallback ke default jika belum di-seed
  const maalConfig = await db.query.zakatCalculatorConfigs.findFirst({
    where: eq(zakatCalculatorConfigs.type, "maal"),
  });
  config.nisabGoldGrams = maalConfig?.nisabGoldGram ? parseFloat(maalConfig.nisabGoldGram as string) : 85;
  config.zakatMaalRateBps = maalConfig?.rateBps ?? 250;

  return success(c, config);
});

// GET /zakat/periods - Get active zakat periods
// Optional query: ?zakatTypeId=xxx to filter by zakat type
zakat.get("/periods", async (c) => {
  const db = c.get("db");
  const zakatTypeId = c.req.query("zakatTypeId");

  const conditions = [eq(zakatPeriods.status, "active")];
  if (zakatTypeId) {
    conditions.push(eq(zakatPeriods.zakatTypeId, zakatTypeId));
  }

  const periods = await db.query.zakatPeriods.findMany({
    where: and(...conditions),
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

// POST /zakat/calculate/maal — Hitung zakat maal & log hasilnya
const maalCalculateSchema = z.object({
  uangTunai: z.number().min(0).default(0),
  saham: z.number().min(0).default(0),
  realEstate: z.number().min(0).default(0),
  emas: z.number().min(0).default(0),
  kendaraan: z.number().min(0).default(0),
  hutang: z.number().min(0).default(0),
});

zakat.post("/calculate/maal", optionalAuthMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return error(c, "Body harus JSON", 400);
  }

  const parsed = maalCalculateSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, "Input tidak valid", 400, parsed.error.issues);
  }
  const input = parsed.data;

  const goldPrice = await getGoldPrice(db);
  const maalConfig = await db.query.zakatCalculatorConfigs.findFirst({
    where: eq(zakatCalculatorConfigs.type, "maal"),
  });

  const nisabGoldGram = maalConfig?.nisabGoldGram ? parseFloat(maalConfig.nisabGoldGram as string) : 85;
  const rateBps = maalConfig?.rateBps ?? 250;
  const nisabValue = Math.round(nisabGoldGram * goldPrice);

  const totalAssets = input.uangTunai + input.saham + input.realEstate + input.emas + input.kendaraan;
  const hartaBersih = totalAssets - input.hutang;
  const isWajib = hartaBersih >= nisabValue;
  const zakatTahunan = isWajib ? Math.floor((hartaBersih * rateBps) / 10000) : 0;
  const zakatBulanan = Math.floor(zakatTahunan / 12);

  await saveCalculationLog(
    db,
    {
      type: "maal",
      nisabValue,
      isAboveNisab: isWajib,
      zakatAmount: zakatTahunan,
      inputData: { ...input, totalAssets, hartaBersih },
    },
    user?.id,
  );

  return success(c, {
    goldPricePerGram: goldPrice,
    nisabGoldGram,
    nisabValue,
    totalAssets,
    hartaBersih,
    isWajib,
    zakatTahunan,
    zakatBulanan,
  });
});

export default zakat;
