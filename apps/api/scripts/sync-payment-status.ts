import { createDb } from "@bantuanku/db";
import { qurbanOrders } from "@bantuanku/db";
import { eq } from "drizzle-orm";
import * as path from "path";
import * as fs from "fs";

// Load .dev.vars
const devVarsPath = path.join(process.cwd(), ".dev.vars");
if (fs.existsSync(devVarsPath)) {
  const envContent = fs.readFileSync(devVarsPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const db = createDb(databaseUrl);

async function syncPaymentStatus() {
  console.log("Syncing order payment_status based on paid_amount...\n");

  const allOrders = await db.select().from(qurbanOrders);

  console.log(`Found ${allOrders.length} orders\n`);

  let updatedCount = 0;

  for (const order of allOrders) {
    const paidAmount = Number(order.paidAmount);
    const totalAmount = Number(order.totalAmount);

    let expectedStatus: "pending" | "partial" | "paid";
    if (paidAmount >= totalAmount) {
      expectedStatus = "paid";
    } else if (paidAmount > 0) {
      expectedStatus = "partial";
    } else {
      expectedStatus = "pending";
    }

    if (order.paymentStatus !== expectedStatus) {
      console.log(`${order.orderNumber} (${order.donorName})`);
      console.log(`  Paid: ${paidAmount} / ${totalAmount}`);
      console.log(`  Status: ${order.paymentStatus} → ${expectedStatus}`);

      await db
        .update(qurbanOrders)
        .set({
          paymentStatus: expectedStatus,
          updatedAt: new Date(),
        })
        .where(eq(qurbanOrders.id, order.id));

      updatedCount++;
      console.log();
    }
  }

  console.log(`✅ Updated ${updatedCount} orders`);
}

syncPaymentStatus()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  });
