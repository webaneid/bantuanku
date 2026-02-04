/**
 * Seed Indonesia Address Data
 *
 * This script populates indonesia_provinces, indonesia_regencies,
 * indonesia_districts, and indonesia_villages tables with data from idn-area-data package.
 *
 * Run: npm run seed:address
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/schema";
import { getProvinces, getRegencies, getDistricts, getVillages } from "idn-area-data";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🌱 Starting Indonesia address data seeding...\n");

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // 1. Seed Provinces
    console.log("📍 Seeding provinces...");
    const provinces = await getProvinces();
    const provincesData = provinces.map((p) => ({
      code: p.code,
      name: p.name,
    }));

    await db.insert(schema.indonesiaProvinces)
      .values(provincesData)
      .onConflictDoNothing();
    console.log(`✅ Seeded ${provincesData.length} provinces\n`);

    // 2. Seed Regencies
    console.log("🏙️  Seeding regencies...");
    const regencies = await getRegencies();
    const regenciesData = regencies.map((r) => ({
      code: r.code,
      provinceCode: r.province_code,
      name: r.name,
    }));

    // Batch insert for better performance (500 at a time)
    const batchSize = 500;
    for (let i = 0; i < regenciesData.length; i += batchSize) {
      const batch = regenciesData.slice(i, i + batchSize);
      await db.insert(schema.indonesiaRegencies)
        .values(batch)
        .onConflictDoNothing();
      console.log(`   Inserted ${i + batch.length}/${regenciesData.length}`);
    }
    console.log(`✅ Seeded ${regenciesData.length} regencies\n`);

    // 3. Seed Districts
    console.log("🗺️  Seeding districts...");
    const districts = await getDistricts();
    const districtsData = districts.map((d) => ({
      code: d.code,
      regencyCode: d.regency_code,
      name: d.name,
    }));

    for (let i = 0; i < districtsData.length; i += batchSize) {
      const batch = districtsData.slice(i, i + batchSize);
      await db.insert(schema.indonesiaDistricts)
        .values(batch)
        .onConflictDoNothing();
      console.log(`   Inserted ${i + batch.length}/${districtsData.length}`);
    }
    console.log(`✅ Seeded ${districtsData.length} districts\n`);

    // 4. Seed Villages
    console.log("🏘️  Seeding villages...");
    const villages = await getVillages();
    const villagesData = villages.map((v) => ({
      code: v.code,
      districtCode: v.district_code,
      name: v.name,
      postalCode: null, // Package doesn't provide postal codes
    }));

    for (let i = 0; i < villagesData.length; i += batchSize) {
      const batch = villagesData.slice(i, i + batchSize);
      await db.insert(schema.indonesiaVillages)
        .values(batch)
        .onConflictDoNothing();
      console.log(`   Inserted ${i + batch.length}/${villagesData.length}`);
    }
    console.log(`✅ Seeded ${villagesData.length} villages\n`);

    console.log("🎉 Seeding completed successfully!");
    console.log("\nSummary:");
    console.log(`- Provinces: ${provincesData.length}`);
    console.log(`- Regencies: ${regenciesData.length}`);
    console.log(`- Districts: ${districtsData.length}`);
    console.log(`- Villages: ${villagesData.length}`);

  } catch (error) {
    console.error("❌ Error seeding data:", error);
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
