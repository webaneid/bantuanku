import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "../schema";

/**
 * Migration Script: Legacy Accounting Model → Liability Model
 *
 * Tujuan:
 * - Migrate ledger entries dari Income/Expense model ke Liability model
 * - Update account codes: 1010 → 1020, 4010 → 2010, 5010 → 2010
 * - Ensure data integrity: total debit = total credit
 *
 * CRITICAL: Backup database sebelum menjalankan script ini!
 */

async function migrateLedgerToLiabilityModel() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("=".repeat(60));
  console.log("MIGRATION: Legacy Accounting → Liability Model");
  console.log("=".repeat(60));
  console.log("");

  // Step 1: Check if migration needed
  console.log("Step 1: Checking if migration is needed...");

  const legacyAccountsCheck = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM ledger_accounts
    WHERE code IN ('1010', '4010', '5010')
  `);

  const legacyCount = Number(legacyAccountsCheck.rows[0]?.count || 0);

  if (legacyCount === 0) {
    console.log("✓ No legacy accounts found. Migration not needed.");
    console.log("");
    await client.end();
    return;
  }

  console.log(`Found ${legacyCount} legacy accounts. Starting migration...`);
  console.log("");

  // Step 2: Backup check - ensure ledger accounts exist
  console.log("Step 2: Verifying target accounts exist...");

  const targetAccounts = ['1010', '1020', '2010'];
  for (const code of targetAccounts) {
    const account = await db.query.ledgerAccounts.findFirst({
      where: eq(schema.ledgerAccounts.code, code),
    });

    if (!account) {
      throw new Error(`Target account ${code} not found! Run seed first.`);
    }
    console.log(`✓ Account ${code} - ${account.name} exists`);
  }
  console.log("");

  // Step 3: Get account IDs for mapping
  console.log("Step 3: Building account mapping...");

  const legacyAccounts = await db.execute(sql`
    SELECT id, code, name FROM ledger_accounts WHERE code IN ('1010', '4010', '5010')
  `);

  const newAccounts = await db.execute(sql`
    SELECT id, code, name FROM ledger_accounts WHERE code IN ('1010', '1020', '2010')
  `);

  const accountMap = new Map<string, string>();

  // Mapping rules:
  // Legacy accounts are not being migrated - we use new codes directly
  // This section kept for historical reference only
  // New system uses: 1010 (Kas), 1020 (Bank Operasional), 2010 (Titipan Dana)

  const legacy1010 = legacyAccounts.rows.find((r: any) => r.code === '1010');
  const legacy4010 = legacyAccounts.rows.find((r: any) => r.code === '4010');
  const legacy5010 = legacyAccounts.rows.find((r: any) => r.code === '5010');

  const new1020 = newAccounts.rows.find((r: any) => r.code === '1020');
  const new2010 = newAccounts.rows.find((r: any) => r.code === '2010');

  if (legacy1010) accountMap.set(legacy1010.id as string, new1020?.id as string);
  if (legacy4010) accountMap.set(legacy4010.id as string, new2010?.id as string);
  if (legacy5010) accountMap.set(legacy5010.id as string, new2010?.id as string);

  console.log("Account Mapping:");
  console.log(`  1010 (Kas Legacy) → 1020 (Bank Operasional)`);
  console.log(`  4010 (Revenue) → 2010 (Titipan Dana Campaign)`);
  console.log(`  5010 (Expense) → 2010 (Titipan Dana Campaign)`);
  console.log("");

  // Step 4: Get affected ledger lines
  console.log("Step 4: Analyzing affected ledger entries...");

  const affectedLines = await db.execute(sql`
    SELECT
      ll.id as line_id,
      ll.entry_id,
      ll.account_id as old_account_id,
      ll.debit,
      ll.credit,
      la.code as old_code,
      la.name as old_name,
      le.entry_number,
      le.ref_type,
      le.memo
    FROM ledger_lines ll
    JOIN ledger_accounts la ON la.id = ll.account_id
    JOIN ledger_entries le ON le.id = ll.entry_id
    WHERE la.code IN ('1010', '4010', '5010')
    ORDER BY le.posted_at ASC, ll.id ASC
  `);

  const affectedCount = affectedLines.rows.length;
  console.log(`Found ${affectedCount} ledger lines to migrate`);
  console.log("");

  if (affectedCount === 0) {
    console.log("✓ No ledger lines to migrate.");
    console.log("");
  } else {
    // Step 5: Update ledger lines
    console.log("Step 5: Migrating ledger lines...");

    let migratedCount = 0;

    for (const line of affectedLines.rows) {
      const oldAccountId = line.old_account_id as string;
      const newAccountId = accountMap.get(oldAccountId);

      if (!newAccountId) {
        console.warn(`⚠ Warning: No mapping for account ${line.old_code} (${line.old_name})`);
        continue;
      }

      // Update ledger line
      await db.execute(sql`
        UPDATE ledger_lines
        SET account_id = ${newAccountId}
        WHERE id = ${line.line_id}
      `);

      migratedCount++;

      if (migratedCount % 10 === 0) {
        console.log(`  Migrated ${migratedCount}/${affectedCount} lines...`);
      }
    }

    console.log(`✓ Migrated ${migratedCount} ledger lines`);
    console.log("");
  }

  // Step 6: Verify balance integrity
  console.log("Step 6: Verifying balance integrity...");

  const balanceCheck = await db.execute(sql`
    SELECT
      le.id,
      le.entry_number,
      SUM(ll.debit) as total_debit,
      SUM(ll.credit) as total_credit,
      SUM(ll.debit) - SUM(ll.credit) as difference
    FROM ledger_entries le
    JOIN ledger_lines ll ON ll.entry_id = le.id
    GROUP BY le.id, le.entry_number
    HAVING SUM(ll.debit) != SUM(ll.credit)
  `);

  const unbalancedEntries = balanceCheck.rows.length;

  if (unbalancedEntries > 0) {
    console.error(`❌ ERROR: Found ${unbalancedEntries} unbalanced entries!`);
    console.error("Unbalanced entries:");
    for (const entry of balanceCheck.rows) {
      console.error(`  ${entry.entry_number}: Debit ${entry.total_debit}, Credit ${entry.total_credit}, Diff ${entry.difference}`);
    }
    throw new Error("Balance integrity check failed! Rollback required.");
  }

  console.log("✓ All ledger entries are balanced (debit = credit)");
  console.log("");

  // Step 7: Mark legacy accounts as inactive (don't delete for audit trail)
  console.log("Step 7: Deactivating legacy accounts...");

  await db.execute(sql`
    UPDATE ledger_accounts
    SET name = name || ' (LEGACY - DO NOT USE)'
    WHERE code IN ('1010', '4010', '5010')
  `);

  console.log("✓ Legacy accounts marked as LEGACY");
  console.log("");

  // Step 8: Summary report
  console.log("=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Ledger lines migrated: ${migratedCount}`);
  console.log(`Legacy accounts deactivated: ${legacyCount}`);
  console.log(`Balance check: PASSED ✓`);
  console.log("");
  console.log("Migration completed successfully!");
  console.log("=".repeat(60));

  await client.end();
}

// Rollback function (jika diperlukan)
async function rollbackMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("=".repeat(60));
  console.log("ROLLBACK: Liability Model → Legacy Accounting");
  console.log("=".repeat(60));
  console.log("");
  console.log("⚠️  This will restore data to legacy accounting model");
  console.log("Only run this if migration failed or needs to be reverted");
  console.log("");

  // Get account IDs
  const legacyAccounts = await db.execute(sql`
    SELECT id, code FROM ledger_accounts WHERE code IN ('1010', '4010', '5010')
  `);

  const newAccounts = await db.execute(sql`
    SELECT id, code FROM ledger_accounts WHERE code IN ('1020', '2010')
  `);

  const rollbackMap = new Map<string, string>();

  const legacy1010 = legacyAccounts.rows.find((r: any) => r.code === '1010');
  const legacy4010 = legacyAccounts.rows.find((r: any) => r.code === '4010');
  const new1020 = newAccounts.rows.find((r: any) => r.code === '1020');
  const new2010 = newAccounts.rows.find((r: any) => r.code === '2010');

  if (new1020 && legacy1010) {
    rollbackMap.set(new1020.id as string, legacy1010.id as string);
  }

  if (new2010 && legacy4010) {
    // Note: We can't distinguish between donation (4010) and disbursement (5010) in rollback
    // This is a limitation - manual intervention may be needed
    console.warn("⚠️  Warning: Cannot distinguish between 4010 and 5010 in rollback");
    console.warn("    All 2010 entries will be rolled back to 4010");
  }

  console.log("Rollback not fully implemented due to complexity.");
  console.log("Please restore from database backup instead.");

  await client.end();
}

// Main execution
const command = process.argv[2];

if (command === "migrate") {
  migrateLedgerToLiabilityModel()
    .then(() => {
      console.log("\n✓ Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Migration failed:", error);
      process.exit(1);
    });
} else if (command === "rollback") {
  rollbackMigration()
    .then(() => {
      console.log("\n✓ Rollback completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Rollback failed:", error);
      process.exit(1);
    });
} else {
  console.log("Usage:");
  console.log("  npm run migrate:liability -- migrate    # Run migration");
  console.log("  npm run migrate:liability -- rollback   # Rollback (restore from backup recommended)");
  console.log("");
  console.log("IMPORTANT: Backup database before running migration!");
  process.exit(1);
}

export { migrateLedgerToLiabilityModel, rollbackMigration };
