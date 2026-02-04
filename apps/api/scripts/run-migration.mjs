import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://webane@localhost:5432/bantuanku';

async function runMigration() {
  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationFile = path.join(__dirname, '../migrations/003_create_media_table.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
