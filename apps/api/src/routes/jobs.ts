import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { jobCategories, jobTitles } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const jobs = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /jobs/categories - Get all job categories with their titles
jobs.get("/categories", async (c) => {
  const db = c.get("db");

  const categories = await db
    .select({
      id: jobCategories.id,
      name: jobCategories.name,
      displayOrder: jobCategories.displayOrder,
    })
    .from(jobCategories)
    .where(eq(jobCategories.isActive, true))
    .orderBy(asc(jobCategories.displayOrder));

  const titles = await db
    .select({
      id: jobTitles.id,
      categoryId: jobTitles.categoryId,
      name: jobTitles.name,
      isPopular: jobTitles.isPopular,
    })
    .from(jobTitles)
    .where(eq(jobTitles.isActive, true))
    .orderBy(asc(jobTitles.name));

  // Group titles by category
  const result = categories.map((cat) => ({
    ...cat,
    titles: titles.filter((t) => t.categoryId === cat.id),
  }));

  return success(c, result);
});

export default jobs;
