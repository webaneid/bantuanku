import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testMigrations() {
  const client = new Client({
    connectionString: 'postgresql://webane@localhost:5432/bantuanku_test'
  });

  try {
    console.log('Creating test database...');
    const adminClient = new Client({
      connectionString: 'postgresql://webane@localhost:5432/postgres'
    });
    await adminClient.connect();

    // Drop and recreate test database
    await adminClient.query('DROP DATABASE IF EXISTS bantuanku_test');
    await adminClient.query('CREATE DATABASE bantuanku_test');
    await adminClient.end();

    console.log('Connecting to test database...');
    await client.connect();

    // Get all migration files in order
    const migrationsDir = path.join(__dirname, 'drizzle');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f.match(/^\d{4}_/))
      .sort();

    console.log('\nRunning migrations in order:');
    console.log('============================\n');

    for (const file of files) {
      console.log(`Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await client.query(sql);
        console.log(`✓ Success: ${file}\n`);
      } catch (error) {
        console.error(`✗ Failed: ${file}`);
        console.error(`Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('============================');
    console.log('All migrations completed successfully!');
    console.log('============================\n');

    // Verify tables exist
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('Tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

  } catch (error) {
    console.error('\n❌ Migration test failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();

    // Cleanup: drop test database
    const adminClient = new Client({
      connectionString: 'postgresql://webane@localhost:5432/postgres'
    });
    await adminClient.connect();
    await adminClient.query('DROP DATABASE IF EXISTS bantuanku_test');
    await adminClient.end();
    console.log('\n✓ Test database cleaned up');
  }
}

testMigrations();
