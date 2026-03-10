import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { incomeRanges } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const incomeRangesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /income-ranges - Public list of active income ranges
incomeRangesRoute.get("/", async (c) => {
  const db = c.get("db");

  const data = await db
    .select({
      id: incomeRanges.id,
      label: incomeRanges.label,
      displayOrder: incomeRanges.displayOrder,
    })
    .from(incomeRanges)
    .where(eq(incomeRanges.isActive, true))
    .orderBy(asc(incomeRanges.displayOrder));

  return success(c, data);
});

export default incomeRangesRoute;
