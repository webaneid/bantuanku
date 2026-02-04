import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./src/schema/index.ts";
import { createId } from "./src/utils.ts";

async function insertIPaymuGateway() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Inserting iPaymu gateway...");

  try {
    // Insert iPaymu gateway
    const result = await db.insert(schema.paymentGateways).values({
      id: createId(),
      code: "ipaymu",
      name: "iPaymu",
      description: "Payment gateway iPaymu - Virtual Account, QRIS, E-wallet, dan lainnya",
      type: "auto",
      isActive: true,
      sortOrder: 3,
    }).onConflictDoNothing();

    console.log("✅ iPaymu gateway inserted successfully!");

    // Verify
    const gateway = await db.query.paymentGateways.findFirst({
      where: (gateways, { eq }) => eq(gateways.code, "ipaymu"),
    });

    if (gateway) {
      console.log("\n✅ Verified - iPaymu gateway exists:");
      console.log(JSON.stringify(gateway, null, 2));
    } else {
      console.log("⚠️  Gateway might already exist (ON CONFLICT DO NOTHING)");

      // Try to fetch it anyway
      const existing = await db.query.paymentGateways.findFirst({
        where: (gateways, { eq }) => eq(gateways.code, "ipaymu"),
      });

      if (existing) {
        console.log("Found existing gateway:");
        console.log(JSON.stringify(existing, null, 2));
      }
    }
  } catch (error) {
    console.error("❌ Error inserting gateway:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

insertIPaymuGateway().catch(console.error);
