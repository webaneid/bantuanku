import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { pages, settings } from "@bantuanku/db";
import { success, error } from "../lib/response";
import type { Env, Variables } from "../types";

const pagesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

pagesRoute.get("/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");

  const page = await db.query.pages.findFirst({
    where: eq(pages.slug, slug),
    columns: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      publishedAt: true,
    },
  });

  if (!page || !page.publishedAt) {
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
      excerpt: true,
    },
  });

  return success(c, allPages);
});

export default pagesRoute;
