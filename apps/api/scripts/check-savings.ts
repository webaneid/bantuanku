import { createDb } from "@bantuanku/db";
import { qurbanSavings } from "@bantuanku/db";
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

async function checkSavings() {
  const savings = await db.select().from(qurbanSavings);
  console.log(`📊 Total savings records: ${savings.length}\n`);

  if (savings.length === 0) {
    console.log("✅ No savings records found in database.");
    process.exit(0);
  }

  console.log("Records:");
  for (const s of savings) {
    console.log(`\n📝 ${s.savingsNumber}`);
    console.log(`   Penabung: ${s.donorName || "(kosong)"}`);
    console.log(`   Telepon: ${s.donorPhone || "(kosong)"}`);
    console.log(`   Target Periode: ${s.targetPeriodId || "(kosong)"}`);
    console.log(`   Target Amount: Rp ${s.targetAmount.toLocaleString("id-ID")}`);
    console.log(`   Current Amount: Rp ${s.currentAmount.toLocaleString("id-ID")}`);
    console.log(`   Status: ${s.status}`);
    console.log(`   Created: ${s.createdAt.toLocaleString("id-ID")}`);
  }
}

checkSavings()
  .then(() => {
    console.log("\n✅ Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
