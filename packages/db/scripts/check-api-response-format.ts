import postgres from "postgres";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "../.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function checkApiResponseFormat() {
  try {
    // Query employee Reza Alfarabi - simulating API response
    const result = await sql`
      SELECT
        e.id,
        e.name,
        e.detail_address as "detailAddress",
        e.province_code as "provinceCode",
        e.regency_code as "regencyCode",
        e.district_code as "districtCode",
        e.village_code as "villageCode",
        p.name as "provinceName",
        r.name as "regencyName",
        d.name as "districtName",
        v.name as "villageName",
        v.postal_code as "villagePostalCode"
      FROM employees e
      LEFT JOIN indonesia_provinces p ON e.province_code = p.code
      LEFT JOIN indonesia_regencies r ON e.regency_code = r.code
      LEFT JOIN indonesia_districts d ON e.district_code = d.code
      LEFT JOIN indonesia_villages v ON e.village_code = v.code
      WHERE e.id = 'ryxnahthp2oxtbmea56zj'
    `;

    console.log("🔍 API Response Format (what frontend should receive):");
    console.log(JSON.stringify(result[0], null, 2));

    console.log("\n📋 Address Fields Check:");
    console.log("detailAddress:", result[0].detailAddress);
    console.log("provinceCode:", result[0].provinceCode);
    console.log("regencyCode:", result[0].regencyCode);
    console.log("districtCode:", result[0].districtCode);
    console.log("villageCode:", result[0].villageCode);

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    await sql.end();
    process.exit(1);
  }
}

checkApiResponseFormat();
