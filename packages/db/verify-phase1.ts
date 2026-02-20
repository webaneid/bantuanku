import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { transactions, chartOfAccounts } from "./src/schema";
import { sql, count, eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function verifyPhase1() {
  console.log("=== PHASE 1 VERIFICATION ===\n");

  // 1. Check category field exists and has data
  console.log("1. Checking category field...");
  const nullCategories = await db
    .select({ count: count() })
    .from(transactions)
    .where(sql`category IS NULL`);
  console.log(`   NULL categories: ${nullCategories[0].count} (expected: 0)`);

  // 2. Category distribution
  console.log("\n2. Category distribution:");
  const categoryDist = await db
    .select({
      category: transactions.category,
      count: count(),
    })
    .from(transactions)
    .groupBy(transactions.category);
  categoryDist.forEach((row) => {
    console.log(`   ${row.category}: ${row.count}`);
  });

  // 3. Check COA deactivation
  console.log("\n3. Checking COA deactivation:");
  const inactiveCOA = await db
    .select({ count: count() })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.isActive, false));
  console.log(`   Inactive COA: ${inactiveCOA[0].count} (expected: 18)`);

  // 4. Verify zakat categories only from zakat products
  console.log("\n4. Verifying category integrity:");
  const invalidZakat = await db
    .select({ count: count() })
    .from(transactions)
    .where(sql`category LIKE 'zakat_%' AND product_type != 'zakat'`);
  console.log(`   Invalid zakat categories: ${invalidZakat[0].count} (expected: 0)`);

  console.log("\n✅ Phase 1 verification complete!");

  await client.end();
}

verifyPhase1().catch(console.error);
