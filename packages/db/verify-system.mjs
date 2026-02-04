import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Client } = pg;
async function verifySystem() {
  console.log('Verifying Bantuanku System...\n');
  const client = new Client({
    connectionString: 'postgresql://webane@localhost:5432/bantuanku'
  });
  try {
    await client.connect();
    console.log('1. Database: Connected\n');
    const tablesResult = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    console.log(`2. Tables: ${tablesResult.rows.length} tables found\n`);
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && f.match(/^\d{4}_/)).sort();
    console.log(`3. Migrations: ${migrations.length} files`);
    migrations.forEach((m, i) => console.log(`   ${i}. ${m}`));
    console.log('');
    const mediaResult = await client.query(`SELECT COUNT(*) as total FROM media`);
    console.log(`4. Media: ${mediaResult.rows[0].total} records in database`);
    const uploadsDir = path.join(process.cwd(), '..', 'api', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`   Uploads: ${files.length} files in filesystem\n`);
    } else {
      console.log('   Uploads: directory not found\n');
    }
    const reportsResult = await client.query(`SELECT COUNT(*) as total FROM activity_reports`);
    console.log(`5. Activity Reports: ${reportsResult.rows[0].total} reports\n`);
    console.log('System verification completed!\n');
  } catch (error) {
    console.error('Verification failed:', error.message);
  } finally {
    await client.end();
  }
}
verifySystem();
