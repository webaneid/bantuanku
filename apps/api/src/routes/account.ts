import { Hono } from "hono";
import { eq, desc, sql, or, and } from "drizzle-orm";
import { zakatCalculationLogs, notifications, users, transactions, donatur } from "@bantuanku/db";
import { success, error, paginated } from "../lib/response";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const account = new Hono<{ Bindings: Env; Variables: Variables }>();

account.use("*", authMiddleware);

// Helper: Normalize phone number
const normalizePhone = (input: string | null | undefined): string | null => {
  if (!input) return null;
  let cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+62")) {
    cleaned = "0" + cleaned.substring(3);
  } else if (cleaned.startsWith("62") && cleaned.length > 10) {
    cleaned = "0" + cleaned.substring(2);
  }
  if (cleaned && !cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
};

// Get all transactions for current user
account.get("/donations", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

  // Build transactions conditions (match by userId, email, or phone)
  const transactionConditions = [];
  if (userDetails.id) {
    transactionConditions.push(eq(transactions.userId, userDetails.id));
  }
  if (userDetails.email) {
    transactionConditions.push(eq(transactions.donorEmail, userDetails.email.toLowerCase().trim()));
  }
  const normalizedPhone = normalizePhone(userDetails.phone);
  const normalizedWhatsapp = normalizePhone(userDetails.whatsappNumber);
  if (normalizedPhone) {
    transactionConditions.push(eq(transactions.donorPhone, normalizedPhone));
  }
  if (normalizedWhatsapp && normalizedWhatsapp !== normalizedPhone) {
    transactionConditions.push(eq(transactions.donorPhone, normalizedWhatsapp));
  }

  const whereClause = transactionConditions.length > 0 ? or(...transactionConditions) : undefined;

  const [data, countResult] = await Promise.all([
    whereClause
      ? db
          .select({
            id: transactions.id,
            transactionNumber: transactions.transactionNumber,
            productType: transactions.productType,
            productName: transactions.productName,
            totalAmount: transactions.totalAmount,
            paymentStatus: transactions.paymentStatus,
            paidAt: transactions.paidAt,
            createdAt: transactions.createdAt,
          })
          .from(transactions)
          .where(whereClause)
          .orderBy(desc(transactions.createdAt))
          .limit(limit)
          .offset(offset)
      : [],
    whereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(transactions)
          .where(whereClause)
      : [{ count: 0 }],
  ]);

  // Transform to match legacy format
  const transformed = data.map((txn: any) => ({
    id: txn.id,
    referenceId: txn.transactionNumber,
    amount: txn.totalAmount,
    totalAmount: txn.totalAmount,
    paymentStatus: txn.paymentStatus,
    paidAt: txn.paidAt,
    createdAt: txn.createdAt,
    type: txn.productType || "donation",
    campaign: {
      title: txn.productName || "Transaksi",
      pillar: txn.productType || "general",
    },
  }));

  return paginated(c, transformed, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

// Get transaction detail
account.get("/donations/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const idOrRef = c.req.param("id");

  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

  // Find transaction by ID or transaction number
  let transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, idOrRef),
  });

  if (!transaction) {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionNumber, idOrRef))
      .limit(1);
    transaction = result[0];
  }

  if (!transaction) {
    return error(c, "Transaction not found", 404);
  }

  // Check ownership
  const normalizedPhone = normalizePhone(userDetails.phone);
  const normalizedWhatsapp = normalizePhone(userDetails.whatsappNumber);

  const isOwner =
    transaction.userId === user!.id ||
    transaction.donorEmail?.toLowerCase().trim() === userDetails.email?.toLowerCase().trim() ||
    (transaction.donorPhone && normalizePhone(transaction.donorPhone) === normalizedPhone) ||
    (transaction.donorPhone && normalizePhone(transaction.donorPhone) === normalizedWhatsapp);

  if (!isOwner) {
    return error(c, "Transaction not found", 404);
  }

  return success(c, {
    ...transaction,
    type: transaction.productType || "donation",
    referenceId: transaction.transactionNumber,
    amount: transaction.totalAmount,
  });
});

// Get user stats
account.get("/stats", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

  const userEmail = userDetails.email?.toLowerCase().trim();
  if (!userEmail) {
    return success(c, {
      totalDonations: 0,
      totalAmount: 0,
      pendingDonations: 0,
    });
  }

  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.email, userEmail),
  });

  if (!donaturRecord) {
    return success(c, {
      totalDonations: 0,
      totalAmount: 0,
      pendingDonations: 0,
    });
  }

  const baseWhereClause = and(
    eq(transactions.donaturId, donaturRecord.id),
    sql<boolean>`coalesce((${transactions.typeSpecificData} ->> 'is_admin_fee_entry')::boolean, false) = false`
  );

  const paidWhereClause = and(baseWhereClause, eq(transactions.paymentStatus, "paid"));
  const pendingWhereClause = and(baseWhereClause, eq(transactions.paymentStatus, "pending"));

  const [paidTransactions, paidAmount, pendingTransactions] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(paidWhereClause),
    db
      .select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
      .from(transactions)
      .where(paidWhereClause),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(pendingWhereClause),
  ]);

  return success(c, {
    totalDonations: Number(paidTransactions[0]?.count || 0),
    totalAmount: Number(paidAmount[0]?.sum || 0),
    pendingDonations: Number(pendingTransactions[0]?.count || 0),
  });
});

// Zakat calculation history
account.get("/zakat-history", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "10");

  const logs = await db.query.zakatCalculationLogs.findMany({
    where: eq(zakatCalculationLogs.userId, user!.id),
    limit,
    orderBy: [desc(zakatCalculationLogs.createdAt)],
  });

  return success(c, logs);
});

// Notifications
account.get("/notifications", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const [data, countResult, unreadCount] = await Promise.all([
    db.query.notifications.findMany({
      where: eq(notifications.userId, user!.id),
      limit,
      offset,
      orderBy: [desc(notifications.createdAt)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, user!.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, user!.id)),
  ]);

  return c.json({
    success: true,
    data,
    unreadCount: Number(unreadCount[0]?.count || 0),
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.count || 0),
    },
  });
});

account.patch("/notifications/:id/read", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const notification = await db.query.notifications.findFirst({
    where: eq(notifications.id, id),
  });

  if (!notification || notification.userId !== user!.id) {
    return error(c, "Notification not found", 404);
  }

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));

  return success(c, null, "Notification marked as read");
});

account.post("/notifications/read-all", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.userId, user!.id));

  return success(c, null, "All notifications marked as read");
});

export default account;
