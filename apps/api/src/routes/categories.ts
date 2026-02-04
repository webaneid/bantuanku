import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { categories } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const categoriesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

categoriesRoute.get("/", async (c) => {
  const db = c.get("db");

  const data = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: [asc(categories.sortOrder)],
    columns: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      color: true,
    },
  });

  return success(c, data);
});

export default categoriesRoute;
