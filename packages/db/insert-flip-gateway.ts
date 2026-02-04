import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./src/schema/index.ts";
import { createId } from "./src/utils.ts";

async function insertFlipGateway() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Inserting Flip gateway...");

  try {
    // Insert Flip gateway
    const result = await db.insert(schema.paymentGateways).values({
      id: createId(),
      code: "flip",
      name: "Flip",
      description: "Payment gateway Flip - Virtual Account dan Payment Link",
      type: "auto",
      isActive: true,
      sortOrder: 4,
    }).onConflictDoNothing();

    console.log("✅ Flip gateway inserted successfully!");

    // Verify
    const gateway = await db.query.paymentGateways.findFirst({
      where: (gateways, { eq }) => eq(gateways.code, "flip"),
    });

    if (gateway) {
      console.log("\n✅ Verified - Flip gateway exists:");
      console.log(JSON.stringify(gateway, null, 2));
    } else {
      console.log("⚠️  Gateway might already exist (ON CONFLICT DO NOTHING)");

      // Try to fetch it anyway
      const existing = await db.query.paymentGateways.findFirst({
        where: (gateways, { eq }) => eq(gateways.code, "flip"),
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

insertFlipGateway().catch(console.error);
