import { Hono } from "hono";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  qurbanPeriods,
  qurbanPackages,
  qurbanPackagePeriods,
  qurbanOrders,
  qurbanPayments,
  qurbanSharedGroups,
  qurbanExecutions,
  qurbanSavings,
  qurbanSavingsTransactions,
  users,
  donatur,
  createId,
} from "@bantuanku/db";
import { requireAuth } from "../../middleware/auth";
import { extractPath } from "./media";
import { getCurrentYearWIB } from "../../utils/timezone";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
app.use("*", requireAuth);

// ============================================================
// PERIODS CRUD
// ============================================================

// Get all periods
app.get("/periods", async (c) => {
  const db = c.get("db");

  const periods = await db
    .select()
    .from(qurbanPeriods)
    .orderBy(desc(qurbanPeriods.gregorianYear));

  return c.json({ data: periods });
});

// Get single period
app.get("/periods/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const period = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.id, id))
    .limit(1);

  if (period.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  // Get stats for this period
  const stats = await db
    .select({
      totalPackages: sql<number>`count(distinct ${qurbanPackages.id})`,
      totalOrders: sql<number>`count(distinct ${qurbanOrders.id})`,
      totalRevenue: sql<string>`coalesce(sum(${qurbanOrders.totalAmount}), 0)`,
      totalPaid: sql<string>`coalesce(sum(${qurbanOrders.paidAmount}), 0)`,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(qurbanOrders, eq(qurbanOrders.packagePeriodId, qurbanPackagePeriods.id))
    .where(eq(qurbanPackagePeriods.periodId, id));

  return c.json({
    data: period[0],
    stats: stats[0],
  });
});

// Get period detail with orders
app.get("/periods/:id/detail", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Get period
  const period = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.id, id))
    .limit(1);

  if (period.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  // Get all orders for this period with package details
  const orders = await db
    .select({
      order_id: qurbanOrders.id,
      order_number: qurbanOrders.orderNumber,
      animal_type: qurbanPackages.animalType,
      package_name: qurbanPackages.name,
      package_type: qurbanPackages.packageType,
      price: qurbanPackagePeriods.price,
      donor_name: qurbanOrders.donorName,
      donor_phone: qurbanOrders.donorPhone,
      on_behalf_of: qurbanOrders.onBehalfOf,
      quantity: qurbanOrders.quantity,
      payment_status: qurbanOrders.paymentStatus,
      order_status: qurbanOrders.orderStatus,
      shared_group_id: qurbanOrders.sharedGroupId,
      group_number: qurbanSharedGroups.groupNumber,
      group_max_slots: qurbanSharedGroups.maxSlots,
      created_at: qurbanOrders.createdAt,
    })
    .from(qurbanOrders)
    .leftJoin(qurbanPackagePeriods, eq(qurbanOrders.packagePeriodId, qurbanPackagePeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(qurbanSharedGroups, eq(qurbanOrders.sharedGroupId, qurbanSharedGroups.id))
    .where(eq(qurbanPackagePeriods.periodId, id))
    .orderBy(qurbanPackages.animalType, qurbanOrders.createdAt);

  // Calculate stats
  const totalOrders = orders.length;

  // Kambing: sum quantity (bisa pesan lebih dari 1 ekor)
  const goatOrders = orders.filter((o: any) => o.animal_type === "goat");
  const totalGoats = goatOrders.reduce((sum: number, o: any) => sum + Number(o.quantity), 0);

  // Sapi:
  // - Individual: sum quantity (bisa pesan lebih dari 1 ekor)
  // - Shared: 1 group = 1 ekor (quantity diabaikan)
  const cowOrders = orders.filter((o: any) => o.animal_type === "cow");
  const individualCowOrders = cowOrders.filter((o: any) => o.package_type === "individual");
  const individualCows = individualCowOrders.reduce((sum: number, o: any) => sum + Number(o.quantity), 0);
  const sharedCowOrders = cowOrders.filter((o: any) => o.package_type === "shared");
  const uniqueSharedGroups = new Set(
    sharedCowOrders
      .map((o: any) => o.shared_group_id)
      .filter((id: any) => id !== null)
  ).size;
  const totalCows = individualCows + uniqueSharedGroups;

  const paidOrders = orders.filter((o: any) => o.payment_status === "paid").length;
  const pendingOrders = orders.filter((o: any) => o.payment_status === "pending").length;
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.price), 0);

  return c.json({
    period: period[0],
    orders: orders,
    stats: {
      totalOrders,
      totalGoats,
      totalCows,
      totalRevenue,
      paidOrders,
      pendingOrders,
    },
  });
});

// Create period
app.post("/periods", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  const newPeriod = await db
    .insert(qurbanPeriods)
    .values({
      id: createId(),
      name: body.name,
      hijriYear: body.hijriYear,
      gregorianYear: body.gregorianYear,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      executionDate: new Date(body.executionDate),
      status: body.status || "draft",
      description: body.description,
    })
    .returning();

  return c.json({ data: newPeriod[0], message: "Period created successfully" });
});

// Update period
app.patch("/periods/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };

  if (body.name) updateData.name = body.name;
  if (body.hijriYear) updateData.hijriYear = body.hijriYear;
  if (body.gregorianYear) updateData.gregorianYear = body.gregorianYear;
  if (body.startDate) updateData.startDate = new Date(body.startDate);
  if (body.endDate) updateData.endDate = new Date(body.endDate);
  if (body.executionDate) updateData.executionDate = new Date(body.executionDate);
  if (body.status) updateData.status = body.status;
  if (body.description !== undefined) updateData.description = body.description;

  const updated = await db
    .update(qurbanPeriods)
    .set(updateData)
    .where(eq(qurbanPeriods.id, id))
    .returning();

  if (updated.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  return c.json({ data: updated[0], message: "Period updated successfully" });
});

// Delete period
app.delete("/periods/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const deleted = await db
    .delete(qurbanPeriods)
    .where(eq(qurbanPeriods.id, id))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  return c.json({ message: "Period deleted successfully" });
});

// ============================================================
// PACKAGES CRUD
// ============================================================

// Get all packages with their period associations
app.get("/packages", async (c) => {
  const db = c.get("db");
  const periodId = c.req.query("period_id");
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";

  // Get all packages
  const packages = await db
    .select()
    .from(qurbanPackages)
    .orderBy(desc(qurbanPackages.createdAt));

  // For each package, get its period associations
  const packagesWithPeriods: any[] = [];

  for (const pkg of packages) {
    const conditions = periodId
      ? and(
          eq(qurbanPackagePeriods.packageId, pkg.id),
          eq(qurbanPackagePeriods.periodId, periodId)
        )
      : eq(qurbanPackagePeriods.packageId, pkg.id);

    const periods = await db
      .select({
        packagePeriodId: qurbanPackagePeriods.id,
        periodId: qurbanPackagePeriods.periodId,
        periodName: qurbanPeriods.name,
        hijriYear: qurbanPeriods.hijriYear,
        gregorianYear: qurbanPeriods.gregorianYear,
        price: qurbanPackagePeriods.price,
        stock: qurbanPackagePeriods.stock,
        stockSold: qurbanPackagePeriods.stockSold,
        slotsFilled: qurbanPackagePeriods.slotsFilled,
        isAvailable: qurbanPackagePeriods.isAvailable,
        createdAt: qurbanPackagePeriods.createdAt,
      })
      .from(qurbanPackagePeriods)
      .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
      .where(conditions)
      .orderBy(desc(qurbanPeriods.gregorianYear));

    const imageUrl = pkg.imageUrl
      ? (pkg.imageUrl.startsWith('http://') || pkg.imageUrl.startsWith('https://'))
        ? pkg.imageUrl
        : `${apiUrl}${pkg.imageUrl}`
      : null;

    packagesWithPeriods.push({
      ...pkg,
      imageUrl,
      periods: periods,
    });
  }

  // If periodId filter is active, only return packages that have associations with that period
  const filteredPackages = periodId
    ? packagesWithPeriods.filter((pkg: any) => pkg.periods.length > 0)
    : packagesWithPeriods;

  return c.json({ data: filteredPackages });
});

// Get single package
app.get("/packages/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";

  const pkg = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, id))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  // Construct full URL for image (handles both GCS CDN and local paths)
  const constructUrl = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return urlOrPath;
    // If already full URL (GCS CDN), return as-is
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return urlOrPath;
    }
    // If relative path, prepend API URL
    return `${apiUrl}${urlOrPath}`;
  };

  // Get periods for this package
  const periods = await db
    .select({
      packagePeriodId: qurbanPackagePeriods.id,
      periodId: qurbanPackagePeriods.periodId,
      periodName: qurbanPeriods.name,
      hijriYear: qurbanPeriods.hijriYear,
      gregorianYear: qurbanPeriods.gregorianYear,
      price: qurbanPackagePeriods.price,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      isAvailable: qurbanPackagePeriods.isAvailable,
      createdAt: qurbanPackagePeriods.createdAt,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(eq(qurbanPackagePeriods.packageId, id));

  const enrichedPackage = {
    ...pkg[0],
    imageUrl: constructUrl(pkg[0].imageUrl),
    periods,
  };

  return c.json({ data: enrichedPackage });
});

// Create package with period associations
app.post("/packages", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  // Store GCS URLs as-is, extract path for local uploads
  const cleanImageUrl = body.imageUrl
    ? (body.imageUrl.startsWith('http://') || body.imageUrl.startsWith('https://'))
      ? body.imageUrl // Keep GCS CDN URL as-is
      : extractPath(body.imageUrl) // Extract path for local
    : null;

  // Create master package
  const newPackage = await db
    .insert(qurbanPackages)
    .values({
      id: createId(),
      animalType: body.animalType,
      packageType: body.packageType,
      name: body.name,
      description: body.description,
      imageUrl: cleanImageUrl,
      maxSlots: body.maxSlots,
      isAvailable: body.isAvailable ?? true,
      isFeatured: body.isFeatured ?? false,
    })
    .returning();

  // If periods data provided, create package-period associations
  if (body.periods && Array.isArray(body.periods) && body.periods.length > 0) {
    const packagePeriodValues = body.periods.map((period: any) => ({
      id: createId(),
      packageId: newPackage[0].id,
      periodId: period.periodId,
      price: period.price,
      stock: period.stock || 0,
      stockSold: 0,
      slotsFilled: 0,
      isAvailable: period.isAvailable ?? true,
    }));

    await db.insert(qurbanPackagePeriods).values(packagePeriodValues);
  }

  return c.json({ data: newPackage[0], message: "Package created successfully" });
});

// Update package master data and periods
app.patch("/packages/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };

  if (body.name) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.imageUrl !== undefined) {
    updateData.imageUrl = body.imageUrl
      ? (body.imageUrl.startsWith('http://') || body.imageUrl.startsWith('https://'))
        ? body.imageUrl // Keep GCS CDN URL as-is
        : extractPath(body.imageUrl) // Extract path for local
      : null;
  }
  if (body.maxSlots !== undefined) updateData.maxSlots = body.maxSlots;
  if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;
  if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
  if (body.animalType !== undefined) updateData.animalType = body.animalType;
  if (body.packageType !== undefined) updateData.packageType = body.packageType;

  const updated = await db
    .update(qurbanPackages)
    .set(updateData)
    .where(eq(qurbanPackages.id, id))
    .returning();

  if (updated.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  // Handle periods updates if provided
  if (body.periods && Array.isArray(body.periods)) {
    // Get existing period associations
    const existingPeriods = await db
      .select()
      .from(qurbanPackagePeriods)
      .where(eq(qurbanPackagePeriods.packageId, id));

    const existingMap = new Map(existingPeriods.map(p => [p.periodId, p]));
    const incomingPeriodIds = new Set(body.periods.map((p: any) => p.periodId));

    // Process each incoming period
    for (const period of body.periods) {
      const existing = existingMap.get(period.periodId);

      if (existing) {
        // Update existing association
        await db
          .update(qurbanPackagePeriods)
          .set({
            price: period.price,
            stock: period.stock || 0,
            isAvailable: period.isAvailable ?? true,
            updatedAt: new Date(),
          })
          .where(eq(qurbanPackagePeriods.id, existing.id));
      } else {
        // Insert new association
        await db.insert(qurbanPackagePeriods).values({
          id: createId(),
          packageId: id,
          periodId: period.periodId,
          price: period.price,
          stock: period.stock || 0,
          stockSold: 0,
          slotsFilled: 0,
          isAvailable: period.isAvailable ?? true,
        });
      }
    }

    // Delete period associations that are no longer in the list
    // Only delete if there are no orders referencing them
    for (const existing of existingPeriods) {
      if (!incomingPeriodIds.has(existing.periodId)) {
        // Check if there are orders for this package-period
        const orders = await db
          .select({ id: qurbanOrders.id })
          .from(qurbanOrders)
          .where(eq(qurbanOrders.packagePeriodId, existing.id))
          .limit(1);

        if (orders.length === 0) {
          // No orders, safe to delete
          await db.delete(qurbanPackagePeriods).where(eq(qurbanPackagePeriods.id, existing.id));
        } else {
          // Has orders, mark as unavailable instead of deleting
          await db
            .update(qurbanPackagePeriods)
            .set({
              isAvailable: false,
              updatedAt: new Date(),
            })
            .where(eq(qurbanPackagePeriods.id, existing.id));
        }
      }
    }
  }

  return c.json({ data: updated[0], message: "Package updated successfully" });
});

// Delete package
app.delete("/packages/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const deleted = await db
    .delete(qurbanPackages)
    .where(eq(qurbanPackages.id, id))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  return c.json({ message: "Package deleted successfully" });
});

// ============================================================
// PACKAGE-PERIOD ASSOCIATIONS
// ============================================================

// Add package to a period with specific pricing
app.post("/packages/:packageId/periods", async (c) => {
  const db = c.get("db");
  const { packageId } = c.req.param();
  const body = await c.req.json();

  // Check if package exists
  const pkg = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, packageId))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  // Check if period exists
  const period = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.id, body.periodId))
    .limit(1);

  if (period.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  // Check if association already exists
  const existing = await db
    .select()
    .from(qurbanPackagePeriods)
    .where(
      and(
        eq(qurbanPackagePeriods.packageId, packageId),
        eq(qurbanPackagePeriods.periodId, body.periodId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Package already associated with this period" }, 400);
  }

  // Create association
  const newAssociation = await db
    .insert(qurbanPackagePeriods)
    .values({
      id: createId(),
      packageId: packageId,
      periodId: body.periodId,
      price: body.price,
      stock: body.stock || 0,
      stockSold: 0,
      slotsFilled: 0,
      isAvailable: body.isAvailable ?? true,
    })
    .returning();

  return c.json({
    data: newAssociation[0],
    message: "Package successfully added to period",
  });
});

// Update package-period association (price, stock, availability for specific period)
app.patch("/package-periods/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };

  if (body.price !== undefined) updateData.price = body.price;
  if (body.stock !== undefined) updateData.stock = body.stock;
  if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;

  const updated = await db
    .update(qurbanPackagePeriods)
    .set(updateData)
    .where(eq(qurbanPackagePeriods.id, id))
    .returning();

  if (updated.length === 0) {
    return c.json({ error: "Package-period association not found" }, 404);
  }

  return c.json({
    data: updated[0],
    message: "Package-period association updated successfully",
  });
});

// Remove package from a period
app.delete("/package-periods/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Check if there are existing orders for this package-period
  const orders = await db
    .select({ id: qurbanOrders.id })
    .from(qurbanOrders)
    .where(eq(qurbanOrders.packagePeriodId, id))
    .limit(1);

  if (orders.length > 0) {
    return c.json({
      error: "Cannot delete package-period association with existing orders",
    }, 400);
  }

  const deleted = await db
    .delete(qurbanPackagePeriods)
    .where(eq(qurbanPackagePeriods.id, id))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Package-period association not found" }, 404);
  }

  return c.json({ message: "Package removed from period successfully" });
});

// Get all packages for a specific period
app.get("/periods/:periodId/packages", async (c) => {
  const db = c.get("db");
  const { periodId } = c.req.param();
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";

  const packages = await db
    .select({
      packagePeriodId: qurbanPackagePeriods.id,
      packageId: qurbanPackages.id,
      name: qurbanPackages.name,
      description: qurbanPackages.description,
      imageUrl: qurbanPackages.imageUrl,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      maxSlots: qurbanPackages.maxSlots,
      isFeatured: qurbanPackages.isFeatured,
      price: qurbanPackagePeriods.price,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      isAvailable: sql<boolean>`${qurbanPackages.isAvailable} AND ${qurbanPackagePeriods.isAvailable}`,
      createdAt: qurbanPackagePeriods.createdAt,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(eq(qurbanPackagePeriods.periodId, periodId))
    .orderBy(qurbanPackages.animalType, qurbanPackages.name);

  // Construct full URLs for images
  const enrichedPackages = packages.map((pkg: any) => ({
    ...pkg,
    imageUrl: pkg.imageUrl
      ? (pkg.imageUrl.startsWith('http://') || pkg.imageUrl.startsWith('https://'))
        ? pkg.imageUrl
        : `${apiUrl}${pkg.imageUrl}`
      : null,
  }));

  return c.json({ data: enrichedPackages });
});

// ============================================================
// ORDERS MANAGEMENT
// ============================================================

// Get all orders
app.get("/orders", async (c) => {
  const db = c.get("db");
  const periodId = c.req.query("period_id");
  const status = c.req.query("status");
  const paymentStatus = c.req.query("payment_status");

  const orders = await db
    .select({
      id: qurbanOrders.id,
      order_number: qurbanOrders.orderNumber,
      donor_name: qurbanOrders.donorName,
      donor_phone: qurbanOrders.donorPhone,
      donor_email: qurbanOrders.donorEmail,
      package_id: qurbanOrders.packageId,
      package_period_id: qurbanOrders.packagePeriodId,
      package_name: qurbanPackages.name,
      animal_type: qurbanPackages.animalType,
      package_type: qurbanPackages.packageType,
      period_id: qurbanPackagePeriods.periodId,
      period_name: qurbanPeriods.name,
      quantity: qurbanOrders.quantity,
      total_amount: qurbanOrders.totalAmount,
      paid_amount: qurbanOrders.paidAmount,
      payment_method: qurbanOrders.paymentMethod,
      payment_status: qurbanOrders.paymentStatus,
      order_status: qurbanOrders.orderStatus,
      on_behalf_of: qurbanOrders.onBehalfOf,
      created_at: qurbanOrders.createdAt,
      confirmed_at: qurbanOrders.confirmedAt,
      shared_group_id: qurbanOrders.sharedGroupId,
    })
    .from(qurbanOrders)
    .leftJoin(qurbanPackagePeriods, eq(qurbanOrders.packagePeriodId, qurbanPackagePeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .orderBy(desc(qurbanOrders.createdAt));

  return c.json({ data: orders });
});

// Get single order detail
app.get("/orders/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const order = await db
    .select({
      id: qurbanOrders.id,
      order_number: qurbanOrders.orderNumber,
      period_id: qurbanPackagePeriods.periodId,
      package_id: qurbanOrders.packageId,
      package_period_id: qurbanOrders.packagePeriodId,
      donor_name: qurbanOrders.donorName,
      donor_phone: qurbanOrders.donorPhone,
      donor_email: qurbanOrders.donorEmail,
      shared_group_id: qurbanOrders.sharedGroupId,
      payment_method: qurbanOrders.paymentMethod,
      total_amount: qurbanOrders.totalAmount,
      paid_amount: qurbanOrders.paidAmount,
      payment_status: qurbanOrders.paymentStatus,
      order_status: qurbanOrders.orderStatus,
      installment_count: qurbanOrders.installmentCount,
      installment_frequency: qurbanOrders.installmentFrequency,
      notes: qurbanOrders.notes,
      created_at: qurbanOrders.createdAt,
      confirmed_at: qurbanOrders.confirmedAt,
      package_name: qurbanPackages.name,
      period_name: qurbanPeriods.name,
      animal_type: qurbanPackages.animalType,
      package_type: qurbanPackages.packageType,
    })
    .from(qurbanOrders)
    .leftJoin(qurbanPackagePeriods, eq(qurbanOrders.packagePeriodId, qurbanPackagePeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Get payments history
  const payments = await db
    .select()
    .from(qurbanPayments)
    .where(eq(qurbanPayments.orderId, id))
    .orderBy(desc(qurbanPayments.paymentDate));

  // Construct full URL for payment proofs
  const apiUrl = (c.env as any)?.API_URL || process.env.API_URL || "http://localhost:50245";
  const paymentsWithUrls = payments.map((payment: any) => ({
    id: payment.id,
    order_id: payment.orderId,
    amount: payment.amount,
    payment_method: payment.paymentMethod,
    payment_proof_url: payment.paymentProof ? `${apiUrl}${payment.paymentProof}` : null,
    status: payment.status,
    notes: payment.notes,
    created_at: payment.createdAt,
    verified_at: payment.verifiedAt,
    verified_by: payment.verifiedBy,
  }));

  return c.json({
    order: order[0],
    payments: paymentsWithUrls,
  });
});

// Create order manually
app.post("/orders", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  // Get package details to check if it's shared
  const packageData = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, body.packageId))
    .limit(1);

  if (packageData.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  const pkg = packageData[0];
  let assignedGroupId = body.sharedGroupId || null;

  // If package is shared type, find or create a shared group
  if (pkg.packageType === "shared") {
    // Find an open group with available slots
    const availableGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(
        and(
          eq(qurbanSharedGroups.packageId, body.packageId),
          eq(qurbanSharedGroups.status, "open"),
          sql`${qurbanSharedGroups.slotsFilled} < ${qurbanSharedGroups.maxSlots}`
        )
      )
      .limit(1);

    if (availableGroup.length > 0) {
      // Use existing group
      assignedGroupId = availableGroup[0].id;
    } else {
      // Create new group
      if (!pkg.maxShares) {
        return c.json({ error: "Package maxShares not configured" }, 400);
      }
      const maxSlots = pkg.maxShares;

      // Get next group number for this package
      const existingGroups = await db
        .select()
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packageId, body.packageId))
        .orderBy(desc(qurbanSharedGroups.groupNumber));

      const nextGroupNumber = existingGroups.length > 0
        ? existingGroups[0].groupNumber + 1
        : 1;

      const newGroup = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: body.packageId,
          groupNumber: nextGroupNumber,
          maxSlots: maxSlots,
          slotsFilled: 0,
          status: "open",
        })
        .returning();

      assignedGroupId = newGroup[0].id;
    }
  }

  const newOrder = await db
    .insert(qurbanOrders)
    .values({
      id: createId(),
      orderNumber: body.orderNumber || `ORD-QBN-${getCurrentYearWIB()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      userId: body.userId || null,
      donorName: body.donorName,
      donorEmail: body.donorEmail || null,
      donorPhone: body.donorPhone,
      packageId: body.packageId,
      sharedGroupId: assignedGroupId,
      quantity: body.quantity || 1,
      unitPrice: body.unitPrice,
      totalAmount: body.totalAmount,
      paymentMethod: body.paymentMethod || "full",
      installmentFrequency: body.installmentFrequency || null,
      installmentCount: body.installmentCount || null,
      installmentAmount: body.installmentAmount || null,
      paidAmount: body.paidAmount || 0,
      paymentStatus: body.paymentStatus || "pending",
      orderStatus: body.orderStatus || "pending",
      onBehalfOf: body.onBehalfOf || body.donorName, // Default to donor name if not provided
      orderDate: new Date(),
      notes: body.notes || null,
    })
    .returning();

  // Note: slots_filled will be incremented only after payment is verified
  // This ensures only paid members count toward the group slots

  // If payment proof uploaded, create payment record (pending verification)
  if (body.paymentProofUrl) {
    const paymentId = createId();
    const timestamp = getCurrentYearWIB();
    const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();

    await db.insert(qurbanPayments).values({
      id: paymentId,
      paymentNumber: `PAY-QBN-${timestamp}-${randomStr}`,
      orderId: newOrder[0].id,
      amount: body.paidAmount || body.totalAmount,
      paymentMethod: "bank_transfer",
      paymentChannel: body.paymentChannel || null,
      paymentProof: extractPath(body.paymentProofUrl),
      status: "pending", // Always pending, needs admin verification
      installmentNumber: body.paymentMethod === "installment" ? 1 : null,
      notes: "Pembayaran awal - menunggu verifikasi",
    });
  }

  return c.json({ data: newOrder[0], message: "Order created successfully" });
});

// Confirm order
app.post("/orders/:id/confirm", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const updated = await db
    .update(qurbanOrders)
    .set({
      orderStatus: "confirmed",
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(qurbanOrders.id, id))
    .returning();

  if (updated.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json({ data: updated[0], message: "Order confirmed successfully" });
});

// Cancel order
app.post("/orders/:id/cancel", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Get order info
  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // If shared group, release slot
  if (order[0].sharedGroupId) {
    await db
      .update(qurbanSharedGroups)
      .set({
        slotsFilled: sql`${qurbanSharedGroups.slotsFilled} - 1`,
        status: "open",
        updatedAt: new Date(),
      })
      .where(eq(qurbanSharedGroups.id, order[0].sharedGroupId));
  }

  // Update order status
  const updated = await db
    .update(qurbanOrders)
    .set({
      orderStatus: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(qurbanOrders.id, id))
    .returning();

  return c.json({ data: updated[0], message: "Order cancelled successfully" });
});

// ============================================================
// PAYMENT VERIFICATION
// ============================================================

// Get all payments
app.get("/payments", async (c) => {
  const db = c.get("db");
  const status = c.req.query("status");

  let query = db
    .select({
      id: qurbanPayments.id,
      payment_number: qurbanPayments.paymentNumber,
      order_id: qurbanPayments.orderId,
      order_number: qurbanOrders.orderNumber,
      donor_name: qurbanOrders.donorName,
      package_name: qurbanPackages.name,
      amount: qurbanPayments.amount,
      payment_method: qurbanPayments.paymentMethod,
      payment_channel: qurbanPayments.paymentChannel,
      payment_proof: qurbanPayments.paymentProof,
      status: qurbanPayments.status,
      installment_number: qurbanPayments.installmentNumber,
      notes: qurbanPayments.notes,
      created_at: qurbanPayments.createdAt,
      verified_at: qurbanPayments.verifiedAt,
      verified_by: qurbanPayments.verifiedBy,
    })
    .from(qurbanPayments)
    .leftJoin(qurbanOrders, eq(qurbanPayments.orderId, qurbanOrders.id))
    .leftJoin(qurbanPackages, eq(qurbanOrders.packageId, qurbanPackages.id))
    .orderBy(desc(qurbanPayments.createdAt));

  if (status) {
    query = query.where(eq(qurbanPayments.status, status)) as any;
  }

  const payments = await query;

  // Construct full URL for payment proofs
  const apiUrl = (c.env as any)?.API_URL || process.env.API_URL || "http://localhost:50245";
  const paymentsWithUrls = payments.map((payment: any) => ({
    ...payment,
    payment_proof_url: payment.payment_proof ? `${apiUrl}${payment.payment_proof}` : null,
    payment_proof: undefined, // Remove path field
  }));

  return c.json({ data: paymentsWithUrls });
});

// Verify payment
app.post("/payments/:id/verify", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");

  // Get payment info
  const payment = await db
    .select()
    .from(qurbanPayments)
    .where(eq(qurbanPayments.id, id))
    .limit(1);

  if (payment.length === 0) {
    return c.json({ error: "Payment not found" }, 404);
  }

  // Check if payment already verified
  if (payment[0].status === "verified") {
    return c.json({ error: "Payment already verified" }, 400);
  }

  // Check if this order already has verified payment (for slot counting)
  const existingVerifiedPayments = await db
    .select()
    .from(qurbanPayments)
    .where(
      and(
        eq(qurbanPayments.orderId, payment[0].orderId),
        eq(qurbanPayments.status, "verified")
      )
    );

  const isFirstVerifiedPayment = existingVerifiedPayments.length === 0;

  // Update payment status
  await db
    .update(qurbanPayments)
    .set({
      status: "verified",
      verifiedBy: user.id,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(qurbanPayments.id, id));

  // Update order paid amount
  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, payment[0].orderId))
    .limit(1);

  const newPaidAmount = Number(order[0].paidAmount) + Number(payment[0].amount);
  const totalAmount = Number(order[0].totalAmount);

  const newPaymentStatus = newPaidAmount >= totalAmount ? "paid" : "partial";

  await db
    .update(qurbanOrders)
    .set({
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      updatedAt: new Date(),
    })
    .where(eq(qurbanOrders.id, payment[0].orderId));

  // If order is in a shared group, payment verified, AND order becomes fully paid, increment slots_filled
  // Only increment when order becomes "paid" (fully paid) for the first time
  const wasPreviouslyPaid = order[0].paymentStatus === "paid";
  const isNowPaid = newPaymentStatus === "paid";

  if (order[0].sharedGroupId && isNowPaid && !wasPreviouslyPaid) {
    const currentGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(eq(qurbanSharedGroups.id, order[0].sharedGroupId))
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
        .where(eq(qurbanSharedGroups.id, order[0].sharedGroupId));
    }
  }

  return c.json({ message: "Payment verified successfully" });
});

// Reject payment
app.post("/payments/:id/reject", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");
  const body = await c.req.json();

  await db
    .update(qurbanPayments)
    .set({
      status: "rejected",
      verifiedBy: user.id,
      verifiedAt: new Date(),
      notes: body.notes,
      updatedAt: new Date(),
    })
    .where(eq(qurbanPayments.id, id));

  return c.json({ message: "Payment rejected" });
});

// ============================================================
// SHARED GROUPS MANAGEMENT
// ============================================================

// Get all shared groups with members
app.get("/shared-groups", async (c) => {
  const db = c.get("db");

  const groups = await db
    .select({
      id: qurbanSharedGroups.id,
      package_id: qurbanSharedGroups.packageId,
      group_number: qurbanSharedGroups.groupNumber,
      max_slots: qurbanSharedGroups.maxSlots,
      slots_filled: qurbanSharedGroups.slotsFilled,
      status: qurbanSharedGroups.status,
      created_at: qurbanSharedGroups.createdAt,
      package_name: qurbanPackages.name,
      animal_type: qurbanPackages.animalType,
    })
    .from(qurbanSharedGroups)
    .leftJoin(qurbanPackages, eq(qurbanSharedGroups.packageId, qurbanPackages.id))
    .orderBy(desc(qurbanSharedGroups.createdAt));

  return c.json({ data: groups });
});

// Get shared group detail with members
app.get("/shared-groups/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Get group info
  const group = await db
    .select({
      id: qurbanSharedGroups.id,
      package_id: qurbanSharedGroups.packageId,
      group_number: qurbanSharedGroups.groupNumber,
      max_slots: qurbanSharedGroups.maxSlots,
      slots_filled: qurbanSharedGroups.slotsFilled,
      status: qurbanSharedGroups.status,
      created_at: qurbanSharedGroups.createdAt,
      package_name: qurbanPackages.name,
      animal_type: qurbanPackages.animalType,
    })
    .from(qurbanSharedGroups)
    .leftJoin(qurbanPackages, eq(qurbanSharedGroups.packageId, qurbanPackages.id))
    .where(eq(qurbanSharedGroups.id, id))
    .limit(1);

  if (group.length === 0) {
    return c.json({ error: "Group not found" }, 404);
  }

  // Get members (orders)
  const members = await db
    .select({
      order_id: qurbanOrders.id,
      order_number: qurbanOrders.orderNumber,
      donor_name: qurbanOrders.donorName,
      donor_phone: qurbanOrders.donorPhone,
      order_status: qurbanOrders.orderStatus,
      payment_status: qurbanOrders.paymentStatus,
      total_amount: qurbanOrders.totalAmount,
      paid_amount: qurbanOrders.paidAmount,
      created_at: qurbanOrders.createdAt,
    })
    .from(qurbanOrders)
    .where(eq(qurbanOrders.sharedGroupId, id))
    .orderBy(qurbanOrders.createdAt);

  return c.json({
    group: group[0],
    members: members,
  });
});

// ============================================================
// SAVINGS MANAGEMENT
// ============================================================

// Get all savings
app.get("/savings", async (c) => {
  const db = c.get("db");
  const { status, period_id } = c.req.query();

  let query = db
    .select()
    .from(qurbanSavings)
    .orderBy(desc(qurbanSavings.createdAt))
    .$dynamic();

  if (status) {
    query = query.where(eq(qurbanSavings.status, status as any));
  }
  if (period_id) {
    query = query.where(eq(qurbanSavings.targetPeriodId, period_id));
  }

  const savings = await query;
  return c.json({ data: savings });
});

// Get single savings detail with transactions
app.get("/savings/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  const savingsData = await db
    .select()
    .from(qurbanSavings)
    .where(eq(qurbanSavings.id, id))
    .limit(1);

  if (savingsData.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  // Get transactions
  const transactions = await db
    .select()
    .from(qurbanSavingsTransactions)
    .where(eq(qurbanSavingsTransactions.savingsId, id))
    .orderBy(desc(qurbanSavingsTransactions.createdAt));

  return c.json({
    data: {
      savings: savingsData[0],
      transactions,
    },
  });
});

// ============================================================
// DONATUR MANAGEMENT (for qurban orders)
// ============================================================

// Get all donaturs
app.get("/donaturs", async (c) => {
  const db = c.get("db");
  const search = c.req.query("search");

  let query = db
    .select({
      id: donatur.id,
      name: donatur.name,
      email: donatur.email,
      phone: donatur.phone,
    })
    .from(donatur)
    .orderBy(donatur.name)
    .$dynamic();

  if (search) {
    query = query.where(
      sql`${donatur.name} ILIKE ${`%${search}%`} OR ${donatur.phone} ILIKE ${`%${search}%`}`
    );
  }

  const donaturs = await query;
  return c.json({ data: donaturs });
});

// Create donatur (simplified for qurban orders)
app.post("/donaturs", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  // Validate required fields
  if (!body.name || !body.email) {
    return c.json({ error: "Nama dan email wajib diisi" }, 400);
  }

  // Check if email already exists
  const existing = await db
    .select({ id: donatur.id })
    .from(donatur)
    .where(eq(donatur.email, body.email))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Email sudah terdaftar" }, 400);
  }

  const newDonatur = await db
    .insert(donatur)
    .values({
      id: createId(),
      name: body.name,
      email: body.email,
      phone: body.phone || null,
    })
    .returning();

  return c.json({ data: newDonatur[0], message: "Donatur created successfully" });
});

export default app;
