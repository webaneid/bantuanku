import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema/index.ts";
import { createId } from "./utils.ts";

async function seedZakatCOA() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Seeding Zakat COA accounts...");

  const zakatCOA = [
    // INCOME - Pendapatan Zakat (62xx series)
    {
      code: "6200",
      name: "Pendapatan Zakat",
      type: "income",
      category: "zakat",
      normalBalance: "credit",
      level: 2,
      isSystem: true,
      description: "Header untuk semua pendapatan zakat"
    },
    {
      code: "6201",
      name: "Pendapatan Zakat Maal",
      type: "income",
      category: "zakat",
      normalBalance: "credit",
      level: 3,
      isSystem: true,
      description: "Pendapatan dari zakat harta (maal)"
    },
    {
      code: "6202",
      name: "Pendapatan Zakat Fitrah",
      type: "income",
      category: "zakat",
      normalBalance: "credit",
      level: 3,
      isSystem: true,
      description: "Pendapatan dari zakat fitrah"
    },
    {
      code: "6203",
      name: "Pendapatan Zakat Profesi",
      type: "income",
      category: "zakat",
      normalBalance: "credit",
      level: 3,
      isSystem: true,
      description: "Pendapatan dari zakat penghasilan/profesi"
    },
    {
      code: "6204",
      name: "Pendapatan Zakat Pertanian",
      type: "income",
      category: "zakat",
      normalBalance: "credit",
      level: 3,
      isSystem: true,
      description: "Pendapatan dari zakat hasil pertanian"
    },
    {
      code: "6205",
      name: "Pendapatan Zakat Peternakan",
      type: "income",
      category: "zakat",
      normalBalance: "credit",
      level: 3,
      isSystem: true,
      description: "Pendapatan dari zakat hewan ternak"
    },

    // EXPENSE - Penyaluran Zakat (72xx series)
    {
      code: "7200",
      name: "Penyaluran Zakat",
      type: "expense",
      category: "zakat_distribution",
      normalBalance: "debit",
      level: 2,
      isSystem: true,
      description: "Header untuk semua penyaluran zakat ke 8 asnaf"
    },
    {
      code: "7201",
      name: "Penyaluran Zakat Maal",
      type: "expense",
      category: "zakat_distribution",
      normalBalance: "debit",
      level: 3,
      isSystem: true,
      description: "Penyaluran zakat maal kepada mustahik"
    },
    {
      code: "7202",
      name: "Penyaluran Zakat Fitrah",
      type: "expense",
      category: "zakat_distribution",
      normalBalance: "debit",
      level: 3,
      isSystem: true,
      description: "Penyaluran zakat fitrah kepada mustahik"
    },
    {
      code: "7203",
      name: "Penyaluran Zakat Profesi",
      type: "expense",
      category: "zakat_distribution",
      normalBalance: "debit",
      level: 3,
      isSystem: true,
      description: "Penyaluran zakat profesi kepada mustahik"
    },
    {
      code: "7204",
      name: "Penyaluran Zakat Pertanian",
      type: "expense",
      category: "zakat_distribution",
      normalBalance: "debit",
      level: 3,
      isSystem: true,
      description: "Penyaluran zakat pertanian kepada mustahik"
    },
    {
      code: "7205",
      name: "Penyaluran Zakat Peternakan",
      type: "expense",
      category: "zakat_distribution",
      normalBalance: "debit",
      level: 3,
      isSystem: true,
      description: "Penyaluran zakat peternakan kepada mustahik"
    },
  ];

  for (const acc of zakatCOA) {
    await db.insert(schema.chartOfAccounts).values({ id: createId(), ...acc }).onConflictDoNothing();
    console.log(`✓ ${acc.code} - ${acc.name}`);
  }

  console.log("\nZakat COA seeding complete!");
  console.log("Income accounts: 6200-6205 (6 accounts)");
  console.log("Expense accounts: 7200-7205 (6 accounts)");

  await pool.end();
}

export { seedZakatCOA };

seedZakatCOA().catch(console.error);
