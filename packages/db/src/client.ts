import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema";

// Helper whose return type carries the full schema info
function initDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return { db: drizzle(pool, { schema }), pool };
}

type DbInstance = ReturnType<typeof initDb>;

let instance: DbInstance | null = null;

export function createDb(databaseUrl: string) {
  if (instance) return instance.db;
  instance = initDb(databaseUrl);
  return instance.db;
}

export function closeDb() {
  if (instance) {
    instance.pool.end();
    instance = null;
  }
}

export type Database = ReturnType<typeof initDb>["db"];
