import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chartOfAccounts, ledger, ledgerEntries, ledgerLines } from "./src/schema";
import { sql, count } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function auditCOA() {
  console.log("=== AUDIT CHART OF ACCOUNTS ===\n");

  // 1. Total COA
  const totalCOA = await db.select({ count: count() }).from(chartOfAccounts);
  console.log(`📊 Total COA: ${totalCOA[0].count}\n`);

  // 2. COA by type
  const coaByType = await db
    .select({
      type: chartOfAccounts.type,
      count: count(),
    })
    .from(chartOfAccounts)
    .groupBy(chartOfAccounts.type);

  console.log("📋 COA by Type:");
  coaByType.forEach((row) => {
    console.log(`  - ${row.type}: ${row.count}`);
  });
  console.log("");

  // 3. Check ledger usage
  const ledgerWithCOA = await db
    .select({ count: count() })
    .from(ledger)
    .where(sql`expense_account_id IS NOT NULL`);

  console.log(`💼 Ledger entries using COA: ${ledgerWithCOA[0].count}\n`);

  // 4. Check ledger entries
  const totalLedgerEntries = await db.select({ count: count() }).from(ledgerEntries);
  console.log(`📝 Total Ledger Entries: ${totalLedgerEntries[0].count}\n`);

  // 5. Check ledger lines
  const totalLedgerLines = await db.select({ count: count() }).from(ledgerLines);
  console.log(`📊 Total Ledger Lines: ${totalLedgerLines[0].count}\n`);

  // 6. Sample COA data
  const sampleCOA = await db
    .select({
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      type: chartOfAccounts.type,
    })
    .from(chartOfAccounts)
    .orderBy(chartOfAccounts.code)
    .limit(20);

  console.log("🔍 Sample COA (first 20):");
  sampleCOA.forEach((row) => {
    console.log(`  ${row.code} - ${row.name} (${row.type})`);
  });

  await client.end();
}

auditCOA().catch(console.error);
