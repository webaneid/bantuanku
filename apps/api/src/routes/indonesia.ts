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

const indonesia = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /indonesia/provinces
indonesia.get("/provinces", async (c) => {
  const db = c.get("db");

  const provinces = await db
    .select({
      code: indonesiaProvinces.code,
      name: indonesiaProvinces.name,
    })
    .from(indonesiaProvinces)
    .orderBy(indonesiaProvinces.name);

  return success(c, provinces);
});

// GET /indonesia/regencies/:provinceCode
indonesia.get("/regencies/:provinceCode", async (c) => {
  const provinceCode = c.req.param("provinceCode");
  const db = c.get("db");

  const regencies = await db
    .select({
      code: indonesiaRegencies.code,
      name: indonesiaRegencies.name,
      provinceCode: indonesiaRegencies.provinceCode,
    })
    .from(indonesiaRegencies)
    .where(eq(indonesiaRegencies.provinceCode, provinceCode))
    .orderBy(indonesiaRegencies.name);

  return success(c, regencies);
});

// GET /indonesia/districts/:regencyCode
indonesia.get("/districts/:regencyCode", async (c) => {
  const regencyCode = c.req.param("regencyCode");
  const db = c.get("db");

  const districts = await db
    .select({
      code: indonesiaDistricts.code,
      name: indonesiaDistricts.name,
      regencyCode: indonesiaDistricts.regencyCode,
    })
    .from(indonesiaDistricts)
    .where(eq(indonesiaDistricts.regencyCode, regencyCode))
    .orderBy(indonesiaDistricts.name);

  return success(c, districts);
});

// GET /indonesia/villages/:districtCode
indonesia.get("/villages/:districtCode", async (c) => {
  const districtCode = c.req.param("districtCode");
  const db = c.get("db");

  const villages = await db
    .select({
      code: indonesiaVillages.code,
      name: indonesiaVillages.name,
      districtCode: indonesiaVillages.districtCode,
    })
    .from(indonesiaVillages)
    .where(eq(indonesiaVillages.districtCode, districtCode))
    .orderBy(indonesiaVillages.name);

  return success(c, villages);
});

export default indonesia;
