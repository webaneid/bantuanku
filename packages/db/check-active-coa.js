import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkActiveCoa() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 CHECKING ACTIVELY USED COA ACCOUNTS\n');
    console.log('='.repeat(80));

    // 1. COA yang terhubung dengan Bank Accounts (AKTIF)
    console.log('\n✅ COA YANG AKTIF DIPAKAI - BANK ACCOUNTS:');
    console.log('-'.repeat(80));
    const activeBankCoa = await pool.query(`
      SELECT DISTINCT
        coa.code,
        coa.name,
        coa.type,
        COUNT(ba.id) as bank_count,
        STRING_AGG(ba.bank_name || ' (' || ba.account_number || ')', ', ') as banks
      FROM chart_of_accounts coa
      INNER JOIN bank_accounts ba ON ba.coa_account_id = coa.id
      WHERE ba.is_active = true
      GROUP BY coa.code, coa.name, coa.type
      ORDER BY coa.code
    `);

    if (activeBankCoa.rows.length > 0) {
      console.log(`\n${activeBankCoa.rows.length} COA accounts actively linked to bank accounts:\n`);
      activeBankCoa.rows.forEach(row => {
        console.log(`  📌 ${row.code} - ${row.name}`);
        console.log(`     Type: ${row.type}`);
        console.log(`     Used by ${row.bank_count} bank(s): ${row.banks}`);
        console.log('');
      });
    }

    // 2. COA yang terhubung dengan Ledger Entries (LEGACY - masih ada)
    console.log('\n⚠️  COA YANG MASIH TERHUBUNG - LEDGER (Legacy):');
    console.log('-'.repeat(80));
    const legacyLedgerCoa = await pool.query(`
      SELECT DISTINCT
        coa.code,
        coa.name,
        coa.type,
        COUNT(l.id) as entry_count
      FROM chart_of_accounts coa
      INNER JOIN ledger l ON l.expense_account_id = coa.id
      GROUP BY coa.code, coa.name, coa.type
      ORDER BY coa.code
    `);

    if (legacyLedgerCoa.rows.length > 0) {
      console.log(`\n${legacyLedgerCoa.rows.length} COA accounts linked to old ledger entries:\n`);
      legacyLedgerCoa.rows.forEach(row => {
        console.log(`  📄 ${row.code} - ${row.name}`);
        console.log(`     Type: ${row.type}`);
        console.log(`     ${row.entry_count} legacy ledger entries`);
        console.log('');
      });
    }

    // 3. COA yang terhubung dengan Disbursements (NEW - cek apakah dipakai)
    console.log('\n🔍 COA YANG TERHUBUNG - DISBURSEMENTS (New System):');
    console.log('-'.repeat(80));
    const disbursementCoa = await pool.query(`
      SELECT DISTINCT
        coa.code,
        coa.name,
        coa.type,
        COUNT(d.id) as disbursement_count
      FROM chart_of_accounts coa
      INNER JOIN disbursements d ON d.expense_account_id = coa.id
      GROUP BY coa.code, coa.name, coa.type
      ORDER BY coa.code
    `);

    if (disbursementCoa.rows.length > 0) {
      console.log(`\n${disbursementCoa.rows.length} COA accounts linked to disbursements:\n`);
      disbursementCoa.rows.forEach(row => {
        console.log(`  💰 ${row.code} - ${row.name}`);
        console.log(`     Type: ${row.type}`);
        console.log(`     ${row.disbursement_count} disbursements`);
        console.log('');
      });
    } else {
      console.log('\n  ❌ Tidak ada disbursements yang terhubung ke COA');
      console.log('  ℹ️  Disbursements menggunakan category names, bukan COA codes\n');
    }

    // 4. Summary - COA yang benar-benar aktif
    console.log('\n📊 SUMMARY - COA YANG BENAR-BENAR AKTIF:');
    console.log('='.repeat(80));

    const allActiveCoa = await pool.query(`
      SELECT DISTINCT coa.code, coa.name, coa.type
      FROM chart_of_accounts coa
      WHERE coa.id IN (
        SELECT coa_account_id FROM bank_accounts WHERE coa_account_id IS NOT NULL AND is_active = true
        UNION
        SELECT expense_account_id FROM ledger WHERE expense_account_id IS NOT NULL
        UNION
        SELECT expense_account_id FROM disbursements WHERE expense_account_id IS NOT NULL
      )
      ORDER BY coa.code
    `);

    console.log(`\nTotal COA yang benar-benar terhubung dengan data: ${allActiveCoa.rows.length}\n`);

    console.log('COA Aktif:');
    allActiveCoa.rows.forEach(row => {
      console.log(`  • ${row.code} - ${row.name} (${row.type})`);
    });

    // 5. COA baru untuk Qurban - apakah sudah dipakai?
    console.log('\n\n🐄 COA QURBAN - Status Penggunaan:');
    console.log('-'.repeat(80));

    const qurbanCoa = await pool.query(`
      SELECT code, name, type, category
      FROM chart_of_accounts
      WHERE code IN ('4300', '4310')
      ORDER BY code
    `);

    qurbanCoa.rows.forEach(row => {
      console.log(`  ${row.code} - ${row.name}`);
      console.log(`    Type: ${row.type} | Category: ${row.category}`);
    });

    // Check if these are referenced anywhere
    const qurbanUsage = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM transactions WHERE category = '4300') as txn_4300,
        (SELECT COUNT(*) FROM transactions WHERE category = '4310') as txn_4310,
        (SELECT COUNT(*) FROM transactions WHERE category = 'qurban_payment') as txn_qurban_payment,
        (SELECT COUNT(*) FROM transactions WHERE category = 'qurban_admin_fee') as txn_qurban_admin_fee
    `);

    console.log(`\n  Penggunaan di Transactions:`);
    console.log(`    - Old COA code '4300': ${qurbanUsage.rows[0].txn_4300} transaksi`);
    console.log(`    - Old COA code '4310': ${qurbanUsage.rows[0].txn_4310} transaksi`);
    console.log(`    - Category 'qurban_payment': ${qurbanUsage.rows[0].txn_qurban_payment} transaksi ✅`);
    console.log(`    - Category 'qurban_admin_fee': ${qurbanUsage.rows[0].txn_qurban_admin_fee} transaksi`);

    console.log('\n\n✅ CHECK COMPLETE!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkActiveCoa().catch(console.error);
