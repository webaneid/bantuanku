import pg from "pg";
const { Pool } = pg;

async function testCashFlowQuery() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Testing cash flow query...\n");

    const startDate = "2024-01-01";
    const endDate = "2026-12-31";

    // Test donations query
    console.log("1. Testing donations query (payment_status = 'success'):");
    const donationsResult = await pool.query(`
      SELECT
        d.id,
        d.created_at,
        d.payment_status,
        d.amount,
        d.donor_name,
        c.title as campaign_title
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      WHERE d.payment_status = 'success'
        AND d.created_at >= $1::timestamp
        AND d.created_at <= $2::timestamp
      ORDER BY d.created_at DESC
    `, [startDate, endDate]);

    console.log(`Found ${donationsResult.rows.length} donations:`);
    console.table(donationsResult.rows);
    console.log();

    // Test disbursements query
    console.log("2. Testing disbursements query (status = 'paid'):");
    const disbursementsResult = await pool.query(`
      SELECT
        l.id,
        l.created_at,
        l.paid_at,
        l.status,
        l.amount,
        l.purpose,
        l.recipient_name,
        c.title as campaign_title
      FROM ledger l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.status = 'paid'
        AND COALESCE(l.paid_at, l.created_at) >= $1::timestamp
        AND COALESCE(l.paid_at, l.created_at) <= $2::timestamp
      ORDER BY COALESCE(l.paid_at, l.created_at) DESC
    `, [startDate, endDate]);

    console.log(`Found ${disbursementsResult.rows.length} disbursements:`);
    console.table(disbursementsResult.rows);
    console.log();

    // Test combined UNION query
    console.log("3. Testing combined UNION query:");
    const combinedResult = await pool.query(`
      -- Donations (kas masuk)
      SELECT
        d.id as transaction_id,
        d.created_at as transaction_date,
        'donation' as transaction_type,
        d.amount as kas_masuk,
        0 as kas_keluar,
        d.donor_name,
        c.title as campaign_title
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      WHERE d.payment_status = 'success'
        AND d.created_at >= $1::timestamp
        AND d.created_at <= $2::timestamp

      UNION ALL

      -- Disbursements (kas keluar)
      SELECT
        l.id as transaction_id,
        COALESCE(l.paid_at, l.created_at) as transaction_date,
        'disbursement' as transaction_type,
        0 as kas_masuk,
        l.amount as kas_keluar,
        l.recipient_name as donor_name,
        c.title as campaign_title
      FROM ledger l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.status = 'paid'
        AND COALESCE(l.paid_at, l.created_at) >= $1::timestamp
        AND COALESCE(l.paid_at, l.created_at) <= $2::timestamp

      ORDER BY transaction_date DESC
    `, [startDate, endDate]);

    console.log(`Found ${combinedResult.rows.length} total transactions:`);
    console.table(combinedResult.rows);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

testCashFlowQuery();
