import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
} from "@bantuanku/db";
import { success, error } from "../lib/response";
import type { Env, Variables } from "../types";

const addressPublic = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get complete address by village code (public endpoint)
addressPublic.get("/complete/:villageCode", async (c) => {
  try {
    const villageCode = c.req.param("villageCode");
    const db = c.get("db");

    const result = await db
      .select({
        village: {
          code: indonesiaVillages.code,
          name: indonesiaVillages.name,
          postalCode: indonesiaVillages.postalCode,
        },
        district: {
          code: indonesiaDistricts.code,
          name: indonesiaDistricts.name,
        },
        regency: {
          code: indonesiaRegencies.code,
          name: indonesiaRegencies.name,
        },
        province: {
          code: indonesiaProvinces.code,
          name: indonesiaProvinces.name,
        },
      })
      .from(indonesiaVillages)
      .innerJoin(
        indonesiaDistricts,
        eq(indonesiaVillages.districtCode, indonesiaDistricts.code)
      )
      .innerJoin(
        indonesiaRegencies,
        eq(indonesiaDistricts.regencyCode, indonesiaRegencies.code)
      )
      .innerJoin(
        indonesiaProvinces,
        eq(indonesiaRegencies.provinceCode, indonesiaProvinces.code)
      )
      .where(eq(indonesiaVillages.code, villageCode))
      .limit(1);

    if (result.length === 0) {
      return error(c, "Village not found", 404);
    }

    return success(c, result[0]);
  } catch (err) {
    console.error("Error fetching complete address:", err);
    return error(c, "Failed to fetch complete address", 500);
  }
});

export default addressPublic;
