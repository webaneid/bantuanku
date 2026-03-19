import { Hono } from "hono";
import { eq, and, or, desc, sql } from "drizzle-orm";
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

const reportSelectFields = {
  id: activityReports.id,
  slug: activityReports.slug,
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
  // SEO
  metaTitle: activityReports.metaTitle,
  metaDescription: activityReports.metaDescription,
  ogTitle: activityReports.ogTitle,
  ogDescription: activityReports.ogDescription,
  ogImageUrl: activityReports.ogImageUrl,
  noIndex: activityReports.noIndex,
  noFollow: activityReports.noFollow,
  canonicalUrl: activityReports.canonicalUrl,
  // Creator
  creatorName: users.name,
} as const;

const reportJoins = (query: any) =>
  query
    .leftJoin(indonesiaProvinces, eq(activityReports.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(activityReports.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(activityReports.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(activityReports.villageCode, indonesiaVillages.code))
    .leftJoin(users, eq(activityReports.createdBy, users.id));

// GET /activity-reports - List all published activity reports (public)
activityReportsPublic.get("/", async (c) => {
  const db = c.get("db");
  const limit = parseInt(c.req.query("limit") || "20");
  const page = parseInt(c.req.query("page") || "1");
  const referenceType = c.req.query("reference_type");
  const offset = (page - 1) * limit;

  const conditions = [eq(activityReports.status, "published")];
  if (referenceType) {
    conditions.push(eq(activityReports.referenceType, referenceType));
  }

  const query = db
    .select(reportSelectFields)
    .from(activityReports);

  const results = await reportJoins(query)
    .where(and(...conditions))
    .orderBy(desc(activityReports.activityDate))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityReports)
    .where(and(...conditions));

  return success(c, {
    data: results,
    pagination: {
      page,
      limit,
      total: countResult.count,
      totalPages: Math.ceil(countResult.count / limit),
    },
  });
});

// GET /activity-reports/by-slug/:slug - Get a single published activity report by slug
activityReportsPublic.get("/by-slug/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");

  const query = db
    .select(reportSelectFields)
    .from(activityReports);

  const results = await reportJoins(query)
    .where(and(eq(activityReports.slug, slug), eq(activityReports.status, "published")))
    .limit(1);

  if (!results || results.length === 0) {
    return error(c, "Activity report not found", 404);
  }

  return success(c, results[0]);
});

// GET /activity-reports/:id - Get a single published activity report by ID (public)
activityReportsPublic.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const query = db
    .select(reportSelectFields)
    .from(activityReports);

  const results = await reportJoins(query)
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

  const query = db
    .select({
      id: activityReports.id,
      slug: activityReports.slug,
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
    .from(activityReports);

  const results = await reportJoins(query)
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
