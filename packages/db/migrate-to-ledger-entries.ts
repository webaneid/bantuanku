import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./src/schema/index.js";
import { createId } from "./src/index.js";

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function migrateToLedgerEntries() {
  console.log("🔄 Starting migration to ledger_entries...\n");

  // Get all ledger accounts we need
  const accounts = await db.execute(`
    SELECT id, code, name FROM ledger_accounts
    WHERE code IN ('1010', '1020', '2010', '4110')
  `);

  const accountMap = new Map(accounts.rows.map((a: any) => [a.code, { id: a.id, name: a.name }]));

  console.log("📋 Found accounts:");
  accounts.rows.forEach((a: any) => console.log(`  - ${a.code}: ${a.name}`));
  console.log();

  // Check if already migrated
  const existingEntries = await db.execute(`SELECT COUNT(*) as count FROM ledger_entries`);
  const existingCount = Number(existingEntries.rows[0]?.count || 0);

  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing ledger_entries`);
    console.log("❌ Migration aborted to prevent duplicate entries");
    console.log("   Delete existing ledger_entries first if you want to re-migrate");
    await pool.end();
    return;
  }

  // 1. Migrate successful donations
  console.log("💰 Migrating donations...");
  const donations = await db.execute(`
    SELECT
      d.id,
      d.amount,
      d.fee_amount,
      d.created_at,
      d.donor_name,
      d.donor_email,
      c.title as campaign_title,
      pm.name as payment_method
    FROM donations d
    LEFT JOIN campaigns c ON d.campaign_id = c.id
    LEFT JOIN payment_methods pm ON d.payment_method_id = pm.id
    WHERE d.payment_status = 'success'
    ORDER BY d.created_at ASC
  `);

  let donationCount = 0;
  for (const donation of donations.rows as any[]) {
    const netAmount = donation.amount - (donation.fee_amount || 0);

    // Determine account: assume 1020 (Bank) for now
    const cashAccountId = accountMap.get('1020')?.id;
    const liabilityAccountId = accountMap.get('2010')?.id;

    if (!cashAccountId || !liabilityAccountId) {
      console.log(`  ⚠️  Skipping donation ${donation.id} - missing accounts`);
      continue;
    }

    // Create ledger entry
    const entryId = createId();
    const campaignTitle = donation.campaign_title || 'Campaign';
    const donorInfo = donation.donor_name || donation.donor_email || 'Anonim';
    const memo = `Donasi ${campaignTitle} dari ${donorInfo}`;

    // Generate entry number: JE-YYYYMM-XXXX
    const date = new Date(donation.created_at);
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const sequence = String(donationCount + 1).padStart(4, '0');
    const entryNumber = `JE-${yearMonth}-${sequence}`;

    await db.insert(schema.ledgerEntries).values({
      id: entryId,
      entryNumber,
      refType: 'donation',
      refId: donation.id,
      postedAt: new Date(donation.created_at),
      memo,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create ledger lines (double entry)
    // Debit: Cash/Bank (1020)
    await db.insert(schema.ledgerLines).values({
      id: createId(),
      entryId,
      accountId: cashAccountId,
      debit: netAmount,
      credit: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Credit: Donation Liability (2010)
    await db.insert(schema.ledgerLines).values({
      id: createId(),
      entryId,
      accountId: liabilityAccountId,
      debit: 0,
      credit: netAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    donationCount++;
    if (donationCount % 10 === 0) {
      console.log(`  ✓ Migrated ${donationCount} donations...`);
    }
  }
  console.log(`✅ Migrated ${donationCount} donations\n`);

  // 2. Migrate disbursements (ledger table with status = 'paid')
  console.log("📤 Migrating disbursements...");
  const disbursements = await db.execute(`
    SELECT
      l.id,
      l.amount,
      l.purpose,
      l.recipient_name,
      l.paid_at,
      l.created_at,
      c.title as campaign_title
    FROM ledger l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    WHERE l.status = 'paid'
    ORDER BY COALESCE(l.paid_at, l.created_at) ASC
  `);

  let disbursementCount = 0;
  const disbStartSeq = donationCount + 1; // Continue sequence from donations
  for (const disb of disbursements.rows as any[]) {
    const cashAccountId = accountMap.get('1020')?.id;
    const liabilityAccountId = accountMap.get('2010')?.id;

    if (!cashAccountId || !liabilityAccountId) {
      console.log(`  ⚠️  Skipping disbursement ${disb.id} - missing accounts`);
      continue;
    }

    // Create ledger entry
    const entryId = createId();
    const purpose = disb.purpose || 'Penyaluran';
    const recipient = disb.recipient_name || '-';
    const memo = `${purpose} ke ${recipient}`;

    // Generate entry number: JE-YYYYMM-XXXX
    const date = new Date(disb.paid_at || disb.created_at);
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const sequence = String(disbStartSeq + disbursementCount).padStart(4, '0');
    const entryNumber = `JE-${yearMonth}-${sequence}`;

    await db.insert(schema.ledgerEntries).values({
      id: entryId,
      entryNumber,
      refType: 'disbursement',
      refId: disb.id,
      postedAt: new Date(disb.paid_at || disb.created_at),
      memo,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create ledger lines (double entry)
    // Debit: Donation Liability (2010) - reduce liability
    await db.insert(schema.ledgerLines).values({
      id: createId(),
      entryId,
      accountId: liabilityAccountId,
      debit: disb.amount,
      credit: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Credit: Cash/Bank (1020) - reduce cash
    await db.insert(schema.ledgerLines).values({
      id: createId(),
      entryId,
      accountId: cashAccountId,
      debit: 0,
      credit: disb.amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    disbursementCount++;
    if (disbursementCount % 10 === 0) {
      console.log(`  ✓ Migrated ${disbursementCount} disbursements...`);
    }
  }
  console.log(`✅ Migrated ${disbursementCount} disbursements\n`);

  // Summary
  console.log("📊 Migration Summary:");
  console.log(`  - Total donations migrated: ${donationCount}`);
  console.log(`  - Total disbursements migrated: ${disbursementCount}`);
  console.log(`  - Total ledger entries created: ${donationCount + disbursementCount}`);
  console.log(`  - Total ledger lines created: ${(donationCount + disbursementCount) * 2}`);

  await pool.end();
  console.log("\n✅ Migration completed!");
}

migrateToLedgerEntries().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
