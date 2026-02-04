import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  // Use local PostgreSQL for development (localhost)
  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    const pool = new Pool({ connectionString: databaseUrl });
    return drizzlePg(pool, { schema });
  }

  // Use Neon HTTP for production (Cloudflare Workers)
  const sql = neon(databaseUrl);
  return drizzleNeon(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
