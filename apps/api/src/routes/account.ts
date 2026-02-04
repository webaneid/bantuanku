import { Hono } from "hono";
import { eq, desc, sql, or } from "drizzle-orm";
import { donations, invoices, zakatCalculationLogs, notifications, users, qurbanOrders, qurbanPackages, zakatDonations, zakatTypes } from "@bantuanku/db";
import { success, error, paginated } from "../lib/response";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const account = new Hono<{ Bindings: Env; Variables: Variables }>();

account.use("*", authMiddleware);

account.get("/donations", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const offset = (page - 1) * limit;

  // Get user details for email/phone matching
  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

  // Normalize phone for matching
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

  // Build conditions: userId OR email match OR phone match
  const conditions = [eq(donations.userId, user!.id)];

  if (userDetails.email) {
    conditions.push(eq(donations.donorEmail, userDetails.email.toLowerCase().trim()));
  }

  const normalizedPhone = normalizePhone(userDetails.phone);
  const normalizedWhatsapp = normalizePhone(userDetails.whatsappNumber);

  if (normalizedPhone) {
    conditions.push(eq(donations.donorPhone, normalizedPhone));
  }
  if (normalizedWhatsapp && normalizedWhatsapp !== normalizedPhone) {
    conditions.push(eq(donations.donorPhone, normalizedWhatsapp));
  }

  const whereClause = or(...conditions);

  // Build qurban conditions
  const qurbanConditions = [eq(qurbanOrders.userId, user!.id)];
  if (userDetails.email) {
    qurbanConditions.push(eq(qurbanOrders.donorEmail, userDetails.email.toLowerCase().trim()));
  }
  if (normalizedPhone) {
    qurbanConditions.push(eq(qurbanOrders.donorPhone, normalizedPhone));
  }
  if (normalizedWhatsapp && normalizedWhatsapp !== normalizedPhone) {
    qurbanConditions.push(eq(qurbanOrders.donorPhone, normalizedWhatsapp));
  }
  const qurbanWhereClause = or(...qurbanConditions);

  // Build zakat conditions
  const zakatConditions = [];
  if (userDetails.email) {
    zakatConditions.push(eq(zakatDonations.donorEmail, userDetails.email.toLowerCase().trim()));
  }
  if (normalizedPhone) {
    zakatConditions.push(eq(zakatDonations.donorPhone, normalizedPhone));
  }
  if (normalizedWhatsapp && normalizedWhatsapp !== normalizedPhone) {
    zakatConditions.push(eq(zakatDonations.donorPhone, normalizedWhatsapp));
  }
  const zakatWhereClause = zakatConditions.length > 0 ? or(...zakatConditions) : undefined;

  // Fetch donations, qurban orders, and zakat donations
  const [donationsData, qurbanData, zakatData, donationsCount, qurbanCount, zakatCount] = await Promise.all([
    db.query.donations.findMany({
      where: whereClause,
      orderBy: [desc(donations.createdAt)],
      columns: {
        id: true,
        referenceId: true,
        campaignId: true,
        amount: true,
        totalAmount: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
      },
      with: {
        campaign: {
          columns: {
            id: true,
            title: true,
            pillar: true,
            categoryId: true,
          },
          with: {
            category: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    db
      .select({
        id: qurbanOrders.id,
        orderNumber: qurbanOrders.orderNumber,
        totalAmount: qurbanOrders.totalAmount,
        paymentStatus: qurbanOrders.paymentStatus,
        createdAt: qurbanOrders.createdAt,
        packageId: qurbanOrders.packageId,
      })
      .from(qurbanOrders)
      .where(qurbanWhereClause)
      .orderBy(desc(qurbanOrders.createdAt)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(whereClause),
    db
      .select({ count: sql<number>`count(*)` })
      .from(qurbanOrders)
      .where(qurbanWhereClause),
    zakatWhereClause
      ? db
          .select({
            id: zakatDonations.id,
            referenceId: zakatDonations.referenceId,
            zakatTypeId: zakatDonations.zakatTypeId,
            amount: zakatDonations.amount,
            paymentStatus: zakatDonations.paymentStatus,
            paidAt: zakatDonations.paidAt,
            createdAt: zakatDonations.createdAt,
          })
          .from(zakatDonations)
          .where(zakatWhereClause)
          .orderBy(desc(zakatDonations.createdAt))
      : Promise.resolve([]),
    zakatWhereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(zakatDonations)
          .where(zakatWhereClause)
      : Promise.resolve([{ count: 0 }]),
  ]);

  // Transform qurban orders to match donations format
  const qurbanTransformed = qurbanData.map((order: any) => ({
    id: order.id,
    referenceId: order.orderNumber,
    campaignId: null,
    amount: order.totalAmount,
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    paidAt: order.paymentStatus === "paid" ? order.createdAt : null,
    createdAt: order.createdAt,
    campaign: {
      id: null,
      title: "Qurban",
      pillar: "qurban",
      categoryId: null,
      category: {
        id: null,
        name: "Qurban",
        slug: "qurban",
      },
    },
    type: "qurban",
  }));

  // Fetch zakat types for name mapping
  const zakatTypesData = zakatData.length > 0
    ? await db.query.zakatTypes.findMany()
    : [];
  const zakatTypeMap = new Map(zakatTypesData.map((type: any) => [type.id, type.name]));

  // Transform zakat donations to match donations format
  const zakatTransformed = zakatData.map((zakat: any) => ({
    id: zakat.id,
    referenceId: zakat.referenceId,
    campaignId: null,
    amount: zakat.amount,
    totalAmount: zakat.amount,
    paymentStatus: zakat.paymentStatus,
    paidAt: zakat.paidAt,
    createdAt: zakat.createdAt,
    campaign: {
      id: null,
      title: zakatTypeMap.get(zakat.zakatTypeId) || "Zakat",
      pillar: "zakat",
      categoryId: null,
      category: {
        id: null,
        name: "Zakat",
        slug: "zakat",
      },
    },
    type: "zakat",
  }));

  // Add type to donations
  const donationsWithType = donationsData.map((d: any) => ({
    ...d,
    type: "donation",
  }));

  // Combine and sort by createdAt
  const combined = [...donationsWithType, ...qurbanTransformed, ...zakatTransformed].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Apply pagination to combined results
  const paginatedData = combined.slice(offset, offset + limit);
  const totalCount = Number(donationsCount[0]?.count || 0) + Number(qurbanCount[0]?.count || 0) + Number(zakatCount[0]?.count || 0);

  return paginated(c, paginatedData, {
    page,
    limit,
    total: totalCount,
  });
});

account.get("/donations/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const idOrRef = c.req.param("id");

  // Get user details for ownership check
  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

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

  // Try to find in donations table (campaign donations)
  let donation =
    (await db.query.donations.findFirst({
      where: eq(donations.id, idOrRef),
      with: {
        campaign: {
          columns: { id: true, title: true, pillar: true, categoryId: true },
          with: {
            category: { columns: { id: true, name: true, slug: true } },
          },
        },
      },
    })) ||
    (await db.query.donations.findFirst({
      where: eq(donations.referenceId, idOrRef),
      with: {
        campaign: {
          columns: { id: true, title: true, pillar: true, categoryId: true },
          with: {
            category: { columns: { id: true, name: true, slug: true } },
          },
        },
      },
    }));

  if (donation) {
    // Check ownership
    const isOwner =
      (donation.userId ? donation.userId === user!.id : true) ||
      donation.donorEmail?.toLowerCase().trim() === userDetails.email?.toLowerCase().trim() ||
      (donation.donorPhone && normalizePhone(donation.donorPhone) === normalizePhone(userDetails.phone)) ||
      (donation.donorPhone && normalizePhone(donation.donorPhone) === normalizePhone(userDetails.whatsappNumber));

    if (!isOwner) {
      return error(c, "Donation not found", 404);
    }

    // Get payment proof
    const { donationEvidences } = await import("@bantuanku/db");
    const evidence = await db.query.donationEvidences.findFirst({
      where: eq(donationEvidences.donationId, donation.id),
    });

    let paymentProofUrl = null;
    if (evidence?.fileUrl) {
      const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
      paymentProofUrl = evidence.fileUrl.startsWith("http") ? evidence.fileUrl : `${apiUrl}${evidence.fileUrl}`;
    }

    return success(c, { ...donation, type: "donation", paymentProofUrl });
  }

  // Try to find in zakat_donations table
  let zakatDonation =
    (await db.query.zakatDonations.findFirst({
      where: eq(zakatDonations.id, idOrRef),
    })) ||
    (await db.query.zakatDonations.findFirst({
      where: eq(zakatDonations.referenceId, idOrRef),
    }));

  if (zakatDonation) {
    // Check ownership
    const isOwner =
      zakatDonation.donorEmail?.toLowerCase().trim() === userDetails.email?.toLowerCase().trim() ||
      (zakatDonation.donorPhone && normalizePhone(zakatDonation.donorPhone) === normalizePhone(userDetails.phone)) ||
      (zakatDonation.donorPhone && normalizePhone(zakatDonation.donorPhone) === normalizePhone(userDetails.whatsappNumber));

    if (!isOwner) {
      return error(c, "Donation not found", 404);
    }

    // Get zakat type info
    const zakatType = await db.query.zakatTypes.findFirst({
      where: eq(zakatTypes.id, zakatDonation.zakatTypeId),
    });

    return success(c, {
      ...zakatDonation,
      type: "zakat",
      campaign: {
        id: null,
        title: zakatType?.name || "Zakat",
        pillar: "zakat",
        categoryId: null,
        category: {
          id: null,
          name: "Zakat",
          slug: "zakat",
        },
      },
    });
  }

  // Try to find in qurban_orders table
  let qurbanOrder =
    (await db.query.qurbanOrders.findFirst({
      where: eq(qurbanOrders.id, idOrRef),
      with: {
        package: true,
      },
    })) ||
    (await db
      .select()
      .from(qurbanOrders)
      .where(eq(qurbanOrders.orderNumber, idOrRef))
      .limit(1)
      .then((res) => res[0]));

  if (qurbanOrder) {
    // Check ownership
    const isOwner =
      qurbanOrder.userId === user!.id ||
      qurbanOrder.donorEmail?.toLowerCase().trim() === userDetails.email?.toLowerCase().trim() ||
      (qurbanOrder.donorPhone && normalizePhone(qurbanOrder.donorPhone) === normalizePhone(userDetails.phone)) ||
      (qurbanOrder.donorPhone && normalizePhone(qurbanOrder.donorPhone) === normalizePhone(userDetails.whatsappNumber));

    if (!isOwner) {
      return error(c, "Donation not found", 404);
    }

    return success(c, {
      ...qurbanOrder,
      type: "qurban",
      referenceId: qurbanOrder.orderNumber,
      amount: qurbanOrder.totalAmount,
      campaign: {
        id: null,
        title: "Qurban",
        pillar: "qurban",
        categoryId: null,
        category: {
          id: null,
          name: "Qurban",
          slug: "qurban",
        },
      },
    });
  }

  return error(c, "Donation not found", 404);
});

account.get("/donations/:id/invoice", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const idOrRef = c.req.param("id");

  const donation =
    (await db.query.donations.findFirst({
      where: eq(donations.id, idOrRef),
    })) ||
    (await db.query.donations.findFirst({
      where: eq(donations.referenceId, idOrRef),
    }));

  if (!donation) {
    return error(c, "Donation not found", 404);
  }

  // Check if user owns this donation (by userId OR by email/phone match)
  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

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

  const isOwner =
    donation.userId === user!.id ||
    donation.donorEmail?.toLowerCase().trim() === userDetails.email?.toLowerCase().trim() ||
    (donation.donorPhone && normalizePhone(donation.donorPhone) === normalizePhone(userDetails.phone)) ||
    (donation.donorPhone && normalizePhone(donation.donorPhone) === normalizePhone(userDetails.whatsappNumber));

  if (!isOwner) {
    return error(c, "Donation not found", 404);
  }

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.donationId, donation.id),
  });

  if (!invoice) {
    return error(c, "Invoice not found", 404);
  }

  return success(c, invoice);
});

account.get("/stats", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  // Get user details for email/phone matching
  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, user!.id),
  });

  if (!userDetails) {
    return error(c, "User not found", 404);
  }

  // Normalize phone for matching
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

  // Build conditions: userId OR email match OR phone match
  const conditions = [eq(donations.userId, user!.id)];

  if (userDetails.email) {
    conditions.push(eq(donations.donorEmail, userDetails.email.toLowerCase().trim()));
  }

  const normalizedPhone = normalizePhone(userDetails.phone);
  const normalizedWhatsapp = normalizePhone(userDetails.whatsappNumber);

  if (normalizedPhone) {
    conditions.push(eq(donations.donorPhone, normalizedPhone));
  }
  if (normalizedWhatsapp && normalizedWhatsapp !== normalizedPhone) {
    conditions.push(eq(donations.donorPhone, normalizedWhatsapp));
  }

  const whereClause = or(...conditions);

  // Build qurban conditions
  const qurbanConditions = [eq(qurbanOrders.userId, user!.id)];
  if (userDetails.email) {
    qurbanConditions.push(eq(qurbanOrders.donorEmail, userDetails.email.toLowerCase().trim()));
  }
  if (normalizedPhone) {
    qurbanConditions.push(eq(qurbanOrders.donorPhone, normalizedPhone));
  }
  if (normalizedWhatsapp && normalizedWhatsapp !== normalizedPhone) {
    qurbanConditions.push(eq(qurbanOrders.donorPhone, normalizedWhatsapp));
  }
  const qurbanWhereClause = or(...qurbanConditions);

  const [totalDonations, totalAmount, totalQurban, totalQurbanAmount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(whereClause),
    db
      .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(donations)
      .where(whereClause),
    db
      .select({ count: sql<number>`count(*)` })
      .from(qurbanOrders)
      .where(qurbanWhereClause),
    db
      .select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
      .from(qurbanOrders)
      .where(qurbanWhereClause),
  ]);

  return success(c, {
    totalDonations: Number(totalDonations[0]?.count || 0) + Number(totalQurban[0]?.count || 0),
    totalAmount: Number(totalAmount[0]?.sum || 0) + Number(totalQurbanAmount[0]?.sum || 0),
  });
});

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
