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
  createId,
  media,
} from "@bantuanku/db";
import { getCurrentYearWIB } from "../utils/timezone";
import * as fs from "fs";
import * as pathModule from "path";
import { optionalAuthMiddleware } from "../middleware/auth";
import { success, error } from "../lib/response";

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
    .where(eq(qurbanPackagePeriods.id, packagePeriodId))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  // Add full image URL
  const enrichedPkg = {
    ...pkg[0],
    imageUrl: pkg[0].imageUrl
      ? (pkg[0].imageUrl.startsWith('http://') || pkg[0].imageUrl.startsWith('https://'))
        ? pkg[0].imageUrl
        : `${apiUrl}${pkg[0].imageUrl}`
      : null,
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
  if (pkgPeriod.packageType === "shared") {
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
          maxSlots: pkgPeriod.maxSlots!,
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

  return c.json({
    success: true,
    data: payments,
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
      const path = `/uploads/${finalFilename}`;

      // Get buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

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

      // Store in global map for immediate access
      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      global.uploadedFiles.set(finalFilename, buffer);

      // Save to media table
      await db.insert(media).values({
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path,
        path: path,
        folder: "uploads",
        category: "qurban_payment",
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

    const savings = await db.query.qurbanSavings.findMany({
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
      },
    });

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

  const results = await db
    .select({
      id: qurbanSavings.id,
      savingsNumber: qurbanSavings.savingsNumber,
      donorName: qurbanSavings.donorName,
      donorEmail: qurbanSavings.donorEmail,
      donorPhone: qurbanSavings.donorPhone,
      targetPeriodId: qurbanSavings.targetPeriodId,
      targetPackageId: qurbanSavings.targetPackageId,
      targetAmount: qurbanSavings.targetAmount,
      currentAmount: qurbanSavings.currentAmount,
      installmentFrequency: qurbanSavings.installmentFrequency,
      installmentAmount: qurbanSavings.installmentAmount,
      installmentDay: qurbanSavings.installmentDay,
      status: qurbanSavings.status,
      startDate: qurbanSavings.startDate,
      completedAt: qurbanSavings.completedAt,
      convertedAt: qurbanSavings.convertedAt,
      convertedToOrderId: qurbanSavings.convertedToOrderId,
      notes: qurbanSavings.notes,
      createdAt: qurbanSavings.createdAt,
      periodId: qurbanPeriods.id,
      periodName: qurbanPeriods.name,
      periodEndDate: qurbanPeriods.endDate,
      packageId: qurbanPackages.id,
      packageName: qurbanPackages.name,
      packageAnimalType: qurbanPackages.animalType,
      packagePrice: qurbanPackages.price,
    })
    .from(qurbanSavings)
    .leftJoin(qurbanPeriods, eq(qurbanSavings.targetPeriodId, qurbanPeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanSavings.targetPackageId, qurbanPackages.id))
    .where(and(eq(qurbanSavings.id, id), eq(qurbanSavings.userId, user.id)))
    .limit(1);

  if (results.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  const row = results[0];
  const savings = {
    id: row.id,
    savingsNumber: row.savingsNumber,
    donorName: row.donorName,
    donorEmail: row.donorEmail,
    donorPhone: row.donorPhone,
    targetPeriodId: row.targetPeriodId,
    targetPackageId: row.targetPackageId,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    installmentFrequency: row.installmentFrequency,
    installmentAmount: row.installmentAmount,
    installmentDay: row.installmentDay,
    status: row.status,
    startDate: row.startDate,
    completedAt: row.completedAt,
    convertedAt: row.convertedAt,
    convertedToOrderId: row.convertedToOrderId,
    notes: row.notes,
    createdAt: row.createdAt,
    targetPeriod: row.periodId ? {
      id: row.periodId,
      name: row.periodName,
      endDate: row.periodEndDate,
    } : null,
    targetPackage: row.packageId ? {
      id: row.packageId,
      name: row.packageName,
      animalType: row.packageAnimalType,
      price: row.packagePrice,
    } : null,
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

  const transactions = await db
    .select()
    .from(qurbanSavingsTransactions)
    .where(eq(qurbanSavingsTransactions.savingsId, id))
    .orderBy(desc(qurbanSavingsTransactions.createdAt));

  return c.json({
    success: true,
    data: transactions,
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

  // Validate period
  const period = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.id, body.targetPeriodId))
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
      targetPeriodId: body.targetPeriodId,
      targetPackagePeriodId: body.targetPackagePeriodId, // New field for package-period junction
      targetPackageId: body.targetPackageId, // Legacy field for backward compatibility
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

  // Validate savings
  const savings = await db
    .select()
    .from(qurbanSavings)
    .where(eq(qurbanSavings.id, id))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  if (savings[0].status !== "active") {
    return c.json({ error: "Savings is not active" }, 400);
  }

  // Generate transaction number
  const trxCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanSavingsTransactions);

  const transactionNumber = `TRX-SAV-QBN-${getCurrentYearWIB()}-${String(Number(trxCount[0].count) + 1).padStart(5, "0")}`;

  // Create transaction
  const newTransaction = await db
    .insert(qurbanSavingsTransactions)
    .values({
      id: createId(),
      transactionNumber,
      savingsId: id,
      amount: body.amount,
      transactionType: "deposit",
      paymentMethod: body.paymentMethod,
      paymentChannel: body.paymentChannel,
      paymentProof: body.paymentProof,
      status: "pending", // Needs verification
    })
    .returning();

  return c.json({
    data: newTransaction[0],
    message: "Deposit submitted successfully. Waiting for verification.",
  });
});

// Convert savings to order
app.post("/savings/:id/convert", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  // Validate savings
  const savings = await db
    .select()
    .from(qurbanSavings)
    .where(eq(qurbanSavings.id, id))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  if (savings[0].status !== "completed") {
    return c.json({ error: "Savings not completed yet" }, 400);
  }

  // Validate package
  const pkg = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, body.packageId))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package not found" }, 404);
  }

  if (savings[0].currentAmount < pkg[0].price) {
    return c.json({ error: "Insufficient savings balance" }, 400);
  }

  // Create order (similar logic to regular order)
  const orderCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanOrders);

  const orderNumber = `QBN-${getCurrentYearWIB()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;

  let sharedGroupId = null;

  // Handle shared group for sapi patungan
  if (pkg[0].packageType === "shared") {
    const openGroup = await db
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

    if (openGroup.length > 0) {
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
      const existingGroupsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packageId, body.packageId));

      const groupNumber = Number(existingGroupsCount[0].count) + 1;

      const newGroup = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: body.packageId,
          groupNumber,
          maxSlots: pkg[0].maxSlots!,
          slotsFilled: 1,
          status: "open",
        })
        .returning();

      sharedGroupId = newGroup[0].id;
    }

    await db
      .update(qurbanPackages)
      .set({
        slotsFilled: sql`${qurbanPackages.slotsFilled} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(qurbanPackages.id, body.packageId));
  } else {
    await db
      .update(qurbanPackages)
      .set({
        stockSold: sql`${qurbanPackages.stockSold} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(qurbanPackages.id, body.packageId));
  }

  // Create order (already paid from savings)
  const newOrder = await db
    .insert(qurbanOrders)
    .values({
      id: createId(),
      orderNumber,
      userId: savings[0].userId,
      donorName: savings[0].donorName,
      donorEmail: savings[0].donorEmail,
      donorPhone: savings[0].donorPhone,
      packageId: body.packageId,
      sharedGroupId,
      quantity: 1,
      unitPrice: pkg[0].price,
      totalAmount: pkg[0].price,
      paymentMethod: "full",
      paidAmount: pkg[0].price, // Already paid from savings
      paymentStatus: "paid",
      onBehalfOf: body.onBehalfOf,
    })
    .returning();

  // Create conversion transaction
  const trxCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanSavingsTransactions);

  const transactionNumber = `TRX-SAV-QBN-${getCurrentYearWIB()}-${String(Number(trxCount[0].count) + 1).padStart(5, "0")}`;

  await db.insert(qurbanSavingsTransactions).values({
    id: createId(),
    transactionNumber,
    savingsId: id,
    amount: pkg[0].price,
    transactionType: "conversion",
    status: "verified",
  });

  // Update savings status
  await db
    .update(qurbanSavings)
    .set({
      status: "converted",
      convertedToOrderId: newOrder[0].id,
      convertedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(qurbanSavings.id, id));

  return c.json({
    data: newOrder[0],
    message: "Savings converted to order successfully",
  });
});

// POST /qurban/orders/:id/confirm-payment - Confirm payment method selection
const confirmPaymentSchema = z.object({
  paymentMethodId: z.string(),
});

app.post("/orders/:id/confirm-payment", zValidator("json", confirmPaymentSchema), async (c) => {
  const orderId = c.req.param("id");
  const { paymentMethodId } = c.req.valid("json");
  const db = c.get("db");

  // Verify qurban order exists
  const order = await db.query.qurbanOrders.findFirst({
    where: eq(qurbanOrders.id, orderId),
  });

  if (!order) {
    return error(c, "Qurban order not found", 404);
  }

  // Update qurban order status to pending (waiting for proof upload)
  const updateData: any = {
    paymentStatus: "pending", // Pending until proof uploaded
    updatedAt: new Date(),
  };

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

    if (!file) {
      return error(c, "No file provided", 400);
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
    const path = `/uploads/${finalFilename}`;

    // Get buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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

    // Store in global map for immediate access
    if (!global.uploadedFiles) {
      global.uploadedFiles = new Map();
    }
    global.uploadedFiles.set(finalFilename, buffer);

    // Save to media table with financial category
    await db
      .insert(media)
      .values({
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path,
        path: path,
        folder: "uploads",
        category: "financial", // Kategori finansial untuk bukti transfer
      });

    // Update qurban order status to processing (waiting for admin confirmation)
    const updateData: any = {
      paymentStatus: "processing",
      updatedAt: new Date(),
    };

    await db
      .update(qurbanOrders)
      .set(updateData)
      .where(eq(qurbanOrders.id, orderId));

    // Construct URL from path
    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";

    return success(c, {
      url: `${apiUrl}${path}`,
      filename: finalFilename,
    }, "Payment proof uploaded successfully");

  } catch (err) {
    console.error("Error uploading payment proof:", err);
    return error(c, "Failed to upload payment proof", 500);
  }
});

export default app;
