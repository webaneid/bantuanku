import { readFile } from 'fs/promises';
import pg from 'pg';
const { Pool } = pg;

async function createDonaturTable() {
  // Read .dev.vars file
  const devVars = await readFile('.dev.vars', 'utf-8');
  const lines = devVars.split('\n');
  let databaseUrl = '';

  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      databaseUrl = line.split('=')[1].trim();
      break;
    }
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .dev.vars');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('Creating donatur table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS donatur (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        whatsapp TEXT,
        address TEXT,
        city TEXT,
        province TEXT,
        postal_code TEXT,
        avatar TEXT,

        total_donations BIGINT DEFAULT 0 NOT NULL,
        total_amount BIGINT DEFAULT 0 NOT NULL,

        email_verified_at TIMESTAMP,
        phone_verified_at TIMESTAMP,

        is_active BOOLEAN DEFAULT true NOT NULL,
        is_anonymous BOOLEAN DEFAULT false NOT NULL,

        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('✓ Table donatur created');
    console.log('Creating indexes...');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_donatur_email ON donatur(email);
      CREATE INDEX IF NOT EXISTS idx_donatur_phone ON donatur(phone);
      CREATE INDEX IF NOT EXISTS idx_donatur_created_at ON donatur(created_at);
    `);

    console.log('✓ Indexes created');
    console.log('Adding donatur_id to donations table...');

    await pool.query(`
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS donatur_id TEXT REFERENCES donatur(id);
      CREATE INDEX IF NOT EXISTS idx_donations_donatur_id ON donations(donatur_id);
    `);

    console.log('✓ Column donatur_id added to donations');
    console.log('\n✅ Migration completed successfully!');

    // Verify
    const result = await pool.query('SELECT COUNT(*) FROM donatur');
    console.log(`Total donatur: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createDonaturTable();
