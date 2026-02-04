import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./src/schema/index.js";

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function checkLedger() {
  // Check ledger accounts
  const accounts = await db.execute(`
    SELECT code, name FROM ledger_accounts 
    WHERE code IN ('1010', '1020')
  `);
  console.log("=== Ledger Accounts ===");
  console.log(accounts.rows);

  // Check ledger entries
  const entries = await db.execute(`
    SELECT COUNT(*) as total FROM ledger_entries
  `);
  console.log("\n=== Total Ledger Entries ===");
  console.log(entries.rows);

  // Check ledger lines with account codes
  const lines = await db.execute(`
    SELECT la.code, la.name, COUNT(*) as count, SUM(ll.debit) as total_debit, SUM(ll.credit) as total_credit
    FROM ledger_lines ll
    JOIN ledger_accounts la ON la.id = ll.account_id
    WHERE la.code IN ('1010', '1020')
    GROUP BY la.code, la.name
  `);
  console.log("\n=== Ledger Lines by Account ===");
  console.log(lines.rows);

  await pool.end();
}

checkLedger().catch(console.error);
