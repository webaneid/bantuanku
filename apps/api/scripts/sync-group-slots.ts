import { createDb } from "@bantuanku/db";
import { qurbanSharedGroups, qurbanOrders } from "@bantuanku/db";
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

async function syncGroupSlots() {
  console.log("Syncing shared group slots...\n");

  // Get all groups
  const groups = await db.select().from(qurbanSharedGroups);

  console.log(`Found ${groups.length} groups\n`);

  for (const group of groups) {
    console.log(`Group #${group.groupNumber} (current: ${group.slotsFilled}/${group.maxSlots})`);

    // Get orders in this group
    const orders = await db
      .select()
      .from(qurbanOrders)
      .where(eq(qurbanOrders.sharedGroupId, group.id));

    console.log(`  Total orders: ${orders.length}`);

    // Count orders with payment_status = "paid" (fully paid)
    let paidCount = 0;
    for (const order of orders) {
      if (order.paymentStatus === "paid") {
        paidCount++;
        console.log(`    ✓ ${order.orderNumber} (${order.donorName}) - LUNAS`);
      } else {
        console.log(`    ○ ${order.orderNumber} (${order.donorName}) - ${order.paymentStatus}`);
      }
    }

    console.log(`  Fully paid orders: ${paidCount}`);

    // Update group slots_filled
    const newStatus = paidCount >= group.maxSlots ? "full" : "open";

    if (paidCount !== group.slotsFilled || newStatus !== group.status) {
      console.log(`  → Updating: ${group.slotsFilled} → ${paidCount} slots, status: ${group.status} → ${newStatus}`);

      await db
        .update(qurbanSharedGroups)
        .set({
          slotsFilled: paidCount,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(qurbanSharedGroups.id, group.id));
    } else {
      console.log(`  ✓ Already synced`);
    }

    console.log();
  }

  console.log("✅ Sync completed!");
}

syncGroupSlots()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  });
