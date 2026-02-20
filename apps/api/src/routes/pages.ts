import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { pages } from "@bantuanku/db";
import { success, error } from "../lib/response";
import type { Env, Variables } from "../types";

const pagesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

pagesRoute.get("/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");

  const page = await db.query.pages.findFirst({
    where: and(eq(pages.slug, slug), eq(pages.isPublished, true)),
    columns: {
      id: true,
      slug: true,
      title: true,
      featureImageUrl: true,
      content: true,
      excerpt: true,
      publishedAt: true,
      updatedAt: true,
      // SEO fields
      metaTitle: true,
      metaDescription: true,
      focusKeyphrase: true,
      canonicalUrl: true,
      noIndex: true,
      noFollow: true,
      ogTitle: true,
      ogDescription: true,
      ogImageUrl: true,
      seoScore: true,
    },
  });

  if (!page) {
    return error(c, "Page not found", 404);
  }

  return success(c, page);
});

pagesRoute.get("/", async (c) => {
  const db = c.get("db");

  const allPages = await db.query.pages.findMany({
    where: eq(pages.isPublished, true),
    columns: {
      id: true,
      slug: true,
      title: true,
      featureImageUrl: true,
      excerpt: true,
    },
  });

  return success(c, allPages);
});

export default pagesRoute;
