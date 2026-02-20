import { Hono } from "hono";
import { eq, desc, and, sql, inArray, isNull } from "drizzle-orm";
import {
  qurbanPeriods,
  qurbanPackages,
  qurbanPackagePeriods,
  qurbanOrders,
  qurbanPayments,
  qurbanSharedGroups,
  qurbanExecutions,
  revenueShares,
  transactions,
  users,
  donatur,
  mitra,
  createId,
} from "@bantuanku/db";
import { requireAuth, requireRole } from "../../middleware/auth";
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
    .where(isNull(qurbanPeriods.mitraId))
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
  const user = c.get("user");
  const { id } = c.req.param();
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

  // Get period
  const period = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.id, id))
    .limit(1);

  if (period.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  // Get all package_period_ids for this period
  const packagePeriods = await db
    .select({
      id: qurbanPackagePeriods.id,
      packageId: qurbanPackagePeriods.packageId,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(
      and(
        eq(qurbanPackagePeriods.periodId, id),
        ...(isMitra && user ? [eq(qurbanPackages.createdBy, user.id)] : [])
      )
    );

  const packagePeriodIds = packagePeriods.map((pp: any) => pp.id);

  // Get transactions for this period from universal transactions table
  const { transactions } = await import("@bantuanku/db");
  const { inArray } = await import("drizzle-orm");

  const rawTransactions = packagePeriodIds.length > 0
    ? await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.productType, "qurban"),
            inArray(transactions.productId, packagePeriodIds),
            sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`
          )
        )
        .orderBy(transactions.createdAt)
    : [];

  // Get package details for mapping
  const packages = await db
    .select()
    .from(qurbanPackages)
    .leftJoin(qurbanPackagePeriods, eq(qurbanPackages.id, qurbanPackagePeriods.packageId))
    .where(inArray(qurbanPackagePeriods.id, packagePeriodIds.length > 0 ? packagePeriodIds : ['']));

  const packageMap = new Map();
  packages.forEach((p: any) => {
    packageMap.set(p.qurban_package_periods.id, {
      animalType: p.qurban_packages.animalType,
      packageName: p.qurban_packages.name,
      packageType: p.qurban_packages.packageType,
      price: p.qurban_package_periods.price,
    });
  });

  // Map transactions to orders format
  const orders = rawTransactions.map((t: any) => {
    const pkgInfo = packageMap.get(t.productId) || {};
    const typeData = t.typeSpecificData || {};

    return {
      order_id: t.id,
      order_number: t.transactionNumber,
      animal_type: typeData.animal_type || pkgInfo.animalType,
      package_name: t.productName,
      package_type: typeData.package_type || pkgInfo.packageType,
      price: t.totalAmount,
      donor_name: t.donorName,
      donor_phone: t.donorPhone || '',
      on_behalf_of: typeData.on_behalf_of || t.donorName,
      quantity: t.quantity,
      payment_status: t.paymentStatus,
      order_status: t.paymentStatus,
      shared_group_id: typeData.shared_group_id || null,
      group_number: typeData.group_number || null,
      group_max_slots: typeData.group_max_slots || null,
      created_at: t.createdAt,
    };
  });

  // Calculate stats
  const totalOrders = orders.length;

  // Kambing: sum quantity
  const goatOrders = orders.filter((o: any) => o.animal_type === "goat");
  const totalGoats = goatOrders.reduce((sum: number, o: any) => sum + Number(o.quantity), 0);

  // Sapi
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
  const pendingOrders = orders.filter((o: any) => o.payment_status === "pending" || o.payment_status === "partial").length;
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

// Create period (global only - mitra is not allowed)
app.post("/periods", requireRole("super_admin", "admin_campaign"), async (c) => {
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
      mitraId: null,
    })
    .returning();

  return c.json({ data: newPeriod[0], message: "Period created successfully" });
});

// Update period (global only - mitra is not allowed)
app.patch("/periods/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
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

// Delete period (global only - mitra is not allowed)
app.delete("/periods/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
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
  const user = c.get("user");
  const periodId = c.req.query("period_id");
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";

  // If mitra, only show own packages
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  const packageConditions: any[] = [];
  if (isMitra && user) packageConditions.push(eq(qurbanPackages.createdBy, user.id));
  const packageWhere = packageConditions.length > 0 ? and(...packageConditions) : undefined;

  // Get all packages
  const packages = await db
    .select()
    .from(qurbanPackages)
    .where(packageWhere)
    .orderBy(desc(qurbanPackages.createdAt));

  // For each package, get its period associations
  const packagesWithPeriods: any[] = [];

  for (const pkg of packages) {
    let periodConditions: any[] = [eq(qurbanPackagePeriods.packageId, pkg.id)];
    if (periodId) {
      periodConditions.push(eq(qurbanPackagePeriods.periodId, periodId));
    }
    const conditions = and(...periodConditions);

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
        executionDateOverride: qurbanPackagePeriods.executionDateOverride,
        executionTimeNote: qurbanPackagePeriods.executionTimeNote,
        executionLocation: qurbanPackagePeriods.executionLocation,
        executionNotes: qurbanPackagePeriods.executionNotes,
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

  // If period filter is active, only return packages that have associations
  const filteredPackages = periodId
    ? packagesWithPeriods.filter((pkg: any) => pkg.periods.length > 0)
    : packagesWithPeriods;

  return c.json({ data: filteredPackages });
});

// Get single package (supports both master package ID and package-period ID)
app.get("/packages/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

  // First, try to find as master package ID
  const pkg = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, id))
    .limit(1);

  if (pkg.length > 0) {
    if (isMitra) {
      if (pkg[0].createdBy && pkg[0].createdBy !== user!.id) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!pkg[0].createdBy) {
        const mitraRecord = await db.query.mitra.findFirst({
          where: eq(mitra.userId, user!.id),
        });
        if (!mitraRecord) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const pkgPeriods = await db
          .select({ periodId: qurbanPackagePeriods.periodId })
          .from(qurbanPackagePeriods)
          .where(eq(qurbanPackagePeriods.packageId, pkg[0].id));
        const periodIds = pkgPeriods.map((p) => p.periodId);
        if (periodIds.length === 0) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const mitraPeriods = await db
          .select({ id: qurbanPeriods.id })
          .from(qurbanPeriods)
          .where(and(inArray(qurbanPeriods.id, periodIds), eq(qurbanPeriods.mitraId, mitraRecord.id)));
        if (mitraPeriods.length === 0) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }
    }

    // Found as master package - return with periods array (for edit page)
    const constructUrl = (urlOrPath: string | null | undefined) => {
      if (!urlOrPath) return urlOrPath;
      if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
        return urlOrPath;
      }
      return `${apiUrl}${urlOrPath}`;
    };

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
        executionDateOverride: qurbanPackagePeriods.executionDateOverride,
        executionTimeNote: qurbanPackagePeriods.executionTimeNote,
        executionLocation: qurbanPackagePeriods.executionLocation,
        executionNotes: qurbanPackagePeriods.executionNotes,
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
  }

  // If not found as master package, try as package-period ID (for orders form)
  const packagePeriodData = await db
    .select({
      id: qurbanPackagePeriods.id,
      packageId: qurbanPackages.id,
      name: qurbanPackages.name,
      description: qurbanPackages.description,
      imageUrl: qurbanPackages.imageUrl,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      maxSlots: qurbanPackages.maxSlots,
      createdBy: qurbanPackages.createdBy,
      isFeatured: qurbanPackages.isFeatured,
      isAvailable: sql<boolean>`${qurbanPackages.isAvailable} AND ${qurbanPackagePeriods.isAvailable}`,
      periodId: qurbanPackagePeriods.periodId,
      periodName: qurbanPeriods.name,
      hijriYear: qurbanPeriods.hijriYear,
      gregorianYear: qurbanPeriods.gregorianYear,
      price: qurbanPackagePeriods.price,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      executionDateOverride: qurbanPackagePeriods.executionDateOverride,
      executionTimeNote: qurbanPackagePeriods.executionTimeNote,
      executionLocation: qurbanPackagePeriods.executionLocation,
      executionNotes: qurbanPackagePeriods.executionNotes,
      createdAt: qurbanPackagePeriods.createdAt,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(eq(qurbanPackagePeriods.id, id))
    .limit(1);

  if (packagePeriodData.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  if (isMitra) {
    if (packagePeriodData[0].createdBy && packagePeriodData[0].createdBy !== user!.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (!packagePeriodData[0].createdBy) {
      const mitraRecord = await db.query.mitra.findFirst({
        where: eq(mitra.userId, user!.id),
      });
      if (!mitraRecord) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const period = await db
        .select({ mitraId: qurbanPeriods.mitraId })
        .from(qurbanPeriods)
        .where(eq(qurbanPeriods.id, packagePeriodData[0].periodId))
        .limit(1);
      if (period.length === 0 || period[0].mitraId !== mitraRecord.id) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }
  }

  const pkgPeriod = packagePeriodData[0];
  const enrichedPackage = {
    ...pkgPeriod,
    imageUrl: pkgPeriod.imageUrl
      ? (pkgPeriod.imageUrl.startsWith('http://') || pkgPeriod.imageUrl.startsWith('https://'))
        ? pkgPeriod.imageUrl
        : `${apiUrl}${pkgPeriod.imageUrl}`
      : null,
  };

  return c.json({ data: enrichedPackage });
});

// Create package with period associations
app.post("/packages", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await c.req.json();

  // If mitra, ensure mitra record exists
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord) {
      return c.json({ error: "Mitra record not found for this user" }, 403);
    }
  }

  // Enforce global period usage (no mitra-specific period to avoid duplicate timeline)
  if (body.periods && Array.isArray(body.periods)) {
    for (const period of body.periods) {
      const p = await db.select().from(qurbanPeriods).where(eq(qurbanPeriods.id, period.periodId)).limit(1);
      if (p.length === 0) {
        return c.json({ error: "Period not found" }, 400);
      }
      if (p[0].mitraId) {
        return c.json({ error: "Period mitra tidak didukung. Gunakan periode global." }, 400);
      }
    }
  }

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
      // SEO fields
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
      focusKeyphrase: body.focusKeyphrase || null,
      canonicalUrl: body.canonicalUrl || null,
      noIndex: body.noIndex ?? false,
      noFollow: body.noFollow ?? false,
      ogTitle: body.ogTitle || null,
      ogDescription: body.ogDescription || null,
      ogImageUrl: body.ogImageUrl || null,
      seoScore: body.seoScore ?? 0,
      createdBy: user?.id || null,
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
      executionDateOverride: period.executionDateOverride ? new Date(period.executionDateOverride) : null,
      executionTimeNote: period.executionTimeNote || null,
      executionLocation: period.executionLocation || null,
      executionNotes: period.executionNotes || null,
    }));

    await db.insert(qurbanPackagePeriods).values(packagePeriodValues);
  }

  return c.json({ data: newPackage[0], message: "Package created successfully" });
});

// Update package master data and periods
app.patch("/packages/:id", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json();

  // If mitra, verify package ownership
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const pkgRow = await db
      .select({ id: qurbanPackages.id, createdBy: qurbanPackages.createdBy })
      .from(qurbanPackages)
      .where(eq(qurbanPackages.id, id))
      .limit(1);
    if (pkgRow.length === 0) {
      return c.json({ error: "Package not found" }, 404);
    }
    if (pkgRow[0].createdBy && pkgRow[0].createdBy !== user!.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (!pkgRow[0].createdBy) {
      const pkgPeriods = await db.select({ periodId: qurbanPackagePeriods.periodId }).from(qurbanPackagePeriods).where(eq(qurbanPackagePeriods.packageId, id));
      if (pkgPeriods.length > 0) {
        const periodIds = pkgPeriods.map(p => p.periodId);
        const mitraPeriods = await db.select({ id: qurbanPeriods.id }).from(qurbanPeriods).where(and(inArray(qurbanPeriods.id, periodIds), eq(qurbanPeriods.mitraId, mitraRecord.id)));
        if (mitraPeriods.length === 0) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }
    }
  }

  // Enforce global period usage in package associations
  if (body.periods && Array.isArray(body.periods)) {
    for (const period of body.periods) {
      const p = await db.select().from(qurbanPeriods).where(eq(qurbanPeriods.id, period.periodId)).limit(1);
      if (p.length === 0) {
        return c.json({ error: "Period not found" }, 400);
      }
      if (p[0].mitraId) {
        return c.json({ error: "Period mitra tidak didukung. Gunakan periode global." }, 400);
      }
    }
  }

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
  // SEO fields
  if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle || null;
  if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription || null;
  if (body.focusKeyphrase !== undefined) updateData.focusKeyphrase = body.focusKeyphrase || null;
  if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl || null;
  if (body.noIndex !== undefined) updateData.noIndex = body.noIndex;
  if (body.noFollow !== undefined) updateData.noFollow = body.noFollow;
  if (body.ogTitle !== undefined) updateData.ogTitle = body.ogTitle || null;
  if (body.ogDescription !== undefined) updateData.ogDescription = body.ogDescription || null;
  if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl || null;
  if (body.seoScore !== undefined) updateData.seoScore = body.seoScore;

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
            executionDateOverride: period.executionDateOverride ? new Date(period.executionDateOverride) : null,
            executionTimeNote: period.executionTimeNote || null,
            executionLocation: period.executionLocation || null,
            executionNotes: period.executionNotes || null,
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
          executionDateOverride: period.executionDateOverride ? new Date(period.executionDateOverride) : null,
          executionTimeNote: period.executionTimeNote || null,
          executionLocation: period.executionLocation || null,
          executionNotes: period.executionNotes || null,
        });
      }
    }

    // Delete period associations that are no longer in the list
    // Only delete if there are no qurban transactions referencing them
    for (const existing of existingPeriods) {
      if (!incomingPeriodIds.has(existing.periodId)) {
        const linkedTransactions = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.productType, "qurban"),
              eq(transactions.productId, existing.id)
            )
          )
          .limit(1);

        if (linkedTransactions.length === 0) {
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
app.delete("/packages/:id", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();

  // If mitra, verify package ownership
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user!.id),
    });
    if (!mitraRecord) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const pkgRow = await db
      .select({ id: qurbanPackages.id, createdBy: qurbanPackages.createdBy })
      .from(qurbanPackages)
      .where(eq(qurbanPackages.id, id))
      .limit(1);
    if (pkgRow.length === 0) {
      return c.json({ error: "Package not found" }, 404);
    }
    if (pkgRow[0].createdBy && pkgRow[0].createdBy !== user!.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (!pkgRow[0].createdBy) {
      const pkgPeriods = await db.select({ periodId: qurbanPackagePeriods.periodId }).from(qurbanPackagePeriods).where(eq(qurbanPackagePeriods.packageId, id));
      if (pkgPeriods.length > 0) {
        const periodIds = pkgPeriods.map(p => p.periodId);
        const mitraPeriods = await db.select({ id: qurbanPeriods.id }).from(qurbanPeriods).where(and(inArray(qurbanPeriods.id, periodIds), eq(qurbanPeriods.mitraId, mitraRecord.id)));
        if (mitraPeriods.length === 0) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }
    }
  }

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
app.post("/packages/:packageId/periods", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { packageId } = c.req.param();
  const body = await c.req.json();

  // If mitra, verify package ownership
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const pkgOwner = await db
      .select({ id: qurbanPackages.id, createdBy: qurbanPackages.createdBy })
      .from(qurbanPackages)
      .where(eq(qurbanPackages.id, packageId))
      .limit(1);
    if (pkgOwner.length > 0 && pkgOwner[0].createdBy && pkgOwner[0].createdBy !== user!.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
  }

  // Check if package exists
  const pkg = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, packageId))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  if (isMitra) {
    if (pkg[0].createdBy && pkg[0].createdBy !== user!.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (!pkg[0].createdBy) {
      const mitraRecord = await db.query.mitra.findFirst({
        where: eq(mitra.userId, user!.id),
      });
      if (!mitraRecord) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const pkgPeriods = await db
        .select({ periodId: qurbanPackagePeriods.periodId })
        .from(qurbanPackagePeriods)
        .where(eq(qurbanPackagePeriods.packageId, packageId));
      const periodIds = pkgPeriods.map((p) => p.periodId);
      if (periodIds.length === 0) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const mitraPeriods = await db
        .select({ id: qurbanPeriods.id })
        .from(qurbanPeriods)
        .where(and(inArray(qurbanPeriods.id, periodIds), eq(qurbanPeriods.mitraId, mitraRecord.id)));
      if (mitraPeriods.length === 0) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }
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
  if (period[0].mitraId) {
    return c.json({ error: "Period mitra tidak didukung. Gunakan periode global." }, 400);
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
      executionDateOverride: body.executionDateOverride ? new Date(body.executionDateOverride) : null,
      executionTimeNote: body.executionTimeNote || null,
      executionLocation: body.executionLocation || null,
      executionNotes: body.executionNotes || null,
    })
    .returning();

  return c.json({
    data: newAssociation[0],
    message: "Package successfully added to period",
  });
});

// Update package-period association (price, stock, availability for specific period)
app.patch("/package-periods/:id", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json();

  // If mitra, verify package ownership
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const pp = await db
      .select({ packageId: qurbanPackagePeriods.packageId, periodId: qurbanPackagePeriods.periodId })
      .from(qurbanPackagePeriods)
      .where(eq(qurbanPackagePeriods.id, id))
      .limit(1);
    if (pp.length > 0) {
      const pkgOwner = await db
        .select({ createdBy: qurbanPackages.createdBy })
        .from(qurbanPackages)
        .where(eq(qurbanPackages.id, pp[0].packageId))
        .limit(1);
      if (pkgOwner.length > 0 && pkgOwner[0].createdBy && pkgOwner[0].createdBy !== user!.id) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (pkgOwner.length > 0 && !pkgOwner[0].createdBy) {
        const mitraRecord = await db.query.mitra.findFirst({
          where: eq(mitra.userId, user!.id),
        });
        if (!mitraRecord) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const period = await db
          .select({ mitraId: qurbanPeriods.mitraId })
          .from(qurbanPeriods)
          .where(eq(qurbanPeriods.id, pp[0].periodId))
          .limit(1);
        if (period.length === 0 || period[0].mitraId !== mitraRecord.id) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }
    }
  }

  const updateData: any = { updatedAt: new Date() };

  if (body.price !== undefined) updateData.price = body.price;
  if (body.stock !== undefined) updateData.stock = body.stock;
  if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;
  if (body.executionDateOverride !== undefined) {
    updateData.executionDateOverride = body.executionDateOverride ? new Date(body.executionDateOverride) : null;
  }
  if (body.executionTimeNote !== undefined) updateData.executionTimeNote = body.executionTimeNote || null;
  if (body.executionLocation !== undefined) updateData.executionLocation = body.executionLocation || null;
  if (body.executionNotes !== undefined) updateData.executionNotes = body.executionNotes || null;

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
app.delete("/package-periods/:id", requireRole("super_admin", "admin_campaign", "mitra"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();

  // If mitra, verify package ownership
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  if (isMitra) {
    const pp = await db
      .select({ packageId: qurbanPackagePeriods.packageId, periodId: qurbanPackagePeriods.periodId })
      .from(qurbanPackagePeriods)
      .where(eq(qurbanPackagePeriods.id, id))
      .limit(1);
    if (pp.length > 0) {
      const pkgOwner = await db
        .select({ createdBy: qurbanPackages.createdBy })
        .from(qurbanPackages)
        .where(eq(qurbanPackages.id, pp[0].packageId))
        .limit(1);
      if (pkgOwner.length > 0 && pkgOwner[0].createdBy && pkgOwner[0].createdBy !== user!.id) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (pkgOwner.length > 0 && !pkgOwner[0].createdBy) {
        const mitraRecord = await db.query.mitra.findFirst({
          where: eq(mitra.userId, user!.id),
        });
        if (!mitraRecord) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const period = await db
          .select({ mitraId: qurbanPeriods.mitraId })
          .from(qurbanPeriods)
          .where(eq(qurbanPeriods.id, pp[0].periodId))
          .limit(1);
        if (period.length === 0 || period[0].mitraId !== mitraRecord.id) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }
    }
  }

  // Check if there are existing qurban transactions for this package-period
  const linkedTransactions = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.productType, "qurban"),
        eq(transactions.productId, id)
      )
    )
    .limit(1);

  if (linkedTransactions.length > 0) {
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
      executionDateOverride: qurbanPackagePeriods.executionDateOverride,
      executionTimeNote: qurbanPackagePeriods.executionTimeNote,
      executionLocation: qurbanPackagePeriods.executionLocation,
      executionNotes: qurbanPackagePeriods.executionNotes,
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

  try {
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
      payment_method_id: qurbanOrders.paymentMethodId,
      metadata: qurbanOrders.metadata,
      unit_price: qurbanOrders.unitPrice,
      quantity: qurbanOrders.quantity,
      admin_fee: qurbanOrders.adminFee,
      total_amount: qurbanOrders.totalAmount,
      paid_amount: qurbanOrders.paidAmount,
      payment_status: qurbanOrders.paymentStatus,
      order_status: qurbanOrders.orderStatus,
      on_behalf_of: qurbanOrders.onBehalfOf,
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

  // Parse metadata if exists
  let parsedMetadata = null;
  try {
    if (order[0].metadata && typeof order[0].metadata === 'string') {
      parsedMetadata = JSON.parse(order[0].metadata);
    } else if (order[0].metadata && typeof order[0].metadata === 'object') {
      parsedMetadata = order[0].metadata;
    }
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    parsedMetadata = null;
  }

  const orderWithMetadata = {
    ...order[0],
    metadata: parsedMetadata,
  };

  // Get payments history
  const payments = await db
    .select()
    .from(qurbanPayments)
    .where(eq(qurbanPayments.orderId, id))
    .orderBy(desc(qurbanPayments.createdAt));

  // Construct full URL for payment proofs
  const apiUrl = (c.env as any)?.API_URL || process.env.API_URL || "http://localhost:50245";
  const paymentsWithUrls = payments.map((payment: any) => {
    let proofUrl = null;
    if (payment.paymentProof) {
      if (payment.paymentProof.includes("://")) {
        // Already full URL
        proofUrl = payment.paymentProof;
      } else if (payment.paymentProof.includes("cdn.webane.net")) {
        // GCS path without protocol
        proofUrl = `https://storage.googleapis.com${payment.paymentProof.startsWith('/') ? '' : '/'}${payment.paymentProof}`;
      } else {
        // Local path
        proofUrl = `${apiUrl}${payment.paymentProof.startsWith('/') ? '' : '/'}${payment.paymentProof}`;
      }
    }

    return {
      id: payment.id,
      payment_number: payment.paymentNumber,
      order_id: payment.orderId,
      amount: payment.amount,
      payment_method: payment.paymentMethod,
      payment_channel: payment.paymentChannel,
      payment_proof_url: proofUrl,
      status: payment.status,
      notes: payment.notes,
      created_at: payment.createdAt,
      verified_at: payment.verifiedAt,
      verified_by: payment.verifiedBy,
    };
  });

    return c.json({
      order: orderWithMetadata,
      payments: paymentsWithUrls,
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return c.json({ error: "Failed to fetch order", message: error.message }, 500);
  }
});

// Get order by order number (public endpoint for invoice)
app.get("/orders/by-number/:orderNumber", async (c) => {
  const db = c.get("db");
  const { orderNumber } = c.req.param();

  try {
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
      payment_method_id: qurbanOrders.paymentMethodId,
      metadata: qurbanOrders.metadata,
      unit_price: qurbanOrders.unitPrice,
      quantity: qurbanOrders.quantity,
      admin_fee: qurbanOrders.adminFee,
      total_amount: qurbanOrders.totalAmount,
      paid_amount: qurbanOrders.paidAmount,
      payment_status: qurbanOrders.paymentStatus,
      order_status: qurbanOrders.orderStatus,
      on_behalf_of: qurbanOrders.onBehalfOf,
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
    .where(eq(qurbanOrders.orderNumber, orderNumber))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Parse metadata if exists
  let parsedMetadata = null;
  try {
    if (order[0].metadata && typeof order[0].metadata === 'string') {
      parsedMetadata = JSON.parse(order[0].metadata);
    } else if (order[0].metadata && typeof order[0].metadata === 'object') {
      parsedMetadata = order[0].metadata;
    }
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    parsedMetadata = null;
  }

  const orderWithMetadata = {
    ...order[0],
    metadata: parsedMetadata,
  };

  // Get payments history
  const payments = await db
    .select()
    .from(qurbanPayments)
    .where(eq(qurbanPayments.orderId, order[0].id))
    .orderBy(desc(qurbanPayments.createdAt));

  // Construct full URL for payment proofs
  const apiUrl = (c.env as any)?.API_URL || process.env.API_URL || "http://localhost:50245";
  const paymentsWithUrls = payments.map((payment: any) => {
    let proofUrl = null;
    if (payment.paymentProof) {
      if (payment.paymentProof.includes("://")) {
        // Already full URL
        proofUrl = payment.paymentProof;
      } else if (payment.paymentProof.includes("cdn.webane.net")) {
        // GCS path without protocol
        proofUrl = `https://storage.googleapis.com${payment.paymentProof.startsWith('/') ? '' : '/'}${payment.paymentProof}`;
      } else {
        // Local path
        proofUrl = `${apiUrl}${payment.paymentProof.startsWith('/') ? '' : '/'}${payment.paymentProof}`;
      }
    }

    return {
      id: payment.id,
      payment_number: payment.paymentNumber,
      order_id: payment.orderId,
      amount: payment.amount,
      payment_method: payment.paymentMethod,
      payment_channel: payment.paymentChannel,
      payment_proof_url: proofUrl,
      status: payment.status,
      notes: payment.notes,
      created_at: payment.createdAt,
      verified_at: payment.verifiedAt,
      verified_by: payment.verifiedBy,
    };
  });

    return c.json({
      order: orderWithMetadata,
      payments: paymentsWithUrls,
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return c.json({ error: "Failed to fetch order", message: error.message }, 500);
  }
});

// Create order manually
app.post("/orders", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  // Get package-period details (frontend sends packagePeriodId as packageId)
  const packagePeriodId = body.packageId; // This is actually packagePeriodId from frontend

  const packagePeriodData = await db
    .select({
      packagePeriodId: qurbanPackagePeriods.id,
      packageId: qurbanPackages.id,
      periodId: qurbanPackagePeriods.periodId,
      price: qurbanPackagePeriods.price,
      name: qurbanPackages.name,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      maxSlots: qurbanPackages.maxSlots,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(eq(qurbanPackagePeriods.id, packagePeriodId))
    .limit(1);

  if (packagePeriodData.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  const pkgPeriod = packagePeriodData[0];
  let assignedGroupId = body.sharedGroupId || null;

  // If package is shared type, find or create a shared group
  if (pkgPeriod.packageType === "shared") {
    // Find an open group with available slots for this package-period
    const availableGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(
        and(
          eq(qurbanSharedGroups.packagePeriodId, packagePeriodId),
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
      if (!pkgPeriod.maxSlots) {
        return c.json({ error: "Package maxSlots not configured" }, 400);
      }
      const maxSlots = pkgPeriod.maxSlots;

      // Get next group number for this package-period
      const existingGroups = await db
        .select()
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packagePeriodId, packagePeriodId))
        .orderBy(desc(qurbanSharedGroups.groupNumber));

      const nextGroupNumber = existingGroups.length > 0
        ? existingGroups[0].groupNumber + 1
        : 1;

      const newGroup = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: pkgPeriod.packageId,
          packagePeriodId: packagePeriodId,
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
      packageId: pkgPeriod.packageId, // Store master package ID
      packagePeriodId: packagePeriodId, // Store package-period junction ID
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
      paymentProof: body.paymentProofUrl || null,
      status: "pending", // Always pending, needs admin verification
      installmentNumber: body.paymentMethod === "installment" ? 1 : null,
      notes: "Pembayaran awal - menunggu verifikasi",
    });
  }

  return c.json({ data: newOrder[0], message: "Order created successfully" });
});

// Confirm order
app.post("/orders/:id/confirm", requireRole("super_admin", "admin_campaign"), async (c) => {
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
app.post("/orders/:id/cancel", requireRole("super_admin", "admin_campaign"), async (c) => {
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

// Update order
app.put("/orders/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  try {
    // Get current order data
    const currentOrder = await db
      .select()
      .from(qurbanOrders)
      .where(eq(qurbanOrders.id, id))
      .limit(1);

    if (currentOrder.length === 0) {
      return c.json({ error: "Order not found" }, 404);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.payment_status !== undefined) {
      updateData.paymentStatus = body.payment_status;

      // If marking as paid, update paidAmount to totalAmount
      if (body.payment_status === "paid") {
        updateData.paidAmount = currentOrder[0].totalAmount;
      }
    }

    if (body.payment_method_id !== undefined) {
      updateData.paymentMethodId = body.payment_method_id;
    }

    if (body.metadata !== undefined) {
      updateData.metadata = typeof body.metadata === 'string' ? body.metadata : JSON.stringify(body.metadata);
    }

    if (body.order_status !== undefined) {
      updateData.orderStatus = body.order_status;
    }

    const updated = await db
      .update(qurbanOrders)
      .set(updateData)
      .where(eq(qurbanOrders.id, id))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ data: updated[0], message: "Order updated successfully" });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return c.json({ error: "Failed to update order", message: error.message }, 500);
  }
});

// Add payment proof
app.post("/orders/:id/payment-proof", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  // Check if order exists
  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Calculate remaining amount
  const remainingAmount = order[0].totalAmount - order[0].paidAmount;
  const user = c.get("user");

  // If admin manually marks as paid (verified flag), auto-verify the payment
  const isVerified = body.verified === true;

  // Only create payment if there's remaining amount (unless admin manually verifying)
  if (!isVerified && remainingAmount <= 0) {
    return c.json({
      error: "Order already fully paid",
      message: "Tidak ada sisa pembayaran"
    }, 400);
  }

  // Create payment record with proof
  const paymentId = createId();
  const timestamp = getCurrentYearWIB();
  const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();

  const newPayment = await db.insert(qurbanPayments).values({
    id: paymentId,
    paymentNumber: `PAY-QBN-${timestamp}-${randomStr}`,
    orderId: id,
    amount: isVerified ? order[0].totalAmount : remainingAmount,
    paymentMethod: "bank_transfer",
    paymentChannel: body.payment_channel || null,
    paymentProof: body.payment_proof_url || null,
    status: isVerified ? "verified" : "pending",
    verifiedBy: isVerified ? user.id : null,
    verifiedAt: isVerified ? new Date() : null,
    installmentNumber: null,
    notes: body.notes || "Bukti pembayaran",
  }).returning();

  return c.json({ data: newPayment[0], message: "Payment proof uploaded successfully" });
});

// Approve order payment (set status to processing -> paid)
app.post("/orders/:id/approve-payment", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");

  // Get order
  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Update order to paid
  await db
    .update(qurbanOrders)
    .set({
      paymentStatus: "paid",
      paidAmount: order[0].totalAmount,
      updatedAt: new Date(),
    })
    .where(eq(qurbanOrders.id, id));

  // Get pending payments for this order and verify them
  const pendingPayments = await db
    .select()
    .from(qurbanPayments)
    .where(
      and(
        eq(qurbanPayments.orderId, id),
        eq(qurbanPayments.status, "pending")
      )
    );

  // Verify all pending payments
  for (const payment of pendingPayments) {
    await db
      .update(qurbanPayments)
      .set({
        status: "verified",
        verifiedBy: user.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(qurbanPayments.id, payment.id));
  }

  // If order is in a shared group, increment slots_filled
  if (order[0].sharedGroupId && order[0].paymentStatus !== "paid") {
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

  return c.json({ message: "Payment approved successfully" });
});

// Reject order payment
app.post("/orders/:id/reject-payment", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");
  const body = await c.req.json();

  // Get order
  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Update order to pending
  await db
    .update(qurbanOrders)
    .set({
      paymentStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(qurbanOrders.id, id));

  // Get pending payments for this order and reject them
  const pendingPayments = await db
    .select()
    .from(qurbanPayments)
    .where(
      and(
        eq(qurbanPayments.orderId, id),
        eq(qurbanPayments.status, "pending")
      )
    );

  // Reject all pending payments
  for (const payment of pendingPayments) {
    await db
      .update(qurbanPayments)
      .set({
        status: "rejected",
        verifiedBy: user.id,
        verifiedAt: new Date(),
        notes: body.reason || "Ditolak oleh admin",
        updatedAt: new Date(),
      })
      .where(eq(qurbanPayments.id, payment.id));
  }

  return c.json({ message: "Payment rejected" });
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
    payment_proof_url: payment.payment_proof
      ? (payment.payment_proof.includes("://")
          ? payment.payment_proof
          : `${apiUrl}${payment.payment_proof.startsWith('/') ? '' : '/'}${payment.payment_proof}`)
      : null,
    payment_proof: undefined, // Remove path field
  }));

  return c.json({ data: paymentsWithUrls });
});

// Verify payment
app.post("/payments/:id/verify", requireRole("super_admin", "admin_campaign"), async (c) => {
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
app.post("/payments/:id/reject", requireRole("super_admin", "admin_campaign"), async (c) => {
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

// Update payment
app.put("/payments/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();
  const user = c.get("user");

  // Get existing payment
  const payment = await db
    .select()
    .from(qurbanPayments)
    .where(eq(qurbanPayments.id, id))
    .limit(1);

  if (payment.length === 0) {
    return c.json({ error: "Payment not found" }, 404);
  }

  // Update payment
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.payment_channel !== undefined) {
    updateData.paymentChannel = body.payment_channel;
  }

  if (body.payment_proof_url !== undefined) {
    updateData.paymentProof = body.payment_proof_url;
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === "verified") {
      updateData.verifiedBy = user.id;
      updateData.verifiedAt = new Date();
    }
  }

  const updated = await db
    .update(qurbanPayments)
    .set(updateData)
    .where(eq(qurbanPayments.id, id))
    .returning();

  return c.json({ data: updated[0], message: "Payment updated successfully" });
});

// ============================================================
// SHARED GROUPS MANAGEMENT
// ============================================================

// Get all shared groups with members
app.get("/shared-groups", async (c) => {
  const db = c.get("db");

  // Read directly from the authoritative qurbanSharedGroups table
  const groups = await db
    .select({
      id: qurbanSharedGroups.id,
      package_id: qurbanSharedGroups.packageId,
      package_period_id: qurbanSharedGroups.packagePeriodId,
      group_number: qurbanSharedGroups.groupNumber,
      max_slots: qurbanSharedGroups.maxSlots,
      slots_filled: qurbanSharedGroups.slotsFilled,
      status: qurbanSharedGroups.status,
      created_at: qurbanSharedGroups.createdAt,
      package_name: qurbanPackages.name,
      animal_type: qurbanPackages.animalType,
      period_id: qurbanPackagePeriods.periodId,
      period_name: qurbanPeriods.name,
    })
    .from(qurbanSharedGroups)
    .leftJoin(qurbanPackages, eq(qurbanSharedGroups.packageId, qurbanPackages.id))
    .leftJoin(qurbanPackagePeriods, eq(qurbanSharedGroups.packagePeriodId, qurbanPackagePeriods.id))
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .orderBy(desc(qurbanSharedGroups.createdAt));

  return c.json({ data: groups });
});

// Get shared group detail with members
app.get("/shared-groups/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Get group from authoritative table
  const groupRows = await db
    .select({
      id: qurbanSharedGroups.id,
      package_id: qurbanSharedGroups.packageId,
      package_period_id: qurbanSharedGroups.packagePeriodId,
      group_number: qurbanSharedGroups.groupNumber,
      max_slots: qurbanSharedGroups.maxSlots,
      slots_filled: qurbanSharedGroups.slotsFilled,
      status: qurbanSharedGroups.status,
      created_at: qurbanSharedGroups.createdAt,
      package_name: qurbanPackages.name,
      animal_type: qurbanPackages.animalType,
      period_id: qurbanPackagePeriods.periodId,
      period_name: qurbanPeriods.name,
    })
    .from(qurbanSharedGroups)
    .leftJoin(qurbanPackages, eq(qurbanSharedGroups.packageId, qurbanPackages.id))
    .leftJoin(qurbanPackagePeriods, eq(qurbanSharedGroups.packagePeriodId, qurbanPackagePeriods.id))
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(eq(qurbanSharedGroups.id, id))
    .limit(1);

  if (groupRows.length === 0) {
    return c.json({ error: "Group not found" }, 404);
  }

  const group = groupRows[0];

  // Find all transactions (any status) assigned to this shared group
  const memberTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.productType, "qurban"),
        sql`${transactions.typeSpecificData} ->> 'shared_group_id' = ${id}`
      )
    )
    .orderBy(transactions.createdAt);

  const members = memberTransactions.map((t: any) => ({
    order_id: t.id,
    order_number: t.transactionNumber,
    donor_name: t.donorName,
    donor_phone: t.donorPhone || "",
    on_behalf_of: (t.typeSpecificData as any)?.onBehalfOf || t.donorName,
    order_status: t.paymentStatus,
    payment_status: t.paymentStatus,
    total_amount: t.totalAmount,
    paid_amount: t.paidAmount,
    created_at: t.createdAt,
  }));

  return c.json({
    group,
    members,
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
app.post("/donaturs", requireRole("super_admin", "admin_campaign"), async (c) => {
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

// Get qurban period summary (total sapi, kambing, funds)
app.get("/periods/:id/summary", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

  // Get all package_period_ids for this period
  const packagePeriods = await db
    .select({
      id: qurbanPackagePeriods.id,
      packageId: qurbanPackagePeriods.packageId,
      price: qurbanPackagePeriods.price,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(
      and(
        eq(qurbanPackagePeriods.periodId, id),
        ...(isMitra && user ? [eq(qurbanPackages.createdBy, user.id)] : [])
      )
    );

  const packagePeriodIds = packagePeriods.map((pp: any) => pp.id);

  if (packagePeriodIds.length === 0) {
    return c.json({
      data: {
        totalSapi: 0,
        totalKambing: 0,
        totalCollected: 0,
        collectedAdmin: 0,
        totalDisbursed: 0,
        availableSapi: 0,
        availableKambing: 0,
        availableAdmin: 0,
      },
    });
  }

  // Get transactions for this period
  const rawTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.productType, "qurban"),
        inArray(transactions.productId, packagePeriodIds),
        eq(transactions.paymentStatus, "paid"),
        sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`
      )
    );

  // Get package details
  const packages = await db
    .select()
    .from(qurbanPackages)
    .leftJoin(qurbanPackagePeriods, eq(qurbanPackages.id, qurbanPackagePeriods.packageId))
    .where(inArray(qurbanPackagePeriods.id, packagePeriodIds));

  const packageMap = new Map();
  packages.forEach((p: any) => {
    packageMap.set(p.qurban_package_periods.id, {
      animalType: p.qurban_packages.animalType,
      price: p.qurban_package_periods.price,
    });
  });

  // Count animals and funds
  let totalSapi = 0;
  let totalKambing = 0;
  let collectedSapi = 0;
  let collectedKambing = 0;

  rawTransactions.forEach((t: any) => {
    const pkgInfo = packageMap.get(t.productId);
    const quantity = t.quantity || 1;
    const itemAmount = Number(pkgInfo?.price || 0) * Number(quantity);

    if (pkgInfo?.animalType === 'sapi' || pkgInfo?.animalType === 'cow') {
      totalSapi += quantity;
      collectedSapi += itemAmount;
    } else if (pkgInfo?.animalType === 'kambing' || pkgInfo?.animalType === 'goat') {
      totalKambing += quantity;
      collectedKambing += itemAmount;
    }
  });

  // Get disbursements
  const { disbursements } = await import("@bantuanku/db");
  const allDisbursements = await db
    .select()
    .from(disbursements)
    .where(
      and(
        eq(disbursements.referenceType, "qurban_period"),
        eq(disbursements.referenceId, id),
        eq(disbursements.status, "paid"),
        ...(isMitra && user ? [eq(disbursements.createdBy, user.id)] : [])
      )
    );

  let disbursedSapi = 0;
  let disbursedKambing = 0;
  let disbursedAdmin = 0;

  allDisbursements.forEach((d: any) => {
    const typeData = d.typeSpecificData || {};
    const category = typeData.qurban_category || d.category;

    if (category === 'sapi' || category === 'pembelian_sapi' || category === 'qurban_purchase_sapi') {
      disbursedSapi += d.amount || 0;
    } else if (category === 'kambing' || category === 'pembelian_kambing' || category === 'qurban_purchase_kambing') {
      disbursedKambing += d.amount || 0;
    } else if (category === 'administrasi' || category === 'qurban_execution_fee') {
      disbursedAdmin += d.amount || 0;
    }
  });

  // Calculate available qurban admin pool after revenue-share split.
  // Mitra sees mitra share pool, admin sees owner-app amil net pool.
  const collectedAdminExpr = isMitra
    ? sql<number>`coalesce(sum(${revenueShares.mitraAmount}), 0)`
    : sql<number>`coalesce(sum(${revenueShares.amilNetAmount}), 0)`;

  const [adminShareSummary] = await db
    .select({
      collectedAdmin: collectedAdminExpr,
    })
    .from(revenueShares)
    .innerJoin(transactions, eq(revenueShares.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.productType, "qurban"),
        inArray(transactions.productId, packagePeriodIds),
        eq(transactions.paymentStatus, "paid")
      )
    );

  const collectedAdmin = Number(adminShareSummary?.collectedAdmin || 0);

  return c.json({
    data: {
      totalSapi,
      totalKambing,
      collectedSapi,
      collectedKambing,
      collectedAdmin,
      totalCollected: collectedSapi + collectedKambing,
      disbursedSapi,
      disbursedKambing,
      disbursedAdmin,
      totalDisbursed: disbursedSapi + disbursedKambing + disbursedAdmin,
      availableSapi: collectedSapi - disbursedSapi,
      availableKambing: collectedKambing - disbursedKambing,
      availableAdmin: collectedAdmin - disbursedAdmin,
    },
  });
});

export default app;
