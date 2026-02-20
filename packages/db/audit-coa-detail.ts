import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chartOfAccounts, ledger } from "./src/schema";
import { sql, count, eq, isNotNull } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function auditCOADetail() {
  console.log("=== AUDIT COA USAGE DETAIL ===\n");

  // 1. Expense accounts yang sudah dipakai
  const usedExpenseAccounts = await db
    .select({
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      usageCount: count(ledger.id),
    })
    .from(chartOfAccounts)
    .leftJoin(ledger, eq(ledger.expenseAccountId, chartOfAccounts.id))
    .where(eq(chartOfAccounts.type, "expense"))
    .groupBy(chartOfAccounts.id, chartOfAccounts.code, chartOfAccounts.name)
    .orderBy(sql`count(${ledger.id}) DESC`, chartOfAccounts.code);

  console.log("📊 Expense Accounts Usage:\n");
  usedExpenseAccounts.forEach((row) => {
    const status = row.usageCount > 0 ? "✅ USED" : "❌ UNUSED";
    console.log(`${status} ${row.code} - ${row.name} (${row.usageCount} times)`);
  });

  console.log("\n");

  // 2. All expense accounts list
  const allExpenseAccounts = await db
    .select({
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      isActive: chartOfAccounts.isActive,
    })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.type, "expense"))
    .orderBy(chartOfAccounts.code);

  console.log(`\n📋 Total Expense Accounts: ${allExpenseAccounts.length}\n`);

  // 3. Zakat COA
  const zakatCOA = await db
    .select({
      code: chartOfAccounts.code,
      name: chartOfAccounts.name,
      type: chartOfAccounts.type,
    })
    .from(chartOfAccounts)
    .where(sql`code LIKE '6%' OR code LIKE '7%'`)
    .orderBy(chartOfAccounts.code);

  console.log(`\n🕌 Zakat COA (62xx, 72xx): ${zakatCOA.length} accounts\n`);
  zakatCOA.forEach((row) => {
    console.log(`  ${row.code} - ${row.name} (${row.type})`);
  });

  await client.end();
}

auditCOADetail().catch(console.error);
