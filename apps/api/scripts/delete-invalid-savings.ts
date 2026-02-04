import { createDb } from "@bantuanku/db";
import { qurbanSavings } from "@bantuanku/db";
import { or, isNull, eq } from "drizzle-orm";
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

async function deleteInvalidSavings() {
  console.log("🔍 Mencari tabungan yang invalid (penabung atau target kosong)...\n");

  // Find savings with null or empty donor info or period
  const invalidSavings = await db
    .select()
    .from(qurbanSavings)
    .where(
      or(
        isNull(qurbanSavings.donorName),
        eq(qurbanSavings.donorName, ""),
        isNull(qurbanSavings.donorPhone),
        eq(qurbanSavings.donorPhone, ""),
        isNull(qurbanSavings.targetPeriodId),
        eq(qurbanSavings.targetPeriodId, "")
      )
    );

  console.log(`📋 Ditemukan ${invalidSavings.length} tabungan invalid:\n`);

  if (invalidSavings.length === 0) {
    console.log("✅ Tidak ada tabungan invalid yang perlu dihapus.");
    process.exit(0);
  }

  for (const saving of invalidSavings) {
    console.log(`❌ ${saving.savingsNumber}`);
    console.log(`   - Penabung: ${saving.donorName || "(kosong)"}`);
    console.log(`   - Telepon: ${saving.donorPhone || "(kosong)"}`);
    console.log(`   - Target Periode: ${saving.targetPeriodId || "(kosong)"}`);
    console.log(`   - Target Amount: Rp ${saving.targetAmount.toLocaleString("id-ID")}`);
    console.log(`   - Created: ${saving.createdAt.toLocaleString("id-ID")}\n`);
  }

  console.log("\n🗑️  Menghapus tabungan invalid...\n");

  for (const saving of invalidSavings) {
    await db.delete(qurbanSavings).where(eq(qurbanSavings.id, saving.id));
    console.log(`   ✓ Deleted: ${saving.savingsNumber}`);
  }

  console.log(`\n✅ Berhasil menghapus ${invalidSavings.length} tabungan invalid.`);
  process.exit(0);
}

deleteInvalidSavings().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
