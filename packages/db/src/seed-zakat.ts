import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema/index.ts";
import { createId } from "./utils.ts";

async function seedZakat() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Seeding zakat types...");

  const zakatTypesData = [
    {
      id: createId(),
      name: "Zakat Maal",
      slug: "zakat-maal",
      description: "Zakat atas harta yang tersimpan selama 1 tahun hijriyah (uang, emas, perak, saham, perdagangan)",
      icon: "💰",
      hasCalculator: true,
      isActive: true,
      displayOrder: 1,
    },
    {
      id: createId(),
      name: "Zakat Fitrah",
      slug: "zakat-fitrah",
      description: "Zakat yang wajib dikeluarkan sebelum Sholat Idul Fitri sebesar 2.5 kg atau 3.5 liter beras per jiwa",
      icon: "🌾",
      hasCalculator: true,
      isActive: true,
      displayOrder: 2,
    },
    {
      id: createId(),
      name: "Zakat Profesi",
      slug: "zakat-profesi",
      description: "Zakat atas penghasilan dari pekerjaan/profesi seperti gaji, honorarium, atau pendapatan lainnya",
      icon: "💼",
      hasCalculator: true,
      isActive: true,
      displayOrder: 3,
    },
    {
      id: createId(),
      name: "Zakat Pertanian",
      slug: "zakat-pertanian",
      description: "Zakat atas hasil pertanian (padi, gandum, kurma, dll) sebesar 5% atau 10% tergantung sistem pengairan",
      icon: "🌾",
      hasCalculator: true,
      isActive: true,
      displayOrder: 4,
    },
    {
      id: createId(),
      name: "Zakat Peternakan",
      slug: "zakat-peternakan",
      description: "Zakat atas hewan ternak (sapi, kambing, unta) yang telah mencapai nisab dan haul",
      icon: "🐄",
      hasCalculator: true,
      isActive: true,
      displayOrder: 5,
    },
  ];

  for (const type of zakatTypesData) {
    await db.insert(schema.zakatTypes).values(type).onConflictDoNothing();
    console.log(`✓ Seeded: ${type.name}`);
  }

  console.log("\nZakat types seeding complete!");
  console.log(`Total: ${zakatTypesData.length} types`);
  console.log(`Active: 5 (Maal, Fitrah, Profesi, Pertanian, Peternakan)`);
  console.log(`All types now have calculators enabled`);

  await pool.end();
}

export { seedZakat };

seedZakat().catch(console.error);
