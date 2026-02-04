import { createDb } from "@bantuanku/db";
import {
  qurbanOrders,
  qurbanPackages,
  qurbanSharedGroups,
  createId,
} from "@bantuanku/db";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import * as dotenv from "dotenv";
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

async function migrateSharedOrders() {
  console.log("Starting migration of shared orders...");

  // Get all orders without shared_group_id
  const allOrders = await db
    .select()
    .from(qurbanOrders)
    .where(isNull(qurbanOrders.sharedGroupId));

  console.log(`Found ${allOrders.length} orders without groups`);

  const ordersToMigrate = [];

  // Filter only shared packages
  for (const order of allOrders) {
    const pkg = await db
      .select()
      .from(qurbanPackages)
      .where(eq(qurbanPackages.id, order.packageId))
      .limit(1);

    if (pkg.length > 0 && pkg[0].packageType === "shared") {
      ordersToMigrate.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        donorName: order.donorName,
        packageId: order.packageId,
        packageMaxShares: pkg[0].maxShares,
      });
    }
  }

  console.log(`Found ${ordersToMigrate.length} shared orders to migrate`);

  for (const order of ordersToMigrate) {
    console.log(`\nProcessing order ${order.orderNumber} (${order.donorName})`);

    // Find or create shared group
    const availableGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(
        and(
          eq(qurbanSharedGroups.packageId, order.packageId),
          eq(qurbanSharedGroups.status, "open"),
          sql`${qurbanSharedGroups.slotsFilled} < ${qurbanSharedGroups.maxSlots}`
        )
      )
      .limit(1);

    let assignedGroupId: string;

    if (availableGroup.length > 0) {
      console.log(`  → Using existing group #${availableGroup[0].groupNumber}`);
      assignedGroupId = availableGroup[0].id;
    } else {
      // Create new group
      if (!order.packageMaxShares) {
        console.error(`  ❌ Package maxShares not configured for ${order.orderNumber}`);
        continue;
      }
      const maxSlots = order.packageMaxShares;

      // Get next group number
      const existingGroups = await db
        .select()
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packageId, order.packageId))
        .orderBy(desc(qurbanSharedGroups.groupNumber));

      const nextGroupNumber = existingGroups.length > 0
        ? existingGroups[0].groupNumber + 1
        : 1;

      const newGroup = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: order.packageId,
          groupNumber: nextGroupNumber,
          maxSlots: maxSlots,
          slotsFilled: 0,
          status: "open",
        })
        .returning();

      console.log(`  → Created new group #${nextGroupNumber}`);
      assignedGroupId = newGroup[0].id;
    }

    // Update order
    await db
      .update(qurbanOrders)
      .set({
        sharedGroupId: assignedGroupId,
        updatedAt: new Date(),
      })
      .where(eq(qurbanOrders.id, order.orderId));

    // Update group slots
    const currentGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(eq(qurbanSharedGroups.id, assignedGroupId))
      .limit(1);

    if (currentGroup.length > 0) {
      const newSlotsFilled = currentGroup[0].slotsFilled + 1;
      const newStatus = newSlotsFilled >= currentGroup[0].maxSlots ? "full" : "open";

      await db
        .update(qurbanSharedGroups)
        .set({
          slotsFilled: newSlotsFilled,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(qurbanSharedGroups.id, assignedGroupId));

      console.log(`  → Updated group: ${newSlotsFilled}/${currentGroup[0].maxSlots} slots filled (${newStatus})`);
    }
  }

  console.log("\n✅ Migration completed!");
}

migrateSharedOrders()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });
