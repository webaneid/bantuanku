import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/070_migrate_coa_to_category_names.sql'),
      'utf8'
    );

    console.log('Executing migration 070: Migrate COA codes to category names...');
    await pool.query(migrationSQL);
    console.log('✅ Migration 070 executed successfully!');

    // Verify the changes
    console.log('\nVerifying migration results:');

    const campaignCheck = await pool.query(
      "SELECT COUNT(*) as count FROM transactions WHERE category = 'campaign_donation'"
    );
    console.log(`- Campaign donations: ${campaignCheck.rows[0].count}`);

    const zakatCheck = await pool.query(
      "SELECT category, COUNT(*) as count FROM transactions WHERE product_type = 'zakat' GROUP BY category ORDER BY category"
    );
    console.log('- Zakat transactions:');
    zakatCheck.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count}`);
    });

    const qurbanCheck = await pool.query(
      "SELECT category, COUNT(*) as count FROM transactions WHERE product_type = 'qurban' GROUP BY category ORDER BY category"
    );
    console.log('- Qurban transactions:');
    qurbanCheck.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count}`);
    });

    // Check for any remaining COA codes
    const oldCodesCheck = await pool.query(
      "SELECT category, COUNT(*) as count FROM transactions WHERE category SIMILAR TO '[0-9]+' GROUP BY category"
    );
    if (oldCodesCheck.rows.length > 0) {
      console.log('\n⚠️  Warning: Found transactions still using COA codes:');
      oldCodesCheck.rows.forEach(row => {
        console.log(`  - ${row.category}: ${row.count}`);
      });
    } else {
      console.log('\n✅ All transactions successfully migrated to category names!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
