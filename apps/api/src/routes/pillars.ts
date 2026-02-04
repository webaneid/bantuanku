import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { pillars } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const pillarsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

pillarsRoute.get("/", async (c) => {
  const db = c.get("db");

  const data = await db.query.pillars.findMany({
    where: eq(pillars.isActive, true),
    orderBy: [asc(pillars.sortOrder)],
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

export default pillarsRoute;
