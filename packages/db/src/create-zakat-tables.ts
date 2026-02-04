import pkg from "pg";
const { Pool } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createZakatTables() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  console.log("Creating zakat tables...");

  try {
    const sqlPath = path.join(__dirname, "..", "create-zakat-tables.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await pool.query(sql);

    console.log("✓ Zakat tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createZakatTables().catch(console.error);
