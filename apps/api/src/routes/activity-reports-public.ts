import { Hono } from "hono";
import { eq, and, or, desc } from "drizzle-orm";
import {
  activityReports,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  users,
} from "@bantuanku/db";
import { success, error } from "../lib/response";
import type { Env, Variables } from "../types";

const activityReportsPublic = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /activity-reports/:id - Get a single published activity report (public)
activityReportsPublic.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const results = await db
    .select({
      id: activityReports.id,
      referenceType: activityReports.referenceType,
      referenceName: activityReports.referenceName,
      title: activityReports.title,
      activityDate: activityReports.activityDate,
      description: activityReports.description,
      gallery: activityReports.gallery,
      videoUrl: activityReports.videoUrl,
      typeSpecificData: activityReports.typeSpecificData,
      status: activityReports.status,
      publishedAt: activityReports.publishedAt,
      createdAt: activityReports.createdAt,
      // Address
      detailAddress: activityReports.detailAddress,
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      // Creator
      creatorName: users.name,
    })
    .from(activityReports)
    .leftJoin(indonesiaProvinces, eq(activityReports.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(activityReports.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(activityReports.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(activityReports.villageCode, indonesiaVillages.code))
    .leftJoin(users, eq(activityReports.createdBy, users.id))
    .where(and(eq(activityReports.id, id), eq(activityReports.status, "published")))
    .limit(1);

  if (!results || results.length === 0) {
    return error(c, "Activity report not found", 404);
  }

  return success(c, results[0]);
});

// GET /activity-reports/campaign/:campaignId - Get published activity reports for a campaign (public)
activityReportsPublic.get("/campaign/:campaignId", async (c) => {
  const db = c.get("db");
  const campaignId = c.req.param("campaignId");
  const limit = parseInt(c.req.query("limit") || "50");
  const page = parseInt(c.req.query("page") || "1");
  const offset = (page - 1) * limit;

  const results = await db
    .select({
      id: activityReports.id,
      title: activityReports.title,
      description: activityReports.description,
      activityDate: activityReports.activityDate,
      gallery: activityReports.gallery,
      videoUrl: activityReports.videoUrl,
      typeSpecificData: activityReports.typeSpecificData,
      createdAt: activityReports.createdAt,
      // Address
      detailAddress: activityReports.detailAddress,
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
    })
    .from(activityReports)
    .leftJoin(indonesiaProvinces, eq(activityReports.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(activityReports.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(activityReports.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(activityReports.villageCode, indonesiaVillages.code))
    .where(
      and(
        eq(activityReports.status, "published"),
        or(
          and(
            eq(activityReports.referenceType, "campaign"),
            eq(activityReports.referenceId, campaignId)
          ),
          eq(activityReports.campaignId, campaignId)
        )
      )
    )
    .orderBy(desc(activityReports.activityDate))
    .limit(limit)
    .offset(offset);

  return success(c, results);
});

export default activityReportsPublic;
