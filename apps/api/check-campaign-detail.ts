import { Pool } from "pg";

async function checkCampaignDetail() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const result = await pool.query(`
      SELECT id, title, image_url, category_id, status
      FROM campaigns
      WHERE id = 'nyq8fad97313ni3bokvf4'
    `);

    console.log("Campaign Detail:");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkCampaignDetail();
