import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
} from "@bantuanku/db";
import type { Env, Variables } from "../../types";

const address = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all provinces
address.get("/provinces", async (c) => {
  try {
    const db = c.get("db");
    const provinces = await db
      .select({
        code: indonesiaProvinces.code,
        name: indonesiaProvinces.name,
      })
      .from(indonesiaProvinces)
      .orderBy(indonesiaProvinces.name);

    return c.json({
      success: true,
      data: provinces,
    });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch provinces",
      },
      500
    );
  }
});

// Get regencies by province code
address.get("/regencies/:provinceCode", async (c) => {
  try {
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

    return c.json({
      success: true,
      data: regencies,
    });
  } catch (error) {
    console.error("Error fetching regencies:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch regencies",
      },
      500
    );
  }
});

// Get districts by regency code
address.get("/districts/:regencyCode", async (c) => {
  try {
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

    return c.json({
      success: true,
      data: districts,
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch districts",
      },
      500
    );
  }
});

// Get villages by district code
address.get("/villages/:districtCode", async (c) => {
  try {
    const districtCode = c.req.param("districtCode");
    const db = c.get("db");

    const villages = await db
      .select({
        code: indonesiaVillages.code,
        name: indonesiaVillages.name,
        districtCode: indonesiaVillages.districtCode,
        postalCode: indonesiaVillages.postalCode,
      })
      .from(indonesiaVillages)
      .where(eq(indonesiaVillages.districtCode, districtCode))
      .orderBy(indonesiaVillages.name);

    return c.json({
      success: true,
      data: villages,
    });
  } catch (error) {
    console.error("Error fetching villages:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch villages",
      },
      500
    );
  }
});

// Get complete address by village code (includes province, regency, district)
address.get("/complete/:villageCode", async (c) => {
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
      return c.json(
        {
          success: false,
          message: "Village not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error fetching complete address:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch complete address",
      },
      500
    );
  }
});

export default address;
