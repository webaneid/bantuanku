import { Pool } from "pg";

async function checkCampaigns() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const result = await pool.query(`
      SELECT id, title, category, category_id, status, created_at
      FROM campaigns
      ORDER BY created_at DESC
      LIMIT 2
    `);

    console.log("2 Campaign Terakhir:");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkCampaigns();
