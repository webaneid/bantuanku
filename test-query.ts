import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Test query yang sama dengan API
const result = await pool.query(`
  SELECT
    le.id as entry_id,
    le.posted_at,
    le.ref_type,
    le.ref_id,
    le.memo,
    ll.debit as kas_masuk,
    ll.credit as kas_keluar,
    la.code as account_code,
    la.name as account_name
  FROM ledger_entries le
  JOIN ledger_lines ll ON ll.entry_id = le.id
  JOIN ledger_accounts la ON la.id = ll.account_id
  WHERE la.code IN ('1010', '1020')
    AND le.posted_at >= '2024-01-01'
    AND le.posted_at <= '2026-12-31'
  ORDER BY le.posted_at DESC
`);

console.log(`Found ${result.rows.length} transactions:`);
console.table(result.rows);

await pool.end();
