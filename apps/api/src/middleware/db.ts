import { createMiddleware } from "hono/factory";
import { createDb } from "@bantuanku/db";
import type { Env, Variables } from "../types";

export const dbMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    // Support both Cloudflare Workers (c.env) and Node.js (process.env)
    const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL || "";
    const db = createDb(databaseUrl);
    c.set("db", db);
    await next();
  }
);
