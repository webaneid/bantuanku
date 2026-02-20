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
    // BANK ACCOUNTS (6xxx) - Asset type, Debit normal
    { code: "6201", name: "Bank BSI", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank Syariah Indonesia" },
    { code: "6202", name: "Bank Muamalat", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank Muamalat" },
    { code: "6203", name: "Bank BCA", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank BCA" },
    { code: "6204", name: "Bank Mandiri", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank Mandiri" },
    { code: "6205", name: "Bank BRI", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank BRI" },
    { code: "6206", name: "Payment Gateway", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening virtual untuk tracking pembayaran via payment gateway (Xendit, iPaymu, Flip, dll)" },
    { code: "6210", name: "Cash", type: "asset", category: "cash", normalBalance: "debit", level: 1, isSystem: true, description: "Kas tunai untuk pembayaran langsung" },

    // INCOME ACCOUNTS (43xx) - Income type, Credit normal
    { code: "4300", name: "Pendapatan Qurban", type: "income", category: "qurban", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari penjualan paket qurban (tidak termasuk biaya admin)" },
    { code: "4310", name: "Biaya Admin Qurban", type: "income", category: "qurban_admin", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari biaya administrasi penyembelihan qurban" },
    { code: "4311", name: "Wakaf", type: "income", category: "wakaf", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari wakaf" },
    { code: "4312", name: "Fidyah", type: "income", category: "fidyah", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari fidyah" },
  ];

  for (const acc of coaData) {
    await db.insert(schema.chartOfAccounts).values({ id: createId(), ...acc }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${coaData.length} chart of accounts entries`);

  await pool.end();
}

seedCOA().catch(console.error);
