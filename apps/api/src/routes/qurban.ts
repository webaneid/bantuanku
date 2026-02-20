import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import {
  qurbanPeriods,
  qurbanPackages,
  qurbanPackagePeriods,
  qurbanOrders,
  qurbanPayments,
  qurbanSharedGroups,
  qurbanSavings,
  qurbanSavingsTransactions,
  qurbanSavingsConversions,
  transactions,
  transactionPayments,
  createId,
  media,
  mitra,
  settings,
  paymentMethods,
} from "@bantuanku/db";
import { getCurrentYearWIB } from "../utils/timezone";
import { uploadToGCS, generateGCSPath, type GCSConfig } from "../lib/gcs";
import * as fs from "fs";
import * as pathModule from "path";
import { optionalAuthMiddleware } from "../middleware/auth";
import { success, error } from "../lib/response";
import { TransactionService } from "../services/transaction";

// Helper to fetch CDN settings from database
const fetchCDNSettings = async (db: any): Promise<GCSConfig | null> => {
  try {
    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.category, "cdn"));

    const cdnEnabled = settingsData.find((s: any) => s.key === "cdn_enabled")?.value === "true";

    if (!cdnEnabled) {
      return null;
    }

    const config = {
      bucketName: settingsData.find((s: any) => s.key === "gcs_bucket_name")?.value || "",
      projectId: settingsData.find((s: any) => s.key === "gcs_project_id")?.value || "",
      clientEmail: settingsData.find((s: any) => s.key === "gcs_client_email")?.value || "",
      privateKey: settingsData.find((s: any) => s.key === "gcs_private_key")?.value || "",
    };

    // Validate all required fields are present
    if (!config.bucketName || !config.projectId || !config.clientEmail || !config.privateKey) {
      console.warn("CDN enabled but missing required configuration");
      return null;
    }

    return config;
  } catch (error) {
    console.error("Failed to fetch CDN settings:", error);
    return null;
  }
};

const generateSavingsConversionTxNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = Date.now().toString().slice(-6);
  return `TRX-SAV-CONV-${y}${m}${d}-${suffix}`;
};

const app = new Hono();

// Set user context if token ada (tidak memblokir public routes)
app.use("*", optionalAuthMiddleware);

// ============================================================
// PUBLIC - PERIODS & PACKAGES (No Auth Required)
// ============================================================

// Get active periods
app.get("/periods", async (c) => {
  const db = c.get("db");

  const periods = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.status, "active"))
    .orderBy(desc(qurbanPeriods.gregorianYear));

  return c.json({ data: periods });
});

// Get packages by period (with availability info)
app.get("/periods/:periodId/packages", async (c) => {
  const db = c.get("db");
  const { periodId } = c.req.param();
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";

  const packages = await db
    .select({
      packagePeriodId: qurbanPackagePeriods.id,
      id: qurbanPackages.id,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      name: qurbanPackages.name,
      description: qurbanPackages.description,
      imageUrl: qurbanPackages.imageUrl,
      price: qurbanPackagePeriods.price,
      maxSlots: qurbanPackages.maxSlots,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      isFeatured: qurbanPackages.isFeatured,
      ownerType: sql<"organization" | "mitra">`
        CASE
          WHEN ${mitra.id} IS NOT NULL THEN 'mitra'
          ELSE 'organization'
        END
      `,
      ownerName: mitra.name,
      ownerSlug: mitra.slug,
      ownerLogoUrl: mitra.logoUrl,
      executionDateOverride: qurbanPackagePeriods.executionDateOverride,
      executionTimeNote: qurbanPackagePeriods.executionTimeNote,
      executionLocation: qurbanPackagePeriods.executionLocation,
      executionNotes: qurbanPackagePeriods.executionNotes,
      availableSlots: sql<number>`
        CASE
          WHEN ${qurbanPackages.packageType} = 'shared'
          THEN (${qurbanPackages.maxSlots} * ${qurbanPackagePeriods.stock}) - ${qurbanPackagePeriods.slotsFilled}
          ELSE ${qurbanPackagePeriods.stock} - ${qurbanPackagePeriods.stockSold}
        END
      `,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(mitra, eq(qurbanPackages.createdBy, mitra.userId))
    .where(
      and(
        eq(qurbanPackagePeriods.periodId, periodId),
        sql<boolean>`${qurbanPackages.isAvailable} AND ${qurbanPackagePeriods.isAvailable}`
      )
    )
    .orderBy(qurbanPackages.isFeatured, qurbanPackagePeriods.price);

  // Add full image URLs
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

// Get single package detail - note: this returns package with one period
// For getting package with specific period, use /periods/:periodId/packages filter
app.get("/packages/:packagePeriodId", async (c) => {
  const db = c.get("db");
  const { packagePeriodId } = c.req.param();
  const apiUrl = (c.env as any)?.API_URL || "http://localhost:50245";

  const pkg = await db
    .select({
      packagePeriodId: qurbanPackagePeriods.id,
      id: qurbanPackages.id,
      periodId: qurbanPackagePeriods.periodId,
      periodName: qurbanPeriods.name,
      periodEndDate: qurbanPeriods.endDate,
      periodExecutionDate: qurbanPeriods.executionDate,
      executionDateOverride: qurbanPackagePeriods.executionDateOverride,
      executionTimeNote: qurbanPackagePeriods.executionTimeNote,
      executionLocation: qurbanPackagePeriods.executionLocation,
      executionNotes: qurbanPackagePeriods.executionNotes,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      name: qurbanPackages.name,
      description: qurbanPackages.description,
      imageUrl: qurbanPackages.imageUrl,
      price: qurbanPackagePeriods.price,
      maxSlots: qurbanPackages.maxSlots,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      ownerType: sql<"organization" | "mitra">`
        CASE
          WHEN ${mitra.id} IS NOT NULL THEN 'mitra'
          ELSE 'organization'
        END
      `,
      ownerName: mitra.name,
      ownerSlug: mitra.slug,
      ownerLogoUrl: mitra.logoUrl,
      isFeatured: qurbanPackages.isFeatured,
      // SEO fields
      metaTitle: qurbanPackages.metaTitle,
      metaDescription: qurbanPackages.metaDescription,
      focusKeyphrase: qurbanPackages.focusKeyphrase,
      canonicalUrl: qurbanPackages.canonicalUrl,
      noIndex: qurbanPackages.noIndex,
      noFollow: qurbanPackages.noFollow,
      ogTitle: qurbanPackages.ogTitle,
      ogDescription: qurbanPackages.ogDescription,
      ogImageUrl: qurbanPackages.ogImageUrl,
      seoScore: qurbanPackages.seoScore,
      availableSlots: sql<number>`
        CASE
          WHEN ${qurbanPackages.packageType} = 'shared'
          THEN (${qurbanPackages.maxSlots} * ${qurbanPackagePeriods.stock}) - ${qurbanPackagePeriods.slotsFilled}
          ELSE ${qurbanPackagePeriods.stock} - ${qurbanPackagePeriods.stockSold}
        END
      `,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .leftJoin(mitra, eq(qurbanPackages.createdBy, mitra.userId))
    .where(eq(qurbanPackagePeriods.id, packagePeriodId))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  // Fetch all package periods for this package master (for period switcher)
  const packageMasterId = pkg[0].id;
  const allPeriods = await db
    .select({
      periodId: qurbanPackagePeriods.periodId,
      packagePeriodId: qurbanPackagePeriods.id,
      periodName: qurbanPeriods.name,
      gregorianYear: qurbanPeriods.gregorianYear,
      price: qurbanPackagePeriods.price,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(
      and(
        eq(qurbanPackagePeriods.packageId, packageMasterId),
        eq(qurbanPeriods.status, "active")
      )
    )
    .orderBy(desc(qurbanPeriods.gregorianYear));

  // Add full image URL
  const enrichedPkg = {
    ...pkg[0],
    imageUrl: pkg[0].imageUrl
      ? (pkg[0].imageUrl.startsWith('http://') || pkg[0].imageUrl.startsWith('https://'))
        ? pkg[0].imageUrl
        : `${apiUrl}${pkg[0].imageUrl}`
      : null,
    availablePeriods: allPeriods, // Add all available periods for this package
  };

  return c.json({ data: enrichedPkg });
});

// ============================================================
// ORDER MANAGEMENT
// ============================================================

// Get my orders (user's orders)
app.get("/orders/my-orders", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const orders = await db
    .select({
      id: qurbanOrders.id,
      orderNumber: qurbanOrders.orderNumber,
      donorName: qurbanOrders.donorName,
      quantity: qurbanOrders.quantity,
      totalAmount: qurbanOrders.totalAmount,
      paidAmount: qurbanOrders.paidAmount,
      paymentMethod: qurbanOrders.paymentMethod,
      paymentStatus: qurbanOrders.paymentStatus,
      orderStatus: qurbanOrders.orderStatus,
      onBehalfOf: qurbanOrders.onBehalfOf,
      orderDate: qurbanOrders.orderDate,
      confirmedAt: qurbanOrders.confirmedAt,
      executedAt: qurbanOrders.executedAt,
      createdAt: qurbanOrders.createdAt,
      package: {
        id: qurbanPackages.id,
        name: qurbanPackages.name,
        animalType: qurbanPackages.animalType,
      },
    })
    .from(qurbanOrders)
    .leftJoin(qurbanPackages, eq(qurbanOrders.packageId, qurbanPackages.id))
    .where(eq(qurbanOrders.userId, user.id))
    .orderBy(desc(qurbanOrders.orderDate));

  return c.json({
    success: true,
    data: orders,
  });
});

// Get order by order number (public endpoint for invoice)
app.get("/orders/by-number/:orderNumber", async (c) => {
  const db = c.get("db");
  const { orderNumber } = c.req.param();

  try {
    const order = await db
      .select({
        id: qurbanOrders.id,
        orderNumber: qurbanOrders.orderNumber,
        donorName: qurbanOrders.donorName,
        donorEmail: qurbanOrders.donorEmail,
        donorPhone: qurbanOrders.donorPhone,
        quantity: qurbanOrders.quantity,
        unitPrice: qurbanOrders.unitPrice,
        adminFee: qurbanOrders.adminFee,
        totalAmount: qurbanOrders.totalAmount,
        paymentMethod: qurbanOrders.paymentMethod,
        paymentMethodId: qurbanOrders.paymentMethodId,
        metadata: qurbanOrders.metadata,
        paidAmount: qurbanOrders.paidAmount,
        paymentStatus: qurbanOrders.paymentStatus,
        orderStatus: qurbanOrders.orderStatus,
        onBehalfOf: qurbanOrders.onBehalfOf,
        notes: qurbanOrders.notes,
        createdAt: qurbanOrders.createdAt,
        confirmedAt: qurbanOrders.confirmedAt,
        packageName: qurbanPackages.name,
        animalType: qurbanPackages.animalType,
        packageType: qurbanPackages.packageType,
        periodName: qurbanPeriods.name,
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

    // Convert snake_case to camelCase for frontend
    const orderWithMetadata = {
      id: order[0].id,
      order_number: order[0].orderNumber,
      donor_name: order[0].donorName,
      donor_email: order[0].donorEmail,
      donor_phone: order[0].donorPhone,
      quantity: order[0].quantity,
      unit_price: order[0].unitPrice,
      admin_fee: order[0].adminFee,
      total_amount: order[0].totalAmount,
      payment_method: order[0].paymentMethod,
      payment_method_id: order[0].paymentMethodId,
      metadata: parsedMetadata,
      paid_amount: order[0].paidAmount,
      payment_status: order[0].paymentStatus,
      order_status: order[0].orderStatus,
      on_behalf_of: order[0].onBehalfOf,
      notes: order[0].notes,
      created_at: order[0].createdAt,
      confirmed_at: order[0].confirmedAt,
      package_name: order[0].packageName,
      animal_type: order[0].animalType,
      package_type: order[0].packageType,
      period_name: order[0].periodName,
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

// Get single order by ID
app.get("/orders/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");

  const orderData = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  if (orderData.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Check authorization (user can only see their own orders, or guest orders)
  if (user && orderData[0].userId && orderData[0].userId !== user.id) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  // Get full order details with relations
  const order = await db
    .select({
      id: qurbanOrders.id,
      orderNumber: qurbanOrders.orderNumber,
      donorName: qurbanOrders.donorName,
      donorEmail: qurbanOrders.donorEmail,
      donorPhone: qurbanOrders.donorPhone,
      quantity: qurbanOrders.quantity,
      unitPrice: qurbanOrders.unitPrice,
      adminFee: qurbanOrders.adminFee,
      totalAmount: qurbanOrders.totalAmount,
      paymentMethod: qurbanOrders.paymentMethod,
      paidAmount: qurbanOrders.paidAmount,
      paymentStatus: qurbanOrders.paymentStatus,
      orderStatus: qurbanOrders.orderStatus,
      onBehalfOf: qurbanOrders.onBehalfOf,
      orderDate: qurbanOrders.orderDate,
      confirmedAt: qurbanOrders.confirmedAt,
      executedAt: qurbanOrders.executedAt,
      notes: qurbanOrders.notes,
      createdAt: qurbanOrders.createdAt,
      package: {
        id: qurbanPackages.id,
        name: qurbanPackages.name,
        animalType: qurbanPackages.animalType,
        description: qurbanPackages.description,
      },
      sharedGroup: qurbanSharedGroups.id ? {
        id: qurbanSharedGroups.id,
        groupNumber: qurbanSharedGroups.groupNumber,
      } : null,
    })
    .from(qurbanOrders)
    .leftJoin(qurbanPackages, eq(qurbanOrders.packageId, qurbanPackages.id))
    .leftJoin(qurbanSharedGroups, eq(qurbanOrders.sharedGroupId, qurbanSharedGroups.id))
    .where(eq(qurbanOrders.id, id))
    .limit(1);

  return c.json({
    success: true,
    data: order[0],
  });
});

// Create order
app.post("/orders", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const user = c.get("user"); // May be null for guest

  // Validate package-period (new structure)
  const packagePeriod = await db
    .select({
      id: qurbanPackagePeriods.id,
      packageId: qurbanPackagePeriods.packageId,
      periodId: qurbanPackagePeriods.periodId,
      price: qurbanPackagePeriods.price,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      isAvailable: qurbanPackagePeriods.isAvailable,
      packageType: qurbanPackages.packageType,
      maxSlots: qurbanPackages.maxSlots,
      packageAvailable: qurbanPackages.isAvailable,
    })
    .from(qurbanPackagePeriods)
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(eq(qurbanPackagePeriods.id, body.packagePeriodId))
    .limit(1);

  if (packagePeriod.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  const pkgPeriod = packagePeriod[0];

  if (!pkgPeriod.isAvailable || !pkgPeriod.packageAvailable) {
    return c.json({ error: "Package not available" }, 400);
  }

  // Check stock
  if (pkgPeriod.packageType === "individual") {
    if (pkgPeriod.stockSold + body.quantity > pkgPeriod.stock) {
      return c.json({ error: "Insufficient stock" }, 400);
    }
  } else {
    // Shared package - check available slots
    const availableSlots = (pkgPeriod.maxSlots! * pkgPeriod.stock) - pkgPeriod.slotsFilled;
    if (body.quantity > availableSlots) {
      return c.json({ error: "Insufficient slots available" }, 400);
    }
  }

  let sharedGroupId = null;

  // Handle shared group assignment
  if (pkgPeriod.package.packageType === "shared") {
    // Find open group with available slots for this package-period
    const openGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(
        and(
          eq(qurbanSharedGroups.packagePeriodId, body.packagePeriodId),
          eq(qurbanSharedGroups.status, "open"),
          sql`${qurbanSharedGroups.slotsFilled} < ${qurbanSharedGroups.maxSlots}`
        )
      )
      .limit(1);

    if (openGroup.length > 0) {
      // Join existing group
      sharedGroupId = openGroup[0].id;

      const newSlotsFilled = openGroup[0].slotsFilled + 1;
      const newStatus = newSlotsFilled >= openGroup[0].maxSlots ? "full" : "open";

      await db
        .update(qurbanSharedGroups)
        .set({
          slotsFilled: newSlotsFilled,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(qurbanSharedGroups.id, sharedGroupId));
    } else {
      // Create new group
      const existingGroupsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packagePeriodId, body.packagePeriodId));

      const groupNumber = Number(existingGroupsCount[0].count) + 1;

      const newGroup = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: pkgPeriod.packageId, // Legacy field
          packagePeriodId: body.packagePeriodId, // New field
          groupNumber,
          maxSlots: pkgPeriod.package.maxSlots || 1,
          slotsFilled: 1,
          status: "open",
        })
        .returning();

      sharedGroupId = newGroup[0].id;
    }

    // Update package-period slots_filled
    await db
      .update(qurbanPackagePeriods)
      .set({
        slotsFilled: sql`${qurbanPackagePeriods.slotsFilled} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(qurbanPackagePeriods.id, body.packagePeriodId));
  } else {
    // Individual package - increment stock_sold
    await db
      .update(qurbanPackagePeriods)
      .set({
        stockSold: sql`${qurbanPackagePeriods.stockSold} + ${body.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(qurbanPackagePeriods.id, body.packagePeriodId));
  }

  // Generate order number
  const orderCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanOrders);

  const orderNumber = `QBN-${getCurrentYearWIB()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;

  // Calculate total amount (price * quantity + admin fee)
  const subtotal = pkgPeriod.price * (body.quantity || 1);
  const adminFee = body.adminFee || 0;
  const totalAmount = subtotal + adminFee;

  // Create order
  const newOrder = await db
    .insert(qurbanOrders)
    .values({
      id: createId(),
      orderNumber,
      userId: user?.id || null,
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      donorPhone: body.donorPhone,
      packagePeriodId: body.packagePeriodId, // New field
      packageId: pkgPeriod.packageId, // Legacy field for compatibility
      sharedGroupId,
      quantity: body.quantity || 1,
      unitPrice: pkgPeriod.price,
      adminFee: adminFee,
      totalAmount: totalAmount,
      paymentMethod: body.paymentMethod,
      installmentFrequency: body.installmentFrequency,
      installmentCount: body.installmentCount,
      installmentAmount: body.installmentAmount,
      onBehalfOf: body.onBehalfOf,
      notes: body.notes,
    })
    .returning();

  return c.json({
    data: newOrder[0],
    message: "Order created successfully",
  });
});

// ============================================================
// PAYMENT
// ============================================================

// Get payments by order ID
app.get("/payments/order/:orderId", async (c) => {
  const db = c.get("db");
  const { orderId } = c.req.param();

  const payments = await db
    .select()
    .from(qurbanPayments)
    .where(eq(qurbanPayments.orderId, orderId))
    .orderBy(desc(qurbanPayments.createdAt));

  // Construct full URL for payment proofs
  const apiUrl = (c.env as any)?.API_URL || process.env.API_URL || "http://localhost:50245";
  const paymentsWithUrls = payments.map((payment: any) => {
    const fullUrl = payment.paymentProof
      ? (payment.paymentProof.includes("://")
          ? payment.paymentProof
          : `${apiUrl}${payment.paymentProof.startsWith('/') ? '' : '/'}${payment.paymentProof}`)
      : null;

    return {
      ...payment,
      paymentProof: fullUrl,
      paymentProofUrl: fullUrl, // Add this for frontend compatibility
      paymentStatus: payment.status, // Map status to paymentStatus for frontend
    };
  });

  return c.json({
    success: true,
    data: paymentsWithUrls,
  });
});

// Create payment
app.post("/payments", async (c) => {
  const db = c.get("db");

  // Check if request is multipart/form-data
  const contentType = c.req.header("content-type");
  let body: any;
  let paymentProofUrl: string | null = null;

  if (contentType?.includes("multipart/form-data")) {
    // Handle file upload
    const parsedBody = await c.req.parseBody();
    const file = parsedBody.file as File;

    if (file) {
      // Validate file type (images and PDFs only)
      const allowedTypes = ["image/", "application/pdf"];
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        return c.json({ error: "Only image and PDF files are allowed" }, 400);
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return c.json({ error: "File size must be less than 5MB" }, 400);
      }

      // Generate filename
      const sanitizedName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '-');
      const finalFilename = `${Date.now()}-${sanitizedName}`;

      // Get buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check if CDN is enabled
      const cdnConfig = await fetchCDNSettings(db);
      let path: string;
      let fullUrl: string;

      if (cdnConfig) {
        // CDN Mode: Upload to Google Cloud Storage
        console.log("CDN enabled, uploading qurban payment proof to GCS...");

        try {
          const gcsPath = generateGCSPath(finalFilename);
          fullUrl = await uploadToGCS(cdnConfig, buffer, gcsPath, file.type);
          path = fullUrl; // Store full GCS URL
          console.log("Qurban payment proof uploaded to GCS:", fullUrl);
        } catch (error) {
          console.error("GCS upload failed, falling back to local storage:", error);
          // Fallback to local storage if GCS fails
          path = `/uploads/${finalFilename}`;
          fullUrl = path;

          // Store locally as fallback
          try {
            const uploadsDir = pathModule.join(process.cwd(), "uploads");
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            fs.writeFileSync(pathModule.join(uploadsDir, finalFilename), buffer);
          } catch (fsError) {
            console.error("Local storage also failed:", fsError);
          }
        }
      } else {
        // Local Mode: Store in filesystem
        console.log("CDN disabled, using local storage for qurban payment proof");
        path = `/uploads/${finalFilename}`;
        fullUrl = path;

        // Store in filesystem
        try {
          const uploadsDir = pathModule.join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const filePath = pathModule.join(uploadsDir, finalFilename);
          fs.writeFileSync(filePath, buffer);
        } catch (error) {
          console.error("Filesystem error:", error);
        }

        // Store in global map for immediate access (local mode only)
        if (!global.uploadedFiles) {
          global.uploadedFiles = new Map();
        }
        global.uploadedFiles.set(finalFilename, buffer);
      }

      // Save to media table
      await db.insert(media).values({
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path,
        path: path,
        folder: cdnConfig ? "gcs" : "uploads",
        category: "financial",
      });

      paymentProofUrl = path;
    }

    // Extract other fields from form data
    body = {
      orderId: parsedBody.orderId as string,
      amount: Number(parsedBody.amount),
      paymentMethod: parsedBody.paymentMethod as string,
      paymentChannel: parsedBody.paymentChannel as string,
      installmentNumber: parsedBody.installmentNumber ? Number(parsedBody.installmentNumber) : null,
      notes: parsedBody.notes as string || null,
    };
  } else {
    // Handle JSON request (backward compatibility)
    body = await c.req.json();
    paymentProofUrl = body.paymentProof || null;
  }

  // Validate order
  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, body.orderId))
    .limit(1);

  if (order.length === 0) {
    return c.json({ error: "Order not found" }, 404);
  }

  if (order[0].orderStatus === "cancelled") {
    return c.json({ error: "Cannot pay for cancelled order" }, 400);
  }

  // Generate payment number
  const paymentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanPayments);

  const paymentNumber = `PAY-QBN-${getCurrentYearWIB()}-${String(Number(paymentCount[0].count) + 1).padStart(5, "0")}`;

  // Create payment
  const newPayment = await db
    .insert(qurbanPayments)
    .values({
      id: createId(),
      paymentNumber,
      orderId: body.orderId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentChannel: body.paymentChannel,
      installmentNumber: body.installmentNumber,
      paymentProof: paymentProofUrl,
      notes: body.notes,
      status: "pending", // Needs admin verification
    })
    .returning();

  return c.json({
    data: newPayment[0],
    message: "Payment submitted successfully. Waiting for verification.",
  });
});

// ============================================================
// SAVINGS
// ============================================================

// Get my savings (user's savings)
app.get("/savings", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user");

    if (!user || !user.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const savingsRows = await db.query.qurbanSavings.findMany({
      where: eq(qurbanSavings.userId, user.id),
      orderBy: [desc(qurbanSavings.createdAt)],
      with: {
        targetPackage: {
          columns: {
            id: true,
            name: true,
            animalType: true,
            price: true,
          },
        },
        targetPeriod: {
          columns: {
            id: true,
            name: true,
            endDate: true,
          },
        },
        targetPackagePeriod: {
          columns: {
            id: true,
            periodId: true,
            packageId: true,
            price: true,
          },
          with: {
            package: {
              columns: {
                id: true,
                name: true,
                animalType: true,
                price: true,
              },
            },
            period: {
              columns: {
                id: true,
                name: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    const savings = savingsRows.map((item: any) => ({
      ...item,
      targetPackage: item.targetPackage || item.targetPackagePeriod?.package || null,
      targetPeriod: item.targetPeriod || item.targetPackagePeriod?.period || null,
      targetPackageId: item.targetPackageId || item.targetPackagePeriod?.packageId || null,
      targetPeriodId: item.targetPeriodId || item.targetPackagePeriod?.periodId || null,
    }));

    return c.json({
      success: true,
      data: savings,
    });
  } catch (error) {
    console.error("Error fetching savings:", error);
    return c.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

// Get single savings by ID
app.get("/savings/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const row = await db.query.qurbanSavings.findFirst({
    where: and(eq(qurbanSavings.id, id), eq(qurbanSavings.userId, user.id)),
    with: {
      targetPackage: true,
      targetPeriod: true,
      targetPackagePeriod: {
        with: {
          package: true,
          period: true,
        },
      },
    },
  });

  if (!row) {
    return c.json({ error: "Savings not found" }, 404);
  }
  const savings = {
    id: row.id,
    savingsNumber: row.savingsNumber,
    donorName: row.donorName,
    donorEmail: row.donorEmail,
    donorPhone: row.donorPhone,
    targetPackagePeriodId: row.targetPackagePeriodId,
    targetPeriodId: row.targetPeriodId || row.targetPackagePeriod?.periodId || null,
    targetPackageId: row.targetPackageId || row.targetPackagePeriod?.packageId || null,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    installmentFrequency: row.installmentFrequency,
    installmentCount: row.installmentCount,
    installmentAmount: row.installmentAmount,
    installmentDay: row.installmentDay,
    status: row.status,
    startDate: row.startDate,
    notes: row.notes,
    createdAt: row.createdAt,
    targetPeriod: row.targetPeriod || row.targetPackagePeriod?.period || null,
    targetPackage: row.targetPackage || row.targetPackagePeriod?.package || null,
  };

  return c.json({
    success: true,
    data: savings,
  });
});

// Get savings transactions
app.get("/savings/:id/transactions", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Verify savings belongs to user
  const savings = await db
    .select()
    .from(qurbanSavings)
    .where(and(eq(qurbanSavings.id, id), eq(qurbanSavings.userId, user.id)))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  const legacyTransactions = await db
    .select()
    .from(qurbanSavingsTransactions)
    .where(eq(qurbanSavingsTransactions.savingsId, id))
    .orderBy(desc(qurbanSavingsTransactions.createdAt));

  const universalSavingsTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.category, "qurban_savings"),
      eq(transactions.productType, "qurban"),
      sql`${transactions.typeSpecificData} ->> 'savings_id' = ${id}`
    ),
    with: {
      payments: true,
    },
    orderBy: [desc(transactions.createdAt)],
  });

  const normalizedUniversal = universalSavingsTransactions.flatMap((tx: any) => {
    const payments = Array.isArray(tx.payments) ? tx.payments : [];
    if (payments.length === 0) {
      return [{
        id: tx.id,
        transactionId: tx.id,
        savingsId: id,
        transactionNumber: tx.transactionNumber,
        amount: Number(tx.totalAmount || 0),
        transactionType: "deposit",
        transactionDate: tx.createdAt,
        paymentMethod: tx.paymentMethodId || null,
        paymentChannel: null,
        paymentProof: null,
        status: tx.paymentStatus === "paid" ? "verified" : "pending",
        notes: tx.notes || null,
        createdAt: tx.createdAt,
      }];
    }

    return payments.map((payment: any) => ({
      id: payment.id,
      transactionId: tx.id,
      savingsId: id,
      transactionNumber: payment.paymentNumber || tx.transactionNumber,
      amount: Number(payment.amount || tx.totalAmount || 0),
      transactionType: "deposit",
      transactionDate: payment.paymentDate || tx.createdAt,
      paymentMethod: payment.paymentMethod || tx.paymentMethodId || null,
      paymentChannel: payment.paymentChannel || null,
      paymentProof: payment.paymentProof || null,
      status: payment.status === "verified" ? "verified" : payment.status === "rejected" ? "rejected" : "pending",
      notes: payment.notes || tx.notes || null,
      createdAt: payment.createdAt || tx.createdAt,
      verifiedAt: payment.verifiedAt || null,
      verifiedBy: payment.verifiedBy || null,
    }));
  });

  const merged = [...legacyTransactions, ...normalizedUniversal].sort((a: any, b: any) => {
    const aTime = new Date(a.createdAt || a.transactionDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.transactionDate || 0).getTime();
    return bTime - aTime;
  });

  return c.json({
    success: true,
    data: merged,
  });
});

// Create savings
app.post("/savings", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!body.donorName || !body.donorPhone) {
    return c.json({ error: "Nama dan nomor HP wajib diisi" }, 400);
  }

  let resolvedPeriodId = body.targetPeriodId as string | undefined;
  let resolvedPackageId = body.targetPackageId as string | undefined;
  let resolvedPackagePeriodId = body.targetPackagePeriodId as string | undefined;

  if (resolvedPackagePeriodId) {
    const packagePeriod = await db.query.qurbanPackagePeriods.findFirst({
      where: eq(qurbanPackagePeriods.id, resolvedPackagePeriodId),
    });
    if (!packagePeriod) {
      return c.json({ error: "Package period not found" }, 404);
    }
    resolvedPeriodId = resolvedPeriodId || packagePeriod.periodId;
    resolvedPackageId = resolvedPackageId || packagePeriod.packageId;
  }

  if (!resolvedPeriodId) {
    return c.json({ error: "Target period is required" }, 400);
  }

  // Validate period
  const period = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.id, resolvedPeriodId))
    .limit(1);

  if (period.length === 0) {
    return c.json({ error: "Period not found" }, 404);
  }

  // Generate savings number
  const savingsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanSavings);

  const savingsNumber = `SAV-QBN-${getCurrentYearWIB()}-${String(Number(savingsCount[0].count) + 1).padStart(5, "0")}`;

  // Create savings
  const newSavings = await db
    .insert(qurbanSavings)
    .values({
      id: createId(),
      savingsNumber,
      userId: user.id,
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      donorPhone: body.donorPhone,
      targetPeriodId: resolvedPeriodId,
      targetPackagePeriodId: resolvedPackagePeriodId, // New field for package-period junction
      targetPackageId: resolvedPackageId, // Legacy field for backward compatibility
      targetAmount: body.targetAmount,
      installmentFrequency: body.installmentFrequency,
      installmentCount: body.installmentCount,
      installmentAmount: body.installmentAmount,
      installmentDay: body.installmentDay,
      startDate: new Date(body.startDate),
      notes: body.notes,
    })
    .returning();

  return c.json({
    success: true,
    data: newSavings[0],
    message: "Savings created successfully",
  });
});

// Deposit to savings
app.post("/savings/:id/deposit", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();
  const user = c.get("user");

  if (!user || !user.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Validate savings
  const savings = await db
    .select()
    .from(qurbanSavings)
    .where(and(eq(qurbanSavings.id, id), eq(qurbanSavings.userId, user.id)))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  if (savings[0].status !== "active") {
    return c.json({ error: "Savings is not active" }, 400);
  }

  const depositAmount = Number(body.amount || 0);
  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return c.json({ error: "Amount must be greater than 0" }, 400);
  }

  let targetPackagePeriodId = savings[0].targetPackagePeriodId;
  if (!targetPackagePeriodId && savings[0].targetPackageId && savings[0].targetPeriodId) {
    const packagePeriod = await db.query.qurbanPackagePeriods.findFirst({
      where: and(
        eq(qurbanPackagePeriods.packageId, savings[0].targetPackageId),
        eq(qurbanPackagePeriods.periodId, savings[0].targetPeriodId)
      ),
    });
    targetPackagePeriodId = packagePeriod?.id;
  }

  if (!targetPackagePeriodId) {
    return c.json({ error: "Target package period for savings not found" }, 400);
  }

  const txService = new TransactionService(db);
  const created = await txService.create({
    product_type: "qurban",
    product_id: targetPackagePeriodId,
    quantity: 1,
    unit_price: depositAmount,
    admin_fee: 0,
    donor_name: savings[0].donorName,
    donor_email: savings[0].donorEmail || undefined,
    donor_phone: savings[0].donorPhone || undefined,
    user_id: savings[0].userId || undefined,
    include_unique_code: false,
    type_specific_data: {
      payment_type: "savings",
      savings_id: id,
      savings_number: savings[0].savingsNumber,
      target_package_period_id: targetPackagePeriodId,
      installment_sequence: null,
    },
    payment_method_id: undefined,
    message: body.notes || undefined,
  });

  return c.json({
    data: {
      transactionId: created.id,
      transactionNumber: created.transactionNumber,
      amount: created.totalAmount,
      status: created.paymentStatus,
    },
    message: "Deposit draft created. Continue to payment method.",
  });
});

// Convert savings to order
app.post("/savings/:id/convert", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();
  const user = c.get("user");

  if (!user || !user.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Validate savings
  const savings = await db.query.qurbanSavings.findFirst({
    where: and(eq(qurbanSavings.id, id), eq(qurbanSavings.userId, user.id)),
  });

  if (!savings) {
    return c.json({ error: "Savings not found" }, 404);
  }

  if (savings.status === "converted") {
    const existingConversion = await db.query.qurbanSavingsConversions.findFirst({
      where: eq(qurbanSavingsConversions.savingsId, id),
      orderBy: [desc(qurbanSavingsConversions.convertedAt)],
    });
    return c.json({
      message: "Savings already converted",
      data: {
        order: existingConversion
          ? {
              id: existingConversion.orderId,
              orderNumber: existingConversion.orderNumber,
            }
          : null,
        conversion: existingConversion || null,
      },
    });
  }

  if (savings.status !== "completed") {
    return c.json({ error: "Savings not completed yet" }, 400);
  }

  let targetPackagePeriodId = body.packagePeriodId || savings.targetPackagePeriodId;
  if (!targetPackagePeriodId && savings.targetPackageId && savings.targetPeriodId) {
    const packagePeriod = await db.query.qurbanPackagePeriods.findFirst({
      where: and(
        eq(qurbanPackagePeriods.packageId, savings.targetPackageId),
        eq(qurbanPackagePeriods.periodId, savings.targetPeriodId)
      ),
    });
    targetPackagePeriodId = packagePeriod?.id;
  }

  if (!targetPackagePeriodId) {
    return c.json({ error: "Target package period for savings not found" }, 400);
  }

  // Validate package period
  const pkgPeriod = await db.query.qurbanPackagePeriods.findFirst({
    where: eq(qurbanPackagePeriods.id, targetPackagePeriodId),
    with: {
      package: true,
    },
  });

  if (!pkgPeriod) {
    return c.json({ error: "Package period not found" }, 404);
  }

  const packagePrice = Number(pkgPeriod.price || 0);
  if (Number(savings.currentAmount || 0) < packagePrice) {
    return c.json({ error: "Insufficient savings balance" }, 400);
  }

  // Create order (similar logic to regular order)
  const orderCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanOrders);

  const orderNumber = `QBN-${getCurrentYearWIB()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;

  let sharedGroupId = null;
  const now = new Date();

  // Handle shared group for sapi patungan
  if (pkgPeriod.package.packageType === "shared") {
    // Find open group with available slots for this package-period
    const openGroup = await db
      .select()
      .from(qurbanSharedGroups)
      .where(
        and(
          eq(qurbanSharedGroups.packagePeriodId, targetPackagePeriodId),
          eq(qurbanSharedGroups.status, "open"),
          sql`${qurbanSharedGroups.slotsFilled} < ${qurbanSharedGroups.maxSlots}`
        )
      )
      .limit(1);

    if (openGroup.length > 0) {
      // Join existing group
      sharedGroupId = openGroup[0].id;

      const newSlotsFilled = openGroup[0].slotsFilled + 1;
      const newStatus = newSlotsFilled >= openGroup[0].maxSlots ? "full" : "open";

      await db
        .update(qurbanSharedGroups)
        .set({
          slotsFilled: newSlotsFilled,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(qurbanSharedGroups.id, sharedGroupId));
    } else {
      // Create new group
      const existingGroupsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packagePeriodId, targetPackagePeriodId));

      const groupNumber = Number(existingGroupsCount[0].count) + 1;

      const newGroup = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: pkgPeriod.packageId,
          packagePeriodId: targetPackagePeriodId,
          groupNumber,
          maxSlots: pkgPeriod.package.maxSlots || 1,
          slotsFilled: 1,
          status: "open",
        })
        .returning();

      sharedGroupId = newGroup[0].id;
    }

    await db
      .update(qurbanPackagePeriods)
      .set({
        slotsFilled: sql`${qurbanPackagePeriods.slotsFilled} + 1`,
        updatedAt: now,
      })
      .where(eq(qurbanPackagePeriods.id, targetPackagePeriodId));
  } else {
    await db
      .update(qurbanPackagePeriods)
      .set({
        stockSold: sql`${qurbanPackagePeriods.stockSold} + 1`,
        updatedAt: now,
      })
      .where(eq(qurbanPackagePeriods.id, targetPackagePeriodId));
  }

  // Create order (already paid from savings)
  const newOrder = await db
    .insert(qurbanOrders)
    .values({
      id: createId(),
      orderNumber,
      userId: savings.userId,
      donorName: savings.donorName,
      donorEmail: savings.donorEmail,
      donorPhone: savings.donorPhone,
      packageId: pkgPeriod.packageId,
      packagePeriodId: targetPackagePeriodId,
      sharedGroupId,
      quantity: 1,
      unitPrice: packagePrice,
      totalAmount: packagePrice,
      paymentMethod: "savings_conversion",
      paidAmount: packagePrice, // Covered by savings allocation
      paymentStatus: "paid",
      orderStatus: "confirmed",
      onBehalfOf: body.onBehalfOf || savings.donorName,
      confirmedAt: now,
      notes: body.notes || "Konversi tabungan (non-cash)",
    })
    .returning();

  const [allocationTx] = await db
    .insert(transactions)
    .values({
      id: createId(),
      transactionNumber: generateSavingsConversionTxNumber(),
      productType: "qurban",
      productId: targetPackagePeriodId,
      productName: pkgPeriod.package.name,
      productDescription: pkgPeriod.package.description,
      productImage: pkgPeriod.package.imageUrl,
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      adminFee: 0,
      totalAmount: 0,
      uniqueCode: 0,
      donorName: savings.donorName,
      donorEmail: savings.donorEmail,
      donorPhone: savings.donorPhone,
      userId: savings.userId,
      paymentMethodId: "internal_savings",
      paymentStatus: "paid",
      paidAmount: 0,
      paidAt: now,
      typeSpecificData: {
        payment_type: "savings_conversion",
        funding_source: "savings",
        is_non_cash: true,
        savings_id: savings.id,
        savings_number: savings.savingsNumber,
        converted_amount: packagePrice,
        order_id: newOrder[0].id,
        order_number: newOrder[0].orderNumber,
      },
      category: "qurban_savings",
      transactionType: "allocation",
      notes: body.notes || "Alokasi non-cash tabungan qurban ke order",
      createdAt: now,
      updatedAt: now,
    } as any)
    .returning();

  const [conversion] = await db
    .insert(qurbanSavingsConversions)
    .values({
      id: createId(),
      savingsId: savings.id,
      convertedAmount: packagePrice,
      orderId: newOrder[0].id,
      orderNumber: newOrder[0].orderNumber,
      orderTransactionId: allocationTx.id,
      notes: body.notes || null,
      convertedBy: user.id,
      convertedAt: now,
      createdAt: now,
    })
    .returning();

  // Update savings status
  await db
    .update(qurbanSavings)
    .set({
      status: "converted",
      updatedAt: now,
    })
    .where(eq(qurbanSavings.id, id));

  return c.json({
    data: {
      order: newOrder[0],
      conversion,
    },
    message: "Savings converted to order successfully (non-cash)",
  });
});

// POST /qurban/orders/:id/confirm-payment - Confirm payment method selection
const confirmPaymentSchema = z.object({
  paymentMethodId: z.string(),
  metadata: z.record(z.any()).optional(),
});

app.post("/orders/:id/confirm-payment", zValidator("json", confirmPaymentSchema), async (c) => {
  const orderId = c.req.param("id");
  const { paymentMethodId, metadata: providedMetadata } = c.req.valid("json");
  const db = c.get("db");

  // Verify qurban order exists
  const order = await db.query.qurbanOrders.findFirst({
    where: eq(qurbanOrders.id, orderId),
  });

  if (!order) {
    return error(c, "Qurban order not found", 404);
  }

  // Update qurban order with payment method
  const updateData: any = {
    paymentMethodId,
    paymentStatus: "pending", // Pending until proof uploaded
    updatedAt: new Date(),
  };

  // If metadata provided from frontend, use it
  if (providedMetadata && Object.keys(providedMetadata).length > 0) {
    const existingMetadata = order.metadata || {};
    updateData.metadata = {
      ...existingMetadata,
      ...providedMetadata,
    };
  }
  // Otherwise, try to get from payment_methods table
  else if (paymentMethodId.startsWith('bank-') || paymentMethodId.includes('qris')) {
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.code, paymentMethodId),
    });

    if (paymentMethod?.details) {
      const existingMetadata = order.metadata || {};
      const newMetadata: any = { ...existingMetadata };

      if (paymentMethodId.startsWith('bank-')) {
        newMetadata.bankName = paymentMethod.details.bankName || paymentMethod.name;
        newMetadata.accountNumber = paymentMethod.details.accountNumber;
        newMetadata.accountName = paymentMethod.details.accountName;
      } else if (paymentMethodId.includes('qris')) {
        newMetadata.qrisName = paymentMethod.details.name || paymentMethod.name;
      }

      updateData.metadata = newMetadata;
    }
  }

  await db
    .update(qurbanOrders)
    .set(updateData)
    .where(eq(qurbanOrders.id, orderId));

  return success(c, { id: orderId, paymentMethodId }, "Payment method confirmed");
});

// POST /qurban/orders/:id/upload-proof - Upload payment proof
app.post("/orders/:id/upload-proof", async (c) => {
  try {
    const orderId = c.req.param("id");
    const db = c.get("db");

    // Verify qurban order exists
    const order = await db.query.qurbanOrders.findFirst({
      where: eq(qurbanOrders.id, orderId),
    });

    if (!order) {
      return error(c, "Qurban order not found", 404);
    }

    // Parse multipart form data
    const body = await c.req.parseBody();
    const file = body.file as File;
    const transferAmount = body.amount ? Number(body.amount) : null;

    if (!file) {
      return error(c, "No file provided", 400);
    }

    // Validate transfer amount
    if (!transferAmount || transferAmount <= 0) {
      return error(c, "Invalid transfer amount", 400);
    }

    // Validate file type (images and PDFs only)
    const allowedTypes = ["image/", "application/pdf"];
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      return error(c, "Only image and PDF files are allowed", 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return error(c, "File size must be less than 5MB", 400);
    }

    // Generate filename
    const sanitizedName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '-');
    const finalFilename = `${Date.now()}-${sanitizedName}`;

    // Get buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if CDN is enabled
    console.log("Checking CDN settings...");
    const cdnConfig = await fetchCDNSettings(db);
    let fileUrl = "";

    if (cdnConfig) {
      // Upload to GCS
      console.log("CDN enabled, uploading to GCS...");
      try {
        const gcsPath = generateGCSPath(finalFilename);
        fileUrl = await uploadToGCS(cdnConfig, buffer, gcsPath, file.type);
        console.log("GCS upload successful:", fileUrl);
      } catch (gcsError: any) {
        console.error("GCS upload failed, falling back to local:", gcsError.message);
        // Fallback to local storage
        const uploadsDir = pathModule.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = pathModule.join(uploadsDir, finalFilename);
        fs.writeFileSync(filePath, buffer);

        if (!global.uploadedFiles) {
          global.uploadedFiles = new Map();
        }
        global.uploadedFiles.set(finalFilename, buffer);

        const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
        fileUrl = `${apiUrl}/uploads/${finalFilename}`;
      }
    } else {
      // Store locally
      console.log("CDN disabled, storing locally...");
      const uploadsDir = pathModule.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = pathModule.join(uploadsDir, finalFilename);
      fs.writeFileSync(filePath, buffer);

      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      global.uploadedFiles.set(finalFilename, buffer);

      const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
      fileUrl = `${apiUrl}/uploads/${finalFilename}`;
    }
    console.log("File URL:", fileUrl);

    // Create payment record
    console.log("Creating payment record...");
    const timestamp = getCurrentYearWIB();
    const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();

    // Determine payment method type
    let paymentMethodType = "bank_transfer";
    let paymentChannel = null;

    if (order.paymentMethodId) {
      // Get payment method details from database to determine type
      const paymentMethodRecord = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.code, order.paymentMethodId),
      });

      if (paymentMethodRecord) {
        paymentMethodType = paymentMethodRecord.type; // 'bank_transfer', 'qris', 'ewallet', 'va'
        paymentChannel = order.paymentMethodId; // Use the code directly without prefix
      } else {
        // Fallback: if not found in DB, guess from code format
        if (order.paymentMethodId.includes('qris')) {
          paymentMethodType = 'qris';
          paymentChannel = order.paymentMethodId;
        } else if (order.paymentMethodId.startsWith('bank-')) {
          paymentMethodType = 'bank_transfer';
          paymentChannel = order.paymentMethodId;
        } else {
          // Default to bank_transfer with bank_ prefix for backward compatibility
          paymentMethodType = 'bank_transfer';
          paymentChannel = `bank_${order.paymentMethodId}`;
        }
      }
    }

    // Generate notes based on transfer amount vs order total
    let paymentNotes = "Bukti pembayaran dari user";
    if (transferAmount > order.totalAmount) {
      const excess = transferAmount - order.totalAmount;
      paymentNotes += ` (Transfer lebih: ${excess})`;
    } else if (transferAmount < order.totalAmount) {
      const shortage = order.totalAmount - transferAmount;
      paymentNotes += ` (Transfer kurang: ${shortage}, pembayaran sebagian)`;
    }

    const paymentData = {
      id: createId(),
      paymentNumber: `PAY-QBN-${timestamp}-${randomStr}`,
      orderId: orderId,
      amount: transferAmount, // Use actual transfer amount, not order total
      paymentMethod: paymentMethodType,
      paymentChannel: paymentChannel,
      paymentProof: fileUrl,
      status: "pending" as const,
      notes: paymentNotes,
    };
    console.log("Payment data:", paymentData);

    await db.insert(qurbanPayments).values(paymentData);
    console.log("Payment record created successfully");

    // Update order: increment paidAmount with actual transfer amount
    // paidAmount tracks total claimed payments (verified or not)
    // paymentStatus only changes to "paid" when admin verifies the payment
    const newPaidAmount = order.paidAmount + transferAmount;

    await db
      .update(qurbanOrders)
      .set({
        paidAmount: newPaidAmount,
        paymentStatus: "pending", // Keep as pending until admin verifies
        updatedAt: new Date(),
      })
      .where(eq(qurbanOrders.id, orderId));

    console.log(`Order updated: paidAmount=${newPaidAmount}, paymentStatus=pending (waiting verification)`);

    console.log("Upload proof completed successfully");
    return success(c, {
      url: fileUrl,
      filename: finalFilename,
      paidAmount: newPaidAmount,
      paymentStatus: "pending",
    }, "Payment proof uploaded successfully");

  } catch (err: any) {
    console.error("Error uploading payment proof:", err);
    console.error("Error details:", err.message, err.stack);
    return error(c, `Failed to upload payment proof: ${err.message}`, 500);
  }
});

export default app;
