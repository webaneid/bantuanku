import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from packages/db/.env
config({ path: join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

const sql = postgres(connectionString);

async function verifyEmployeesTable() {
  try {
    console.log("🔍 Checking employees table columns...\n");

    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'employees'
      AND column_name IN ('address', 'detail_address', 'province_code', 'regency_code', 'district_code', 'village_code')
      ORDER BY column_name
    `;

    console.log("Columns found:");
    console.table(result);

    const hasLegacyAddress = result.some(r => r.column_name === 'address');
    const hasNewColumns = result.some(r => r.column_name === 'detail_address');

    if (hasLegacyAddress) {
      console.log("\n❌ Legacy 'address' column still exists!");
    } else {
      console.log("\n✅ Legacy 'address' column has been removed!");
    }

    if (hasNewColumns) {
      console.log("✅ New address system columns are present!");
    } else {
      console.log("❌ New address system columns are missing!");
    }

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    await sql.end();
    process.exit(1);
  }
}

verifyEmployeesTable();
