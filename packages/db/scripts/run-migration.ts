/**
 * Run SQL Migration
 *
 * This script runs a SQL migration file directly against the database.
 *
 * Usage: tsx scripts/run-migration.ts <migration-file>
 * Example: tsx scripts/run-migration.ts migrations/002-indonesia-address.sql
 */

import "dotenv/config";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error("❌ Please provide a migration file path");
    console.log("Usage: tsx scripts/run-migration.ts <migration-file>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const fullPath = path.join(process.cwd(), migrationFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`🔄 Running migration: ${migrationFile}\n`);

  const sql = fs.readFileSync(fullPath, "utf-8");
  const client = postgres(connectionString);

  try {
    await client.unsafe(sql);
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running migration:", error);
    throw error;
  } finally {
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
