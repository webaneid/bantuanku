import pkg from 'pg';
const { Pool } = pkg;

async function getUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query('SELECT id, email, name FROM users LIMIT 1');
  console.log(JSON.stringify(result.rows[0], null, 2));
  await pool.end();
}

getUser();
