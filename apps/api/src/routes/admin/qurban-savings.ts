import { Hono } from "hono";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import {
  qurbanSavings,
  qurbanSavingsTransactions,
  qurbanSavingsConversions,
  qurbanPeriods,
  qurbanPackages,
  qurbanPackagePeriods,
  qurbanOrders,
  qurbanSharedGroups,
  transactions,
  transactionPayments,
  createId,
} from "@bantuanku/db";
import { requireAuth, requireRole } from "../../middleware/auth";
import { extractPath } from "./media";
import { getCurrentYearWIB } from "../../utils/timezone";
import { WhatsAppService } from "../../services/whatsapp";
import { TransactionService } from "../../services/transaction";

const app = new Hono();

// Apply auth middleware to all routes
app.use("*", requireAuth);

const deriveSavingsStatus = (currentAmount: number, targetAmount: number, existingStatus: string) => {
  if (existingStatus === "cancelled" || existingStatus === "converted") return existingStatus;
  if (currentAmount >= targetAmount) return "completed";
  return "active";
};

const resolveTargetPackagePeriodId = async (db: any, savings: any) => {
  if (savings.targetPackagePeriodId) return savings.targetPackagePeriodId as string;
  if (!savings.targetPackageId || !savings.targetPeriodId) return null;

  const packagePeriod = await db.query.qurbanPackagePeriods.findFirst({
    where: and(
      eq(qurbanPackagePeriods.packageId, savings.targetPackageId),
      eq(qurbanPackagePeriods.periodId, savings.targetPeriodId)
    ),
  });

  return packagePeriod?.id || null;
};

const generateConversionTxNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = Date.now().toString().slice(-6);
  return `TRX-SAV-CONV-${y}${m}${d}-${suffix}`;
};

const getUniversalSavingsTransactions = async (
  db: any,
  options: { savingsId?: string; paymentStatus?: "pending" | "verified" | "rejected" }
) => {
  const txWhere: any[] = [
    eq(transactions.category, "qurban_savings"),
    eq(transactions.productType, "qurban"),
  ];

  if (options.savingsId) {
    txWhere.push(sql`${transactions.typeSpecificData} ->> 'savings_id' = ${options.savingsId}`);
  }

  const txRows = await db.query.transactions.findMany({
    where: and(...txWhere),
    with: {
      payments: true,
    },
    orderBy: [desc(transactions.createdAt)],
  });

  const normalized = txRows.flatMap((tx: any) => {
    const savingsId = tx.typeSpecificData?.savings_id;
    if (!savingsId) return [];

    const payments = Array.isArray(tx.payments) ? tx.payments : [];
    const mapped = payments.map((payment: any) => ({
      source: "universal" as const,
      id: payment.id,
      transactionId: tx.id,
      savingsId,
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

    if (options.paymentStatus) {
      return mapped.filter((item: any) => item.status === options.paymentStatus);
    }
    return mapped;
  });

  return normalized;
};

const syncSavingsBalance = async (db: any, savingsId: string) => {
  const savings = await db.query.qurbanSavings.findFirst({
    where: eq(qurbanSavings.id, savingsId),
  });

  if (!savings) return null;

  const legacyVerifiedResult = await db.execute(sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN qst.transaction_type = 'withdrawal' THEN -qst.amount
        ELSE qst.amount
      END
    ), 0)::numeric AS total
    FROM qurban_savings_transactions qst
    WHERE qst.savings_id = ${savingsId}
      AND qst.status = 'verified'
      AND NOT EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.category = 'qurban_savings'
          AND t.product_type = 'qurban'
          AND t.type_specific_data ->> 'legacy_savings_transaction_id' = qst.id
      )
  `);

  const legacyVerified = Number((legacyVerifiedResult as any).rows?.[0]?.total || 0);

  const [universalAgg] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.category, "qurban_savings"),
        eq(transactions.productType, "qurban"),
        eq(transactions.paymentStatus, "paid"),
        sql`${transactions.typeSpecificData} ->> 'savings_id' = ${savingsId}`
      )
    );

  const universalVerified = Number(universalAgg?.total || 0);
  const recalculatedCurrentAmount = Math.max(0, legacyVerified + universalVerified);
  const nextStatus = deriveSavingsStatus(
    recalculatedCurrentAmount,
    Number(savings.targetAmount || 0),
    savings.status
  );

  await db
    .update(qurbanSavings)
    .set({
      currentAmount: recalculatedCurrentAmount,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(qurbanSavings.id, savingsId));

  return {
    currentAmount: recalculatedCurrentAmount,
    status: nextStatus,
  };
};

const getMitraOwnedQurbanScope = async (db: any, userId: string) => {
  const ownPackages = await db
    .select({ id: qurbanPackages.id })
    .from(qurbanPackages)
    .where(eq(qurbanPackages.createdBy, userId));

  const packageIds = ownPackages.map((pkg: any) => pkg.id);

  if (packageIds.length === 0) {
    return { packageIds: [] as string[], packagePeriodIds: [] as string[] };
  }

  const ownPackagePeriods = await db
    .select({ id: qurbanPackagePeriods.id })
    .from(qurbanPackagePeriods)
    .where(inArray(qurbanPackagePeriods.packageId, packageIds));

  return {
    packageIds,
    packagePeriodIds: ownPackagePeriods.map((pp: any) => pp.id),
  };
};

// ============================================================
// SAVINGS CRUD
// ============================================================

// Get all savings
app.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { status, period_id } = c.req.query();
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

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
  if (isMitra && user) {
    const scope = await getMitraOwnedQurbanScope(db, user.id);
    const ownConditions: any[] = [];
    if (scope.packageIds.length > 0) {
      ownConditions.push(inArray(qurbanSavings.targetPackageId, scope.packageIds));
    }
    if (scope.packagePeriodIds.length > 0) {
      ownConditions.push(inArray(qurbanSavings.targetPackagePeriodId, scope.packagePeriodIds));
    }
    if (ownConditions.length === 0) {
      return c.json({ data: [] });
    }
    conditions.push(or(...ownConditions));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const savings = await query.orderBy(desc(qurbanSavings.createdAt));

  return c.json({ data: savings });
});

// Get all pending deposits (for verification page) - MUST be before /:id route
app.get(
  "/transactions/pending",
  requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee"),
  async (c) => {
  const db = c.get("db");
  // NOTE: Pending deposits now use universal transactions only.
  // Legacy qurban_savings_transactions is no longer used for this endpoint.
  const pendingLegacyDeposits: any[] = [];

  const pendingUniversal = await getUniversalSavingsTransactions(db, { paymentStatus: "pending" });
  const pendingUniversalSavingsIds = Array.from(new Set(pendingUniversal.map((tx) => tx.savingsId)));

  let savingsRows: any[] = [];
  if (pendingUniversalSavingsIds.length > 0) {
    savingsRows = await db
      .select({
        id: qurbanSavings.id,
        savingsNumber: qurbanSavings.savingsNumber,
        donorName: qurbanSavings.donorName,
        donorPhone: qurbanSavings.donorPhone,
        currentAmount: qurbanSavings.currentAmount,
        targetAmount: qurbanSavings.targetAmount,
        periodName: qurbanPeriods.name,
      })
      .from(qurbanSavings)
      .leftJoin(qurbanPeriods, eq(qurbanSavings.targetPeriodId, qurbanPeriods.id))
      .where(inArray(qurbanSavings.id, pendingUniversalSavingsIds));
  }

  const savingsMap = new Map(savingsRows.map((row: any) => [row.id, row]));
  const universalRows = pendingUniversal.map((tx) => {
    const savings = savingsMap.get(tx.savingsId);
    return {
      id: tx.id,
      transactionNumber: tx.transactionNumber,
      amount: tx.amount,
      transactionType: tx.transactionType,
      transactionDate: tx.transactionDate,
      paymentMethod: tx.paymentMethod,
      paymentChannel: tx.paymentChannel,
      paymentProof: tx.paymentProof,
      status: tx.status,
      notes: tx.notes,
      createdAt: tx.createdAt,
      savingsId: tx.savingsId,
      savingsNumber: savings?.savingsNumber || "-",
      donorName: savings?.donorName || "-",
      donorPhone: savings?.donorPhone || "-",
      currentAmount: Number(savings?.currentAmount || 0),
      targetAmount: Number(savings?.targetAmount || 0),
      periodName: savings?.periodName || "-",
    };
  });

  const pendingDeposits = [...pendingLegacyDeposits, ...universalRows].sort((a: any, b: any) => {
    const aTime = new Date(a.createdAt || a.transactionDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.transactionDate || 0).getTime();
    return bTime - aTime;
  });

  // Construct full URLs for payment proofs
  const apiUrl = c.env.API_URL || "http://localhost:50245";
  const resolveProofUrl = (proof: string | null) => {
    if (!proof) return null;
    if (proof.startsWith("http://") || proof.startsWith("https://")) return proof;
    return `${apiUrl}${proof}`;
  };
  const deposits = pendingDeposits.map((tx) => ({
    id: tx.id,
    transactionNumber: tx.transactionNumber,
    amount: tx.amount,
    transactionType: tx.transactionType,
    transactionDate: tx.transactionDate,
    paymentMethod: tx.paymentMethod,
    paymentChannel: tx.paymentChannel,
    paymentProofUrl: resolveProofUrl(tx.paymentProof),
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
  const user = c.get("user");
  const { id } = c.req.param();
  const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");
  const conditions: any[] = [eq(qurbanSavings.id, id)];

  if (isMitra && user) {
    const scope = await getMitraOwnedQurbanScope(db, user.id);
    const ownConditions: any[] = [];
    if (scope.packageIds.length > 0) {
      ownConditions.push(inArray(qurbanSavings.targetPackageId, scope.packageIds));
    }
    if (scope.packagePeriodIds.length > 0) {
      ownConditions.push(inArray(qurbanSavings.targetPackagePeriodId, scope.packagePeriodIds));
    }
    if (ownConditions.length === 0) {
      return c.json({ error: "Savings not found" }, 404);
    }
    conditions.push(or(...ownConditions));
  }

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
      notes: qurbanSavings.notes,
      createdAt: qurbanSavings.createdAt,
      periodName: qurbanPeriods.name,
      packageName: qurbanPackages.name,
    })
    .from(qurbanSavings)
    .leftJoin(qurbanPeriods, eq(qurbanSavings.targetPeriodId, qurbanPeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanSavings.targetPackageId, qurbanPackages.id))
    .where(and(...conditions))
    .limit(1);

  if (savings.length === 0) {
    return c.json({ error: "Savings not found" }, 404);
  }

  // Get legacy transactions
  const legacyTxs = await db
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

  const universalTxs = await getUniversalSavingsTransactions(db, { savingsId: id });

  // Construct full URLs for payment proofs
  const apiUrl = c.env.API_URL || "http://localhost:50245";
  const resolveProofUrl = (proof: string | null) => {
    if (!proof) return null;
    if (proof.startsWith("http://") || proof.startsWith("https://")) return proof;
    return `${apiUrl}${proof}`;
  };
  const legacyTransactions = legacyTxs.map((tx) => ({
    id: tx.id,
    savingsId: tx.savingsId,
    transactionNumber: tx.transactionNumber,
    amount: tx.amount,
    transactionType: tx.type,
    transactionDate: tx.transactionDate,
    paymentMethod: tx.paymentMethod,
    paymentChannel: tx.paymentChannel,
    paymentProofUrl: resolveProofUrl(tx.paymentProof),
    status: tx.status,
    verifiedAt: tx.verifiedAt,
    verifiedBy: tx.verifiedBy,
    notes: tx.notes,
    createdAt: tx.createdAt,
  }));

  const normalizedUniversal = universalTxs.map((tx) => ({
    id: tx.id,
    savingsId: tx.savingsId,
    transactionNumber: tx.transactionNumber,
    amount: tx.amount,
    transactionType: tx.transactionType,
    transactionDate: tx.transactionDate,
    paymentMethod: tx.paymentMethod,
    paymentChannel: tx.paymentChannel,
    paymentProofUrl: resolveProofUrl(tx.paymentProof),
    status: tx.status,
    verifiedAt: tx.verifiedAt,
    verifiedBy: tx.verifiedBy,
    notes: tx.notes,
    createdAt: tx.createdAt,
  }));

  const transactions = [...legacyTransactions, ...normalizedUniversal].sort((a: any, b: any) => {
    const aTime = new Date(a.createdAt || a.transactionDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.transactionDate || 0).getTime();
    return bTime - aTime;
  });

  return c.json({
    data: {
      savings: savings[0],
      transactions,
    },
    savings: savings[0],
    transactions,
  });
});

// Create savings
app.post("/", requireRole("super_admin", "admin_campaign"), async (c) => {
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

    // WhatsApp notification: tabungan qurban dibuat (async, non-blocking)
    if (body.donorPhone) {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      // Fetch period and package names
      const period = body.targetPeriodId ? await db.query.qurbanPeriods.findFirst({ where: eq(qurbanPeriods.id, body.targetPeriodId) }) : null;
      const pkg = body.targetPackageId ? await db.query.qurbanPackages.findFirst({ where: eq(qurbanPackages.id, body.targetPackageId) }) : null;
      const freqMap: Record<string, string> = { weekly: "Mingguan", biweekly: "2 Mingguan", monthly: "Bulanan" };

      wa.send({
        phone: body.donorPhone,
        templateKey: "wa_tpl_savings_created",
        variables: {
          customer_name: body.donorName,
          savings_number: newSavings[0].savingsNumber,
          qurban_package: pkg?.name || "",
          qurban_period: period?.name || "",
          savings_target: wa.formatCurrency(body.targetAmount),
          installment_amount: wa.formatCurrency(body.installmentAmount),
          installment_frequency: freqMap[body.installmentFrequency] || body.installmentFrequency || "",
          installment_count: String(body.installmentCount || 6),
        },
      }).catch((err) => console.error("WA savings-created notification error:", err));
    }

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
app.post("/:id/transactions", requireRole("super_admin", "admin_campaign"), async (c) => {
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

    const targetPackagePeriodId = await resolveTargetPackagePeriodId(db, savings[0]);
    if (!targetPackagePeriodId) {
      return c.json({ error: "Target package period tabungan belum valid" }, 400);
    }

    const txService = new TransactionService(db);
    const universalTx = await txService.create({
      product_type: "qurban",
      product_id: targetPackagePeriodId,
      quantity: 1,
      unit_price: Number(body.amount || 0),
      admin_fee: 0,
      donor_name: savings[0].donorName,
      donor_email: savings[0].donorEmail || undefined,
      donor_phone: savings[0].donorPhone || undefined,
      user_id: savings[0].userId || undefined,
      include_unique_code: false,
      payment_method_id: body.paymentMethod || body.paymentChannel || "bank_transfer",
      message: body.notes || undefined,
      type_specific_data: {
        payment_type: "savings",
        savings_id: id,
        savings_number: savings[0].savingsNumber,
        target_package_period_id: targetPackagePeriodId,
      },
    });

    const now = new Date();
    const paymentNumber = `PAY-SAV-QBN-${getCurrentYearWIB()}-${Date.now().toString().slice(-6)}`;
    const [newPayment] = await db
      .insert(transactionPayments)
      .values({
        id: createId(),
        paymentNumber,
        transactionId: universalTx.id,
        amount: Number(body.amount || 0),
        paymentDate: now,
        paymentMethod: body.paymentMethod || "bank_transfer",
        paymentChannel: body.paymentChannel || null,
        paymentProof: body.paymentProof ? extractPath(body.paymentProof) : null,
        status: "pending",
        notes: body.notes || null,
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning();

    await db
      .update(transactions)
      .set({
        paymentStatus: "processing",
        paidAmount: Number(body.amount || 0),
        updatedAt: now,
      })
      .where(eq(transactions.id, universalTx.id));

    return c.json({
      data: {
        id: newPayment.id,
        transactionId: universalTx.id,
        transactionNumber: newPayment.paymentNumber,
        amount: Number(newPayment.amount || 0),
        status: newPayment.status,
      },
      message: "Setoran berhasil dicatat, menunggu verifikasi",
    });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return c.json({ error: error.message || "Gagal menambahkan setoran" }, 500);
  }
});

// Verify transaction
app.post("/:id/transactions/:txId/verify", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id, txId } = c.req.param();
  const user = c.get("user");
  const now = new Date();

  // Legacy first
  const legacyTx = await db.query.qurbanSavingsTransactions.findFirst({
    where: eq(qurbanSavingsTransactions.id, txId),
  });

  let verifiedAmount = 0;
  let savings: any = null;
  let newCurrentAmount = 0;
  let isCompleted = false;

  if (legacyTx) {
    if (legacyTx.savingsId !== id) {
      return c.json({ error: "Transaksi tidak cocok dengan tabungan" }, 400);
    }
    if (legacyTx.status === "verified") {
      return c.json({ error: "Transaksi sudah diverifikasi" }, 400);
    }

    await db
      .update(qurbanSavingsTransactions)
      .set({
        status: "verified",
        verifiedBy: user.id,
        verifiedAt: now,
      })
      .where(eq(qurbanSavingsTransactions.id, txId));

    verifiedAmount = Number(legacyTx.amount || 0);
  } else {
    // Universal payment
    const payment = await db.query.transactionPayments.findFirst({
      where: eq(transactionPayments.id, txId),
      with: {
        transaction: true,
      },
    });

    if (!payment || !payment.transaction) {
      return c.json({ error: "Transaksi tidak ditemukan" }, 404);
    }

    const tx = payment.transaction as any;
    if (tx.category !== "qurban_savings" || tx.typeSpecificData?.savings_id !== id) {
      return c.json({ error: "Transaksi tidak cocok dengan tabungan" }, 400);
    }
    if (payment.status === "verified") {
      return c.json({ error: "Transaksi sudah diverifikasi" }, 400);
    }

    await db
      .update(transactionPayments)
      .set({
        status: "verified",
        verifiedBy: user.id,
        verifiedAt: now,
        updatedAt: now,
      })
      .where(eq(transactionPayments.id, txId));

    await db
      .update(transactions)
      .set({
        paymentStatus: "paid",
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(transactions.id, payment.transactionId));

    verifiedAmount = Number(payment.amount || tx.totalAmount || 0);
  }

  const syncResult = await syncSavingsBalance(db, id);
  savings = await db.query.qurbanSavings.findFirst({
    where: eq(qurbanSavings.id, id),
  });
  newCurrentAmount = Number(syncResult?.currentAmount || savings?.currentAmount || 0);
  isCompleted = (syncResult?.status || savings?.status) === "completed";
  const targetAmount = Number(savings?.targetAmount || 0);

  // WhatsApp notification: setoran tabungan diterima (async, non-blocking)
  if (savings?.donorPhone) {
    const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
    // Count verified deposits for installment_paid
    const [verifiedDepositsLegacyCount] = await db
      .select({
        count: sql<number>`COALESCE(COUNT(*), 0)`,
      })
      .from(qurbanSavingsTransactions)
      .where(
        and(
          eq(qurbanSavingsTransactions.savingsId, id),
          eq(qurbanSavingsTransactions.transactionType, "deposit"),
          eq(qurbanSavingsTransactions.status, "verified"),
          sql`NOT EXISTS (
            SELECT 1
            FROM transactions t
            WHERE t.category = 'qurban_savings'
              AND t.product_type = 'qurban'
              AND t.type_specific_data ->> 'legacy_savings_transaction_id' = ${qurbanSavingsTransactions.id}
          )`
        )
      );
    const [verifiedUniversalCount] = await db
      .select({
        count: sql<number>`COALESCE(COUNT(*), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.category, "qurban_savings"),
          eq(transactions.productType, "qurban"),
          eq(transactions.paymentStatus, "paid"),
          sql`${transactions.typeSpecificData} ->> 'savings_id' = ${id}`
        )
      );

    const totalVerifiedInstallments =
      Number(verifiedDepositsLegacyCount?.count || 0) + Number(verifiedUniversalCount?.count || 0);

    const pkg = savings?.targetPackageId ? await db.query.qurbanPackages.findFirst({ where: eq(qurbanPackages.id, savings.targetPackageId) }) : null;
    const progressPct = targetAmount > 0 ? Math.round((newCurrentAmount / targetAmount) * 100) : 0;

    try {
      await wa.send({
        phone: savings.donorPhone,
        templateKey: "wa_tpl_savings_deposit",
        variables: {
          customer_name: savings.donorName,
          savings_number: savings.savingsNumber,
          installment_paid: String(totalVerifiedInstallments),
          installment_count: String(savings.installmentCount || 0),
          paid_amount: wa.formatCurrency(verifiedAmount),
          savings_current: wa.formatCurrency(newCurrentAmount),
          savings_remaining: wa.formatCurrency(Math.max(0, targetAmount - newCurrentAmount)),
          savings_progress: `${progressPct}%`,
        },
      });
    } catch (err) {
      console.error("WA savings-deposit notification error:", err);
    }

    // If completed, also send completed notification
    if (newCurrentAmount >= targetAmount) {
      try {
        await wa.send({
          phone: savings.donorPhone,
          templateKey: "wa_tpl_savings_completed",
          variables: {
            customer_name: savings.donorName,
            savings_number: savings.savingsNumber,
            qurban_package: pkg?.name || "",
            savings_current: wa.formatCurrency(newCurrentAmount),
          },
        });
      } catch (err) {
        console.error("WA savings-completed notification error:", err);
      }
    }
  }

  return c.json({
    message: "Setoran berhasil diverifikasi",
    newCurrentAmount,
    isCompleted,
  });
});

// Reject transaction
app.post("/:id/transactions/:txId/reject", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const { id, txId } = c.req.param();
  const user = c.get("user");
  const body = await c.req.json();
  const now = new Date();

  const legacyTx = await db.query.qurbanSavingsTransactions.findFirst({
    where: eq(qurbanSavingsTransactions.id, txId),
  });

  if (legacyTx) {
    if (legacyTx.savingsId !== id) {
      return c.json({ error: "Transaksi tidak cocok dengan tabungan" }, 400);
    }
    await db
      .update(qurbanSavingsTransactions)
      .set({
        status: "rejected",
        verifiedBy: user.id,
        verifiedAt: now,
        notes: body.notes || null,
      })
      .where(eq(qurbanSavingsTransactions.id, txId));
  } else {
    const payment = await db.query.transactionPayments.findFirst({
      where: eq(transactionPayments.id, txId),
      with: {
        transaction: true,
      },
    });

    if (!payment || !payment.transaction) {
      return c.json({ error: "Transaksi tidak ditemukan" }, 404);
    }

    const tx = payment.transaction as any;
    if (tx.category !== "qurban_savings" || tx.typeSpecificData?.savings_id !== id) {
      return c.json({ error: "Transaksi tidak cocok dengan tabungan" }, 400);
    }

    await db
      .update(transactionPayments)
      .set({
        status: "rejected",
        rejectedBy: user.id,
        rejectedAt: now,
        rejectionReason: body.notes || null,
        notes: body.notes || null,
        updatedAt: now,
      })
      .where(eq(transactionPayments.id, txId));

    await db
      .update(transactions)
      .set({
        paymentStatus: "pending",
        paidAmount: 0,
        paidAt: null,
        updatedAt: now,
      })
      .where(eq(transactions.id, tx.id));
  }

  await syncSavingsBalance(db, id);

  // WhatsApp notification: setoran tabungan ditolak
  const savings = await db.query.qurbanSavings.findFirst({
    where: eq(qurbanSavings.id, id),
  });
  if (savings?.donorPhone) {
    try {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      const rejectedAmount = legacyTx
        ? Number(legacyTx.amount || 0)
        : Number((await db.query.transactionPayments.findFirst({ where: eq(transactionPayments.id, txId) }))?.amount || 0);
      await wa.send({
        phone: savings.donorPhone,
        templateKey: "wa_tpl_payment_rejected",
        variables: {
          customer_name: savings.donorName,
          order_number: savings.savingsNumber,
          product_name: `Setoran Tabungan Qurban (${savings.savingsNumber})`,
          total_amount: wa.formatCurrency(rejectedAmount),
          invoice_url: "",
          rejection_reason: body.notes || "Bukti pembayaran tidak valid atau tidak sesuai.",
        },
      });
    } catch (err) {
      console.error("[WA] savings-reject notification error:", err);
    }
  }

  return c.json({ message: "Setoran ditolak" });
});

// ============================================================
// CONVERSION TO ORDER
// ============================================================

// Convert savings to order with non-cash allocation log (Phase C)
app.post("/:id/convert", requireRole("super_admin", "admin_campaign"), async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  const savings = await db.query.qurbanSavings.findFirst({
    where: eq(qurbanSavings.id, id),
  });

  if (!savings) {
    return c.json({ error: "Tabungan tidak ditemukan" }, 404);
  }

  if (savings.status === "converted") {
    const existingConversion = await db.query.qurbanSavingsConversions.findFirst({
      where: eq(qurbanSavingsConversions.savingsId, id),
      orderBy: [desc(qurbanSavingsConversions.convertedAt)],
    });
    return c.json({
      message: "Tabungan sudah pernah dikonversi",
      order: existingConversion
        ? {
            id: existingConversion.orderId,
            orderNumber: existingConversion.orderNumber,
          }
        : null,
      conversion: existingConversion || null,
    });
  }

  if (savings.status !== "completed") {
    return c.json({ error: "Tabungan belum selesai, tidak bisa dikonversi" }, 400);
  }

  const targetPackagePeriodId =
    body.packagePeriodId ||
    (await resolveTargetPackagePeriodId(db, savings));

  if (!targetPackagePeriodId) {
    return c.json({ error: "Target package period tabungan belum valid" }, 400);
  }

  const pkgPeriod = await db.query.qurbanPackagePeriods.findFirst({
    where: eq(qurbanPackagePeriods.id, targetPackagePeriodId),
    with: {
      package: true,
    },
  });

  if (!pkgPeriod) {
    return c.json({ error: "Paket qurban tidak ditemukan" }, 404);
  }

  const packagePrice = Number(pkgPeriod.price || 0);
  if (Number(savings.currentAmount || 0) < packagePrice) {
    return c.json({ error: "Saldo tabungan belum cukup untuk konversi" }, 400);
  }

  const orderCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(qurbanOrders);

  const orderNumber = `QBN-${getCurrentYearWIB()}-${String(Number(orderCount[0]?.count || 0) + 1).padStart(5, "0")}`;
  const now = new Date();
  let sharedGroupId: string | null = null;

  if (pkgPeriod.package.packageType === "shared") {
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
      sharedGroupId = openGroup[0].id;
      const newSlotsFilled = openGroup[0].slotsFilled + 1;
      await db
        .update(qurbanSharedGroups)
        .set({
          slotsFilled: newSlotsFilled,
          status: newSlotsFilled >= openGroup[0].maxSlots ? "full" : "open",
          updatedAt: now,
        })
        .where(eq(qurbanSharedGroups.id, sharedGroupId));
    } else {
      const existingGroupsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(qurbanSharedGroups)
        .where(eq(qurbanSharedGroups.packagePeriodId, targetPackagePeriodId));

      const [newGroup] = await db
        .insert(qurbanSharedGroups)
        .values({
          id: createId(),
          packageId: pkgPeriod.packageId,
          packagePeriodId: targetPackagePeriodId,
          groupNumber: Number(existingGroupsCount[0]?.count || 0) + 1,
          maxSlots: pkgPeriod.package.maxSlots || 1,
          slotsFilled: 1,
          status: (pkgPeriod.package.maxSlots || 1) <= 1 ? "full" : "open",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      sharedGroupId = newGroup.id;
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

  const [newOrder] = await db
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
      adminFee: 0,
      totalAmount: packagePrice,
      paymentMethod: "savings_conversion",
      paidAmount: packagePrice,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      onBehalfOf: body.onBehalfOf || savings.donorName,
      orderDate: now,
      confirmedAt: now,
      notes: body.notes || "Konversi tabungan (non-cash)",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [allocationTx] = await db
    .insert(transactions)
    .values({
      id: createId(),
      transactionNumber: generateConversionTxNumber(),
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
        order_id: newOrder.id,
        order_number: newOrder.orderNumber,
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
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      orderTransactionId: allocationTx.id,
      notes: body.notes || null,
      convertedBy: user?.id || null,
      convertedAt: now,
      createdAt: now,
    })
    .returning();

  await db
    .update(qurbanSavings)
    .set({
      status: "converted",
      updatedAt: now,
    })
    .where(eq(qurbanSavings.id, savings.id));

  return c.json({
    message: "Tabungan berhasil dikonversi menjadi order (non-cash)",
    order: newOrder,
    conversion,
  });
});

export default app;
