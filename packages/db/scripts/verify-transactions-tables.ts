import "dotenv/config";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = postgres(connectionString);

  try {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('transactions', 'transaction_payments')
      ORDER BY table_name
    `;

    console.log("✅ Tables found:", result.map(r => r.table_name));

    // Verify columns in transactions table
    const transactionsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `;

    console.log("\n📋 Transactions table columns:");
    transactionsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Verify columns in transaction_payments table
    const paymentsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transaction_payments'
      ORDER BY ordinal_position
    `;

    console.log("\n📋 Transaction_payments table columns:");
    paymentsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Verify indexes
    const indexes = await sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('transactions', 'transaction_payments')
      ORDER BY tablename, indexname
    `;

    console.log("\n🔍 Indexes:");
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}.${idx.indexname}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
