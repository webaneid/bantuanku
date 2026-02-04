import { Hono } from "hono";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  qurbanSavings,
  qurbanSavingsTransactions,
  qurbanPeriods,
  qurbanPackages,
  qurbanOrders,
  users,
  createId,
} from "@bantuanku/db";
import { requireAuth } from "../../middleware/auth";
import { extractPath } from "./media";
import { getCurrentYearWIB } from "../../utils/timezone";

const app = new Hono();

// Apply auth middleware to all routes
app.use("*", requireAuth);

// ============================================================
// SAVINGS CRUD
// ============================================================

// Get all savings
app.get("/", async (c) => {
  const db = c.get("db");
  const { status, period_id } = c.req.query();

  let query = db
    .select({
      id: qurbanSavings.id,
      savingsNumber: qurbanSavings.savingsNumber,
      userId: qurbanSavings.userId,
      donorName: qurbanSavings.donorName,
      donorPhone: qurbanSavings.donorPhone,
      donorEmail: qurbanSavings.donorEmail,
      targetPeriodId: qurbanSavings.targetPeriodId,
      targetPackageId: qurbanSavings.targetPackageId,
      targetAmount: qurbanSavings.targetAmount,
      currentAmount: qurbanSavings.currentAmount,
      installmentCount: qurbanSavings.installmentCount,
      installmentAmount: qurbanSavings.installmentAmount,
      installmentFrequency: qurbanSavings.installmentFrequency,
      installmentDay: qurbanSavings.installmentDay,
      status: qurbanSavings.status,
      startDate: qurbanSavings.startDate,
      convertedOrderId: qurbanSavings.convertedToOrderId,
      convertedAt: qurbanSavings.convertedAt,
      createdAt: qurbanSavings.createdAt,
      periodName: qurbanPeriods.name,
      packageName: qurbanPackages.name,
    })
    .from(qurbanSavings)
    .leftJoin(qurbanPeriods, eq(qurbanSavings.targetPeriodId, qurbanPeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanSavings.targetPackageId, qurbanPackages.id))
    .$dynamic();

  // Apply filters
  const conditions = [];
  if (status) {
    conditions.push(eq(qurbanSavings.status, status));
  }
  if (period_id) {
    conditions.push(eq(qurbanSavings.targetPeriodId, period_id));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const savings = await query.orderBy(desc(qurbanSavings.createdAt));

  return c.json({ data: savings });
});

// Get all pending deposits (for verification page) - MUST be before /:id route
app.get("/transactions/pending", async (c) => {
  const db = c.get("db");

  const pendingDeposits = await db
    .select({
      id: qurbanSavingsTransactions.id,
      transactionNumber: qurbanSavingsTransactions.transactionNumber,
      amount: qurbanSavingsTransactions.amount,
      transactionType: qurbanSavingsTransactions.transactionType,
      transactionDate: qurbanSavingsTransactions.transactionDate,
      paymentMethod: qurbanSavingsTransactions.paymentMethod,
      paymentChannel: qurbanSavingsTransactions.paymentChannel,
      paymentProof: qurbanSavingsTransactions.paymentProof,
      status: qurbanSavingsTransactions.status,
      notes: qurbanSavingsTransactions.notes,
      createdAt: qurbanSavingsTransactions.createdAt,
      // Savings info
      savingsId: qurbanSavings.id,
      savingsNumber: qurbanSavings.savingsNumber,
      donorName: qurbanSavings.donorName,
      donorPhone: qurbanSavings.donorPhone,
      currentAmount: qurbanSavings.currentAmount,
      targetAmount: qurbanSavings.targetAmount,
      // Period info
      periodName: qurbanPeriods.name,
    })
    .from(qurbanSavingsTransactions)
    .leftJoin(qurbanSavings, eq(qurbanSavingsTransactions.savingsId, qurbanSavings.id))
    .leftJoin(qurbanPeriods, eq(qurbanSavings.targetPeriodId, qurbanPeriods.id))
    .where(
      and(
        eq(qurbanSavingsTransactions.status, "pending"),
        eq(qurbanSavingsTransactions.transactionType, "deposit")
      )
    )
    .orderBy(desc(qurbanSavingsTransactions.createdAt));

  // Construct full URLs for payment proofs
  const apiUrl = c.env.API_URL || "http://localhost:50245";
  const deposits = pendingDeposits.map((tx) => ({
    id: tx.id,
    transactionNumber: tx.transactionNumber,
    amount: tx.amount,
    transactionType: tx.transactionType,
    transactionDate: tx.transactionDate,
    paymentMethod: tx.paymentMethod,
    paymentChannel: tx.paymentChannel,
    paymentProofUrl: tx.paymentProof ? `${apiUrl}${tx.paymentProof}` : null,
    status: tx.status,
    notes: tx.notes,
    createdAt: tx.createdAt,
    savingsId: tx.savingsId,
    savingsNumber: tx.savingsNumber,
    donorName: tx.donorName,
    donorPhone: tx.donorPhone,
    currentAmount: tx.currentAmount,
    targetAmount: tx.targetAmount,
    periodName: tx.periodName,
  }));

  return c.json({ data: deposits });
});

// Get single savings detail with transactions
app.get("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Get savings detail
  const savings = await db
    .select({
      id: qurbanSavings.id,
      savingsNumber: qurbanSavings.savingsNumber,
      userId: qurbanSavings.userId,
      donorName: qurbanSavings.donorName,
      donorPhone: qurbanSavings.donorPhone,
      donorEmail: qurbanSavings.donorEmail,
      targetPeriodId: qurbanSavings.targetPeriodId,
      targetPackageId: qurbanSavings.targetPackageId,
      targetAmount: qurbanSavings.targetAmount,
      currentAmount: qurbanSavings.currentAmount,
      installmentCount: qurbanSavings.installmentCount,
      installmentAmount: qurbanSavings.installmentAmount,
      installmentFrequency: qurbanSavings.installmentFrequency,
      installmentDay: qurbanSavings.installmentDay,
      status: qurbanSavings.status,
      startDate: qurbanSavings.startDate,
      convertedOrderId: qurbanSavings.convertedToOrderId,
      convertedAt: qurbanSavings.convertedAt,
      notes: qurbanSavings.notes,
      createdAt: qurbanSavings.createdAt,
      periodName: qurbanPeriods.name,
      packageName: qurbanPackages.name,
    })
    .from(qurbanSavings)
    .leftJoin(qurbanPeriods, eq(qurbanSavings.targetPeriodId, qurbanPeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanSavings.targetPackageId, qurbanPackages.id))
    .where(eq(qurbanSavings.id, id))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  // Get transactions
  const txs = await db
    .select({
      id: qurbanSavingsTransactions.id,
      savingsId: qurbanSavingsTransactions.savingsId,
      transactionNumber: qurbanSavingsTransactions.transactionNumber,
      amount: qurbanSavingsTransactions.amount,
      type: qurbanSavingsTransactions.transactionType,
      transactionDate: qurbanSavingsTransactions.transactionDate,
      paymentMethod: qurbanSavingsTransactions.paymentMethod,
      paymentChannel: qurbanSavingsTransactions.paymentChannel,
      paymentProof: qurbanSavingsTransactions.paymentProof,
      status: qurbanSavingsTransactions.status,
      verifiedAt: qurbanSavingsTransactions.verifiedAt,
      verifiedBy: qurbanSavingsTransactions.verifiedBy,
      notes: qurbanSavingsTransactions.notes,
      createdAt: qurbanSavingsTransactions.createdAt,
    })
    .from(qurbanSavingsTransactions)
    .where(eq(qurbanSavingsTransactions.savingsId, id))
    .orderBy(desc(qurbanSavingsTransactions.createdAt));

  // Construct full URLs for payment proofs
  const apiUrl = c.env.API_URL || "http://localhost:50245";
  const transactions = txs.map((tx) => ({
    id: tx.id,
    savingsId: tx.savingsId,
    transactionNumber: tx.transactionNumber,
    amount: tx.amount,
    type: tx.type,
    transactionDate: tx.transactionDate,
    paymentMethod: tx.paymentMethod,
    paymentChannel: tx.paymentChannel,
    paymentProofUrl: tx.paymentProof ? `${apiUrl}${tx.paymentProof}` : null,
    status: tx.status,
    verifiedAt: tx.verifiedAt,
    verifiedBy: tx.verifiedBy,
    notes: tx.notes,
    createdAt: tx.createdAt,
  }));

  return c.json({
    savings: savings[0],
    transactions,
  });
});

// Create savings
app.post("/", async (c) => {
  const db = c.get("db");

  try {
    const body = await c.req.json();
    console.log("Received savings creation request:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.donorName || !body.donorPhone) {
      console.error("Validation failed: Missing donorName or donorPhone");
      return c.json({ error: "Nama dan telepon donatur wajib diisi" }, 400);
    }
    if (!body.targetPeriodId) {
      console.error("Validation failed: Missing targetPeriodId");
      return c.json({ error: "Periode target wajib dipilih" }, 400);
    }
    if (!body.targetAmount || !body.installmentAmount) {
      console.error("Validation failed: Missing amounts");
      return c.json({ error: "Target amount dan installment amount wajib diisi" }, 400);
    }

    // Generate savings number
    const year = getCurrentYearWIB();
    const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();
    const savingsNumber = `SAV-QBN-${year}-${randomStr}`;

    const newSavings = await db
      .insert(qurbanSavings)
      .values({
        id: createId(),
        savingsNumber: savingsNumber,
        userId: body.userId || null,
        donorName: body.donorName,
        donorEmail: body.donorEmail || null,
        donorPhone: body.donorPhone,
        targetPeriodId: body.targetPeriodId,
        targetPackageId: body.targetPackageId || null,
        targetAmount: body.targetAmount,
        currentAmount: 0,
        installmentFrequency: body.installmentFrequency,
        installmentCount: body.installmentCount || 6,
        installmentAmount: body.installmentAmount,
        installmentDay: body.installmentDay || null,
        startDate: new Date(body.startDate),
        status: "active",
        notes: body.notes || null,
      })
      .returning();

    return c.json({
      data: newSavings[0],
      message: "Tabungan berhasil dibuat",
    });
  } catch (error: any) {
    console.error("Error creating savings:", error);
    return c.json({ error: error.message || "Gagal membuat tabungan" }, 500);
  }
});

// ============================================================
// TRANSACTIONS
// ============================================================

// Create deposit transaction (setor tabungan)
app.post("/:id/transactions", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.amount) {
      return c.json({ error: "Nominal setoran wajib diisi" }, 400);
    }

    // Check if savings exists
    const savings = await db
      .select()
      .from(qurbanSavings)
      .where(eq(qurbanSavings.id, id))
      .limit(1);

    if (savings.length === 0) {
      return c.json({ error: "Tabungan tidak ditemukan" }, 404);
    }

    if (savings[0].status !== "active") {
      return c.json({ error: "Tabungan tidak aktif" }, 400);
    }

    // Generate transaction number
    const year = getCurrentYearWIB();
    const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();
    const transactionNumber = `TRX-SAV-${year}-${randomStr}`;

    const newTransaction = await db
      .insert(qurbanSavingsTransactions)
      .values({
        id: createId(),
        transactionNumber: transactionNumber,
        savingsId: id,
        amount: body.amount,
        transactionType: "deposit",
        paymentMethod: body.paymentMethod || "bank_transfer",
        paymentChannel: body.paymentChannel || null,
        paymentProof: body.paymentProof ? extractPath(body.paymentProof) : null,
        status: "pending", // Needs admin verification
        notes: body.notes || null,
      })
      .returning();

    return c.json({
      data: newTransaction[0],
      message: "Setoran berhasil dicatat, menunggu verifikasi",
    });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return c.json({ error: error.message || "Gagal menambahkan setoran" }, 500);
  }
});

// Verify transaction
app.post("/:id/transactions/:txId/verify", async (c) => {
  const db = c.get("db");
  const { id, txId } = c.req.param();
  const user = c.get("user");

  // Get transaction
  const transaction = await db
    .select()
    .from(qurbanSavingsTransactions)
    .where(eq(qurbanSavingsTransactions.id, txId))
    .limit(1);

  if (transaction.length === 0) {
    return c.json({ error: "Transaksi tidak ditemukan" }, 404);
  }

  if (transaction[0].status === "verified") {
    return c.json({ error: "Transaksi sudah diverifikasi" }, 400);
  }

  // Update transaction status
  await db
    .update(qurbanSavingsTransactions)
    .set({
      status: "verified",
      verifiedBy: user.id,
      verifiedAt: new Date(),
    })
    .where(eq(qurbanSavingsTransactions.id, txId));

  // Update savings current_amount
  const savings = await db
    .select()
    .from(qurbanSavings)
    .where(eq(qurbanSavings.id, id))
    .limit(1);

  const newCurrentAmount = Number(savings[0].currentAmount) + Number(transaction[0].amount);
  const targetAmount = Number(savings[0].targetAmount);

  // Update savings
  const updateData: any = {
    currentAmount: newCurrentAmount,
    updatedAt: new Date(),
  };

  // If reached target, mark as completed
  if (newCurrentAmount >= targetAmount) {
    updateData.status = "completed";
  }

  await db
    .update(qurbanSavings)
    .set(updateData)
    .where(eq(qurbanSavings.id, id));

  return c.json({
    message: "Setoran berhasil diverifikasi",
    newCurrentAmount,
    isCompleted: newCurrentAmount >= targetAmount,
  });
});

// Reject transaction
app.post("/:id/transactions/:txId/reject", async (c) => {
  const db = c.get("db");
  const { txId } = c.req.param();
  const user = c.get("user");
  const body = await c.req.json();

  await db
    .update(qurbanSavingsTransactions)
    .set({
      status: "rejected",
      verifiedBy: user.id,
      verifiedAt: new Date(),
      notes: body.notes || null,
    })
    .where(eq(qurbanSavingsTransactions.id, txId));

  return c.json({ message: "Setoran ditolak" });
});

// ============================================================
// CONVERSION TO ORDER
// ============================================================

// Convert savings to order
app.post("/:id/convert", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();
  const body = await c.req.json();

  // Get savings
  const savings = await db
    .select()
    .from(qurbanSavings)
    .where(eq(qurbanSavings.id, id))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Tabungan tidak ditemukan" }, 404);
  }

  if (savings[0].status !== "completed") {
    return c.json({ error: "Tabungan belum selesai/mencapai target" }, 400);
  }

  if (savings[0].convertedToOrderId) {
    return c.json({ error: "Tabungan sudah dikonversi ke order" }, 400);
  }

  // Get package details
  const packageId = body.packageId || savings[0].targetPackageId;
  if (!packageId) {
    return c.json({ error: "Package ID diperlukan" }, 400);
  }

  const pkg = await db
    .select()
    .from(qurbanPackages)
    .where(eq(qurbanPackages.id, packageId))
    .limit(1);

  if (pkg.length === 0) {
    return c.json({ error: "Package tidak ditemukan" }, 404);
  }

  // Generate order number
  const year = new Date().getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
  const orderNumber = `ORD-QBN-${year}-${randomStr}`;

  // Create order
  const newOrder = await db
    .insert(qurbanOrders)
    .values({
      id: createId(),
      orderNumber: orderNumber,
      userId: savings[0].userId,
      donorName: savings[0].donorName,
      donorEmail: savings[0].donorEmail,
      donorPhone: savings[0].donorPhone,
      packageId: packageId,
      quantity: body.quantity || 1,
      unitPrice: pkg[0].price,
      totalAmount: pkg[0].price * (body.quantity || 1),
      paymentMethod: "full",
      paidAmount: Number(savings[0].currentAmount),
      paymentStatus: "paid", // Already paid via savings
      orderStatus: "pending",
      onBehalfOf: body.onBehalfOf || savings[0].donorName,
      notes: `Konversi dari tabungan ${savings[0].savingsNumber}`,
    })
    .returning();

  // Update savings
  await db
    .update(qurbanSavings)
    .set({
      status: "converted",
      convertedToOrderId: newOrder[0].id,
      convertedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(qurbanSavings.id, id));

  // Create conversion transaction record
  const conversionTxNumber = `TRX-SAV-${year}-CONV-${randomStr}`;
  await db.insert(qurbanSavingsTransactions).values({
    id: createId(),
    transactionNumber: conversionTxNumber,
    savingsId: id,
    amount: Number(savings[0].currentAmount),
    transactionType: "conversion",
    status: "verified",
    verifiedBy: c.get("user").id,
    verifiedAt: new Date(),
    notes: `Konversi ke order ${orderNumber}`,
  });

  return c.json({
    message: "Tabungan berhasil dikonversi ke order",
    order: newOrder[0],
  });
});

export default app;
