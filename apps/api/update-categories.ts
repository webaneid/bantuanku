import { Pool } from "pg";
import { readFile } from "fs/promises";

async function updateCategories() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  const sql = await readFile("./migrations/004_update_categories.sql", "utf-8");

  try {
    await pool.query(sql);
    console.log("Categories updated successfully");
  } catch (error) {
    console.error("Error updating categories:", error);
  } finally {
    await pool.end();
  }
}

updateCategories();
