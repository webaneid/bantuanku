import { Pool } from "pg";
import { readFile } from "fs/promises";

async function runMigration(filename: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const sql = await readFile(`./migrations/${filename}`, "utf-8");

  try {
    await pool.query(sql);
    console.log(`Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`Error running migration ${filename}:`, error);
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2] || "005_make_category_nullable.sql";
runMigration(migrationFile);
