import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./src/schema/index.js";
import { createId } from "./src/index.js";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function seedCOA() {
  console.log("Seeding chart of accounts...");

  const coaData = [
    // ASSETS (1xxx)
    { code: "1000", name: "Aset", type: "asset", category: "header", normalBalance: "debit", level: 1, isSystem: true, description: "Aset / Harta" },
    { code: "1100", name: "Aset Lancar", type: "asset", category: "current_asset", normalBalance: "debit", parentId: null, level: 2, isSystem: true },
    { code: "1010", name: "Kas", type: "asset", category: "cash", normalBalance: "debit", parentId: null, level: 3, isSystem: true },
    { code: "1020", name: "Bank - Operasional", type: "asset", category: "bank", normalBalance: "debit", parentId: null, level: 3, isSystem: true, description: "Rekening bank operasional (semua bank)" },
    { code: "1130", name: "Piutang", type: "asset", category: "receivable", normalBalance: "debit", parentId: null, level: 3, isSystem: true },

    // LIABILITIES (2xxx)
    { code: "2000", name: "Kewajiban", type: "liability", category: "header", normalBalance: "credit", level: 1, isSystem: true, description: "Liabilitas / Kewajiban" },
    { code: "2100", name: "Kewajiban Lancar", type: "liability", category: "current_liability", normalBalance: "credit", parentId: null, level: 2, isSystem: true },
    { code: "2110", name: "Utang Usaha", type: "liability", category: "payable", normalBalance: "credit", parentId: null, level: 3, isSystem: true },
    { code: "2010", name: "Titipan Dana Campaign", type: "liability", category: "donation_liability", normalBalance: "credit", parentId: null, level: 2, isSystem: true, description: "Dana donasi yang belum disalurkan (semua jenis: umum, wakaf, sedekah, zakat, qurban)" },

    // EQUITY (3xxx)
    { code: "3000", name: "Ekuitas", type: "equity", category: "header", normalBalance: "credit", level: 1, isSystem: true, description: "Modal / Ekuitas" },
    { code: "3100", name: "Modal Awal", type: "equity", category: "capital", normalBalance: "credit", parentId: null, level: 2, isSystem: true },
    { code: "3200", name: "Saldo Laba", type: "equity", category: "retained_earnings", normalBalance: "credit", parentId: null, level: 2, isSystem: true },
    { code: "3300", name: "Laba Tahun Berjalan", type: "equity", category: "current_earnings", normalBalance: "credit", parentId: null, level: 2, isSystem: true },

    // INCOME (4xxx)
    { code: "4000", name: "Pendapatan", type: "income", category: "header", normalBalance: "credit", level: 1, isSystem: true },
    { code: "4100", name: "Pendapatan Donasi", type: "income", category: "donation", normalBalance: "credit", parentId: null, level: 2, isSystem: true, description: "Pendapatan dari donasi masyarakat" },
    { code: "4110", name: "Donasi Umum", type: "income", category: "donation", normalBalance: "credit", parentId: null, level: 3, isSystem: true },
    { code: "4120", name: "Donasi Zakat", type: "income", category: "zakat", normalBalance: "credit", parentId: null, level: 3, isSystem: true },
    { code: "4130", name: "Donasi Infaq", type: "income", category: "infaq", normalBalance: "credit", parentId: null, level: 3, isSystem: true },
    { code: "4200", name: "Pendapatan Lain", type: "income", category: "other", normalBalance: "credit", parentId: null, level: 2, isSystem: true },

    // EXPENSES (5xxx)
    { code: "5000", name: "Beban", type: "expense", category: "header", normalBalance: "debit", level: 1, isSystem: true },
    { code: "5100", name: "Beban Program", type: "expense", category: "program", normalBalance: "debit", parentId: null, level: 2, isSystem: true, description: "Beban untuk program bantuan" },
    { code: "5110", name: "Beban Kesehatan", type: "expense", category: "program", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5120", name: "Beban Pendidikan", type: "expense", category: "program", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5130", name: "Beban Bencana Alam", type: "expense", category: "program", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5140", name: "Beban Sosial", type: "expense", category: "program", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5200", name: "Beban Operasional", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 2, isSystem: true, description: "Beban untuk operasional organisasi" },
    { code: "5210", name: "Beban Gaji", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5220", name: "Beban Sewa", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5230", name: "Beban Listrik", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5240", name: "Beban Internet", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5250", name: "Beban Marketing", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5260", name: "Beban Payment Gateway", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: true, description: "Biaya transaksi payment gateway" },
    { code: "5270", name: "Beban Administrasi Bank", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5280", name: "Beban Perlengkapan", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
    { code: "5290", name: "Beban Lain-lain", type: "expense", category: "operational", normalBalance: "debit", parentId: null, level: 3, isSystem: false },
  ];

  for (const acc of coaData) {
    await db.insert(schema.chartOfAccounts).values({ id: createId(), ...acc }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${coaData.length} chart of accounts entries`);

  await pool.end();
}

seedCOA().catch(console.error);
