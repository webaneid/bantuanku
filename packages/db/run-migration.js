const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://webane@localhost:5432/bantuanku'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'drizzle/0006_create_activity_reports.sql'),
      'utf8'
    );

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
