import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT code, name, type FROM ledger_accounts 
  WHERE code IN ('1010', '1020', '2010')
  ORDER BY code
`);

console.log("Current COA in database:");
console.table(result.rows);

await pool.end();
