/**
 * Verification Script: Compare legacy tables vs new transactions
 *
 * Usage: npx tsx scripts/verify-migration.ts
 */

import "dotenv/config";
import { createDb } from "../src/client";
import { sql } from "drizzle-orm";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const db = createDb(databaseUrl);

  console.log("🔍 Verifying migration...\n");

  // Count legacy tables
  const legacyCounts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM donations) as donations_count,
      (SELECT COUNT(*) FROM zakat_donations) as zakat_count,
      (SELECT COUNT(*) FROM qurban_orders) as qurban_count,
      (SELECT COUNT(*) FROM donation_payments) as donation_payments_count,
      (SELECT COUNT(*) FROM zakat_payments) as zakat_payments_count,
      (SELECT COUNT(*) FROM qurban_payments) as qurban_payments_count
  `);

  const legacy = legacyCounts.rows[0] as any;

  // Count new tables
  const newCounts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE product_type = 'campaign') as campaign_count,
      (SELECT COUNT(*) FROM transactions WHERE product_type = 'zakat') as zakat_count,
      (SELECT COUNT(*) FROM transactions WHERE product_type = 'qurban') as qurban_count,
      (SELECT COUNT(*) FROM transaction_payments) as total_payments_count
  `);

  const newData = newCounts.rows[0] as any;

  // Compare totals
  console.log("📊 Legacy Tables:");
  console.log(`   Donations: ${legacy.donations_count}`);
  console.log(`   Zakat: ${legacy.zakat_count}`);
  console.log(`   Qurban: ${legacy.qurban_count}`);
  console.log(`   Total Transactions: ${Number(legacy.donations_count) + Number(legacy.zakat_count) + Number(legacy.qurban_count)}`);
  console.log(`   Total Payments: ${Number(legacy.donation_payments_count) + Number(legacy.zakat_payments_count) + Number(legacy.qurban_payments_count)}`);

  console.log("\n📊 New Tables:");
  console.log(`   Campaign Transactions: ${newData.campaign_count}`);
  console.log(`   Zakat Transactions: ${newData.zakat_count}`);
  console.log(`   Qurban Transactions: ${newData.qurban_count}`);
  console.log(`   Total Transactions: ${Number(newData.campaign_count) + Number(newData.zakat_count) + Number(newData.qurban_count)}`);
  console.log(`   Total Payments: ${newData.total_payments_count}`);

  const legacyTotal = Number(legacy.donations_count) + Number(legacy.zakat_count) + Number(legacy.qurban_count);
  const newTotal = Number(newData.campaign_count) + Number(newData.zakat_count) + Number(newData.qurban_count);

  const legacyPaymentsTotal = Number(legacy.donation_payments_count) + Number(legacy.zakat_payments_count) + Number(legacy.qurban_payments_count);
  const newPaymentsTotal = Number(newData.total_payments_count);

  console.log("\n🔍 Validation:");
  if (legacyTotal === newTotal) {
    console.log(`   ✅ Transaction counts match: ${legacyTotal} = ${newTotal}`);
  } else {
    console.log(`   ❌ Transaction counts mismatch: ${legacyTotal} ≠ ${newTotal}`);
  }

  if (legacyPaymentsTotal === newPaymentsTotal) {
    console.log(`   ✅ Payment counts match: ${legacyPaymentsTotal} = ${newPaymentsTotal}`);
  } else {
    console.log(`   ❌ Payment counts mismatch: ${legacyPaymentsTotal} ≠ ${newPaymentsTotal}`);
  }

  // Compare totals by amount
  const legacyAmounts = await db.execute(sql`
    SELECT
      COALESCE(SUM(total_amount), 0) as donations_total,
      (SELECT COALESCE(SUM(amount), 0) FROM zakat_donations) as zakat_total,
      (SELECT COALESCE(SUM(total_amount), 0) FROM qurban_orders) as qurban_total
    FROM donations
  `);

  const newAmounts = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN product_type = 'campaign' THEN total_amount ELSE 0 END), 0) as campaign_total,
      COALESCE(SUM(CASE WHEN product_type = 'zakat' THEN total_amount ELSE 0 END), 0) as zakat_total,
      COALESCE(SUM(CASE WHEN product_type = 'qurban' THEN total_amount ELSE 0 END), 0) as qurban_total
    FROM transactions
  `);

  const legacyAmount = legacyAmounts.rows[0] as any;
  const newAmount = newAmounts.rows[0] as any;

  console.log("\n💰 Amount Validation:");
  console.log(`   Legacy Campaign Total: Rp ${Number(legacyAmount.donations_total).toLocaleString()}`);
  console.log(`   New Campaign Total: Rp ${Number(newAmount.campaign_total).toLocaleString()}`);
  console.log(`   Legacy Zakat Total: Rp ${Number(legacyAmount.zakat_total).toLocaleString()}`);
  console.log(`   New Zakat Total: Rp ${Number(newAmount.zakat_total).toLocaleString()}`);
  console.log(`   Legacy Qurban Total: Rp ${Number(legacyAmount.qurban_total).toLocaleString()}`);
  console.log(`   New Qurban Total: Rp ${Number(newAmount.qurban_total).toLocaleString()}`);

  if (
    Number(legacyAmount.donations_total) === Number(newAmount.campaign_total) &&
    Number(legacyAmount.zakat_total) === Number(newAmount.zakat_total) &&
    Number(legacyAmount.qurban_total) === Number(newAmount.qurban_total)
  ) {
    console.log("\n   ✅ All amounts match!");
  } else {
    console.log("\n   ⚠️  Some amounts don't match");
  }

  console.log("\n✅ Verification completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
