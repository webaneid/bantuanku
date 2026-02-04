import { createDb } from "@bantuanku/db";
import { qurbanSavingsTransactions } from "@bantuanku/db";
import * as path from "path";
import * as fs from "fs";

// Load .dev.vars
const devVarsPath = path.join(process.cwd(), ".dev.vars");
if (fs.existsSync(devVarsPath)) {
  const envContent = fs.readFileSync(devVarsPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const db = createDb(databaseUrl);

async function checkTransactions() {
  const transactions = await db.select().from(qurbanSavingsTransactions);
  console.log(`📊 Total transaksi: ${transactions.length}\n`);

  if (transactions.length === 0) {
    console.log("✅ Tidak ada transaksi.");
    process.exit(0);
  }

  console.log("Transaksi:");
  for (const trx of transactions) {
    console.log(`\n📝 ${trx.transactionNumber}`);
    console.log(`   Savings ID: ${trx.savingsId}`);
    console.log(`   Amount: Rp ${trx.amount.toLocaleString("id-ID")}`);
    console.log(`   Type: ${trx.transactionType}`);
    console.log(`   Payment Method: ${trx.paymentMethod || "(kosong)"}`);
    console.log(`   Payment Channel: ${trx.paymentChannel || "(kosong)"}`);
    console.log(`   Payment Proof: ${trx.paymentProof || "(KOSONG - TIDAK ADA BUKTI)"}`);
    console.log(`   Status: ${trx.status}`);
    console.log(`   Notes: ${trx.notes || "-"}`);
    console.log(`   Created: ${trx.createdAt.toLocaleString("id-ID")}`);
  }
}

checkTransactions()
  .then(() => {
    console.log("\n✅ Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
