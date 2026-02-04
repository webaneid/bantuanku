import pg from 'pg';
const { Client } = pg;

async function checkMedia() {
  const client = new Client({
    connectionString: 'postgresql://webane@localhost:5432/bantuanku'
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    const result = await client.query(`
      SELECT id, filename, url, path, category, created_at
      FROM media
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('Recent media items:');
    console.log('-------------------');
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.filename}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   URL: ${row.url}`);
      console.log(`   Path: ${row.path}`);
      console.log(`   Category: ${row.category}`);
      console.log(`   Created: ${row.created_at}`);
    });

    console.log(`\n\nTotal records: ${result.rows.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkMedia();
