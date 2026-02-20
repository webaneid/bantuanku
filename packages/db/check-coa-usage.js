import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkCoaUsage() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📊 CHECKING COA USAGE IN SYSTEM\n');
    console.log('='.repeat(80));

    // 1. Check all COA accounts
    console.log('\n1️⃣  ALL COA ACCOUNTS IN DATABASE:');
    console.log('-'.repeat(80));
    const allCoa = await pool.query(`
      SELECT code, name, type, category, is_active, is_system
      FROM chart_of_accounts
      WHERE is_active = true
      ORDER BY code
    `);

    console.log(`Found ${allCoa.rows.length} active COA accounts:\n`);
    allCoa.rows.forEach(row => {
      console.log(`  ${row.code} - ${row.name}`);
      console.log(`    Type: ${row.type} | Category: ${row.category || 'N/A'} | System: ${row.is_system ? 'Yes' : 'No'}`);
    });

    // 2. Check COA usage in bank_accounts
    console.log('\n\n2️⃣  COA USAGE IN BANK ACCOUNTS:');
    console.log('-'.repeat(80));
    const bankCoa = await pool.query(`
      SELECT
        ba.bank_name,
        ba.account_number,
        ba.coa_code,
        coa.code as linked_coa_code,
        coa.name as linked_coa_name
      FROM bank_accounts ba
      LEFT JOIN chart_of_accounts coa ON ba.coa_account_id = coa.id
      WHERE ba.is_active = true
    `);

    if (bankCoa.rows.length > 0) {
      console.log(`Found ${bankCoa.rows.length} bank accounts linked to COA:\n`);
      bankCoa.rows.forEach(row => {
        console.log(`  ${row.bank_name} (${row.account_number})`);
        console.log(`    Legacy COA Code: ${row.coa_code || 'N/A'}`);
        console.log(`    Linked COA: ${row.linked_coa_code || 'Not linked'} - ${row.linked_coa_name || ''}`);
      });
    } else {
      console.log('  No bank accounts found');
    }

    // 3. Check COA usage in disbursements
    console.log('\n\n3️⃣  COA USAGE IN DISBURSEMENTS:');
    console.log('-'.repeat(80));
    const disbursementCoa = await pool.query(`
      SELECT
        d.category,
        coa.code as linked_coa_code,
        coa.name as linked_coa_name,
        COUNT(*) as count
      FROM disbursements d
      LEFT JOIN chart_of_accounts coa ON d.expense_account_id = coa.id
      GROUP BY d.category, coa.code, coa.name
      ORDER BY d.category
    `);

    if (disbursementCoa.rows.length > 0) {
      console.log(`Disbursement categories and their COA links:\n`);
      disbursementCoa.rows.forEach(row => {
        console.log(`  Category: ${row.category} (${row.count} records)`);
        console.log(`    Linked COA: ${row.linked_coa_code || 'Not linked'} - ${row.linked_coa_name || ''}`);
      });
    } else {
      console.log('  No disbursements found');
    }

    // 4. Check COA usage in ledger (old)
    console.log('\n\n4️⃣  COA USAGE IN LEDGER (old table):');
    console.log('-'.repeat(80));
    const ledgerCoa = await pool.query(`
      SELECT
        l.purpose,
        coa.code as linked_coa_code,
        coa.name as linked_coa_name,
        COUNT(*) as count
      FROM ledger l
      LEFT JOIN chart_of_accounts coa ON l.expense_account_id = coa.id
      GROUP BY l.purpose, coa.code, coa.name
      LIMIT 10
    `);

    if (ledgerCoa.rows.length > 0) {
      console.log(`Sample ledger entries and their COA links:\n`);
      ledgerCoa.rows.forEach(row => {
        console.log(`  Purpose: ${row.purpose} (${row.count} records)`);
        console.log(`    Linked COA: ${row.linked_coa_code || 'Not linked'} - ${row.linked_coa_name || ''}`);
      });
    } else {
      console.log('  No ledger entries found');
    }

    // 5. Summary: Where is COA actually being used?
    console.log('\n\n5️⃣  SUMMARY - COA ACTUAL USAGE:');
    console.log('-'.repeat(80));

    const bankWithCoa = await pool.query(`
      SELECT COUNT(*) as count
      FROM bank_accounts
      WHERE coa_account_id IS NOT NULL AND is_active = true
    `);

    const disbursementWithCoa = await pool.query(`
      SELECT COUNT(*) as count
      FROM disbursements
      WHERE expense_account_id IS NOT NULL
    `);

    const ledgerWithCoa = await pool.query(`
      SELECT COUNT(*) as count
      FROM ledger
      WHERE expense_account_id IS NOT NULL
    `);

    console.log(`\n📌 Bank Accounts linked to COA: ${bankWithCoa.rows[0].count}`);
    console.log(`📌 Disbursements linked to COA: ${disbursementWithCoa.rows[0].count}`);
    console.log(`📌 Ledger entries linked to COA: ${ledgerWithCoa.rows[0].count}`);

    console.log('\n\n✅ COA CHECK COMPLETE!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkCoaUsage().catch(console.error);
