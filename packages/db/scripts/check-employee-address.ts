import postgres from "postgres";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(connectionString);

async function checkEmployeeAddress() {
  try {
    console.log("🔍 Checking latest employee address data...\n");

    // Get latest employee
    const result = await sql`
      SELECT
        e.id,
        e.name,
        e.detail_address,
        e.province_code,
        e.regency_code,
        e.district_code,
        e.village_code,
        p.name as province_name,
        r.name as regency_name,
        d.name as district_name,
        v.name as village_name,
        v.postal_code
      FROM employees e
      LEFT JOIN indonesia_provinces p ON e.province_code = p.code
      LEFT JOIN indonesia_regencies r ON e.regency_code = r.code
      LEFT JOIN indonesia_districts d ON e.district_code = d.code
      LEFT JOIN indonesia_villages v ON e.village_code = v.code
      ORDER BY e.created_at DESC
      LIMIT 3
    `;

    if (result.length === 0) {
      console.log("No employees found");
      await sql.end();
      return;
    }

    console.log("Latest employees:");
    result.forEach((emp, index) => {
      console.log(`\n${index + 1}. ${emp.name} (${emp.id})`);
      console.log("   Address Details:");
      console.log("   - Detail Address:", emp.detail_address || "(kosong)");
      console.log("   - Province Code:", emp.province_code || "(kosong)");
      console.log("   - Province Name:", emp.province_name || "(kosong)");
      console.log("   - Regency Code:", emp.regency_code || "(kosong)");
      console.log("   - Regency Name:", emp.regency_name || "(kosong)");
      console.log("   - District Code:", emp.district_code || "(kosong)");
      console.log("   - District Name:", emp.district_name || "(kosong)");
      console.log("   - Village Code:", emp.village_code || "(kosong)");
      console.log("   - Village Name:", emp.village_name || "(kosong)");
      console.log("   - Postal Code:", emp.postal_code || "(kosong)");
    });

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    await sql.end();
    process.exit(1);
  }
}

checkEmployeeAddress();
