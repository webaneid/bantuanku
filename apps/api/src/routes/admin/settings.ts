import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const settingsAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

settingsAdmin.get("/", requireRole("super_admin"), async (c) => {
  const db = c.get("db");

  const data = await db.query.settings.findMany({
    orderBy: [desc(settings.updatedAt)],
  });

  const grouped = data.reduce(
    (acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    },
    {} as Record<string, typeof data>
  );

  return success(c, grouped);
});

settingsAdmin.get("/:key", requireRole("super_admin"), async (c) => {
  const db = c.get("db");
  const key = c.req.param("key");

  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });

  if (!setting) {
    return error(c, "Setting not found", 404);
  }

  return success(c, setting);
});

const updateSettingSchema = z.object({
  value: z.string(),
});

settingsAdmin.patch("/:key", requireRole("super_admin"), zValidator("json", updateSettingSchema), async (c) => {
  const db = c.get("db");
  const key = c.req.param("key");
  const { value } = c.req.valid("json");
  const user = c.get("user");

  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });

  if (!setting) {
    return error(c, "Setting not found", 404);
  }

  await db
    .update(settings)
    .set({
      value,
      updatedBy: user!.id,
      updatedAt: new Date(),
    })
    .where(eq(settings.key, key));

  return success(c, null, "Setting updated");
});

const createSettingSchema = z.object({
  key: z.string().min(2),
  value: z.string(),
  category: z.string(),
  type: z.enum(["string", "number", "boolean", "json"]),
  label: z.string(),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

settingsAdmin.post("/", requireRole("super_admin"), zValidator("json", createSettingSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  const user = c.get("user");

  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, body.key),
  });

  if (existing) {
    return error(c, "Setting with this key already exists", 400);
  }

  await db.insert(settings).values({
    ...body,
    updatedBy: user!.id,
  });

  return success(c, null, "Setting created", 201);
});

settingsAdmin.delete("/:key", requireRole("super_admin"), async (c) => {
  const db = c.get("db");
  const key = c.req.param("key");

  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });

  if (!setting) {
    return error(c, "Setting not found", 404);
  }

  await db.delete(settings).where(eq(settings.key, key));

  return success(c, null, "Setting deleted");
});

// Batch update/create settings
const batchUpdateSettingsSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
    category: z.string(),
    type: z.enum(["string", "number", "boolean", "json"]).optional().default("string"),
    label: z.string(),
    description: z.string().optional(),
    isPublic: z.boolean().optional().default(false),
  })
);

settingsAdmin.put("/batch", requireRole("super_admin"), zValidator("json", batchUpdateSettingsSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  const user = c.get("user");

  // Process each setting - update if exists, create if not
  for (const settingData of body) {
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, settingData.key),
    });

    if (existing) {
      // Update existing setting
      await db
        .update(settings)
        .set({
          value: settingData.value,
          label: settingData.label,
          description: settingData.description,
          category: settingData.category,
          type: settingData.type,
          isPublic: settingData.isPublic,
          updatedBy: user!.id,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, settingData.key));
    } else {
      // Create new setting
      await db.insert(settings).values({
        key: settingData.key,
        value: settingData.value,
        label: settingData.label,
        description: settingData.description,
        category: settingData.category,
        type: settingData.type || "string",
        isPublic: settingData.isPublic || false,
        updatedBy: user!.id,
      });
    }
  }

  return success(c, null, "Settings updated successfully");
});

// Auto-update gold price from Pluang scraper
settingsAdmin.post("/auto-update-gold-price", requireRole("super_admin"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  try {
    console.log("🚀 Starting gold price auto-update...");

    // Fetch from Pluang
    const response = await fetch("https://pluang.com/asset/gold", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Bantuanku/1.0)"
      }
    });

    if (!response.ok) {
      return error(c, `Failed to fetch Pluang: HTTP ${response.status}`, 500);
    }

    const html = await response.text();

    // Extract __NEXT_DATA__
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) {
      return error(c, "__NEXT_DATA__ not found in response", 500);
    }

    const nextData = JSON.parse(match[1]);
    const performance = nextData?.props?.pageProps?.goldAssetPerformance;
    const currentPriceText = performance?.currentMidPrice;

    if (!currentPriceText) {
      return error(c, "currentMidPrice not found", 500);
    }

    // Convert "Rp2.735.207" to 2735207
    const numericPrice = Number(currentPriceText.replace(/[^0-9]/g, ""));

    console.log(`💰 Gold price fetched: ${currentPriceText} = ${numericPrice}`);

    // Update database
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, "zakat_gold_price"),
    });

    if (existing) {
      await db
        .update(settings)
        .set({
          value: numericPrice.toString(),
          updatedBy: user!.id,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "zakat_gold_price"));
    } else {
      await db.insert(settings).values({
        key: "zakat_gold_price",
        value: numericPrice.toString(),
        category: "zakat",
        type: "number",
        label: "Harga Emas",
        description: "Harga emas per gram dalam Rupiah (auto-updated dari Pluang)",
        updatedBy: user!.id,
      });
    }

    return success(c, {
      priceText: currentPriceText,
      priceNumber: numericPrice,
      updatedAt: new Date().toISOString(),
    }, "Harga emas berhasil diperbarui dari Pluang");
  } catch (err: any) {
    console.error("❌ Auto-update gold price failed:", err);
    return error(c, err.message || "Failed to update gold price", 500);
  }
});

// Auto-update silver price from Pluang + ExchangeRate-API
settingsAdmin.post("/auto-update-silver-price", requireRole("super_admin"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  try {
    console.log("🚀 Starting silver price auto-update...");

    // Step 1: Fetch silver price from Pluang (in USD)
    const pluangResponse = await fetch("https://pluang.com/explore/metals-plus/silver", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Bantuanku/1.0)"
      }
    });

    if (!pluangResponse.ok) {
      return error(c, `Failed to fetch Pluang: HTTP ${pluangResponse.status}`, 500);
    }

    const html = await pluangResponse.text();

    // Extract __NEXT_DATA__
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) {
      return error(c, "__NEXT_DATA__ not found in response", 500);
    }

    const nextData = JSON.parse(match[1]);
    const marketOverview = nextData?.props?.pageProps?.marketOverviewResult;
    const assetCategories = marketOverview?.assetCategoryData;

    // Find silver price in market overview
    let silverPriceUSD = 0;
    let silverPriceText = "";

    if (assetCategories && Array.isArray(assetCategories)) {
      for (const category of assetCategories) {
        const assets = category.assets || [];
        const silverData = assets.find((item: any) =>
          item.name?.toLowerCase().includes("silver")
        );

        if (silverData) {
          silverPriceText = silverData.formattedValue; // e.g., "$95,08"
          // Extract numeric value from "$95,08" -> 95.08
          silverPriceUSD = Number(silverPriceText.replace(/[^0-9.,]/g, "").replace(",", "."));
          break;
        }
      }
    }

    if (!silverPriceUSD) {
      return error(c, "Silver price not found in market overview", 500);
    }

    console.log(`💵 Silver price (USD): ${silverPriceText} = $${silverPriceUSD}`);

    // Step 2: Fetch USD/IDR exchange rate
    const exchangeResponse = await fetch("https://api.exchangerate-api.com/v4/latest/USD");

    if (!exchangeResponse.ok) {
      return error(c, `Failed to fetch exchange rate: HTTP ${exchangeResponse.status}`, 500);
    }

    const exchangeData = await exchangeResponse.json();
    const usdToIdr = exchangeData.rates?.IDR;

    if (!usdToIdr) {
      return error(c, "IDR exchange rate not found", 500);
    }

    console.log(`💱 Exchange rate: 1 USD = ${usdToIdr.toLocaleString('id-ID')} IDR`);

    // Step 3: Convert to IDR per gram
    // Silver futures price is per troy ounce
    // 1 troy ounce = 31.1034768 grams
    const TROY_OZ_TO_GRAMS = 31.1034768;
    const silverPriceIDRPerOunce = silverPriceUSD * usdToIdr;
    const silverPriceIDRPerGram = Math.round(silverPriceIDRPerOunce / TROY_OZ_TO_GRAMS);

    console.log(`🥈 Silver price (IDR/gram): Rp${silverPriceIDRPerGram.toLocaleString('id-ID')}`);

    // Step 4: Update database
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, "zakat_silver_price"),
    });

    if (existing) {
      await db
        .update(settings)
        .set({
          value: silverPriceIDRPerGram.toString(),
          updatedBy: user!.id,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "zakat_silver_price"));
    } else {
      await db.insert(settings).values({
        key: "zakat_silver_price",
        value: silverPriceIDRPerGram.toString(),
        category: "zakat",
        type: "number",
        label: "Harga Perak",
        description: "Harga perak per gram dalam Rupiah (auto-updated dari Pluang + ExchangeRate-API)",
        updatedBy: user!.id,
      });
    }

    return success(c, {
      silverPriceUSD,
      silverPriceText,
      exchangeRate: usdToIdr,
      pricePerGram: silverPriceIDRPerGram,
      priceText: `Rp${silverPriceIDRPerGram.toLocaleString('id-ID')}`,
      updatedAt: new Date().toISOString(),
    }, "Harga perak berhasil diperbarui dari Pluang + ExchangeRate-API");
  } catch (err: any) {
    console.error("❌ Auto-update silver price failed:", err);
    return error(c, err.message || "Failed to update silver price", 500);
  }
});

// GET /admin/settings/public/bank-accounts - Get bank accounts (accessible to all admin roles)
settingsAdmin.get("/public/bank-accounts", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");

  const bankSetting = await db.query.settings.findFirst({
    where: eq(settings.key, "payment_bank_accounts"),
  });

  if (!bankSetting?.value) {
    return success(c, []);
  }

  try {
    const banks = JSON.parse(bankSetting.value);
    return success(c, banks);
  } catch (error) {
    return success(c, []);
  }
});

export default settingsAdmin;
