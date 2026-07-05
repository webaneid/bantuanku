import { Hono } from "hono";
import { eq, and, inArray, desc, count, sql } from "drizzle-orm";
import {
  transactions,
  settings,
  waBroadcastJobs,
  waBroadcastLogs,
  donatur,
  createId,
} from "@bantuanku/db";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { success, error, paginated } from "../../lib/response";
import { requireDeveloper, requireRole } from "../../middleware/auth";
import { WhatsAppService } from "../../services/whatsapp";
import { GOWAClient } from "../../services/whatsapp-gowa";
import type { Env, Variables } from "../../types";

// Helper to get frontend URL: env first, fallback to organization_website setting
const getFrontendUrl = async (db: any, env?: Env): Promise<string> => {
  if (env?.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/+$/, "");
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "organization_website"),
  });
  return (row?.value || "").replace(/\/+$/, "");
};

const whatsappAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /admin/whatsapp/send-reminder — kirim pengingat pembayaran manual
whatsappAdmin.post(
  "/send-reminder",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const wa = new WhatsAppService(db, c.env.FRONTEND_URL);

    // Query pending/partial transactions yang punya donorPhone
    const pendingTxs = await db
      .select({
        donorPhone: transactions.donorPhone,
        donorName: transactions.donorName,
        transactionNumber: transactions.transactionNumber,
        productName: transactions.productName,
        totalAmount: transactions.totalAmount,
        uniqueCode: transactions.uniqueCode,
        paidAmount: transactions.paidAmount,
        paymentMethodId: transactions.paymentMethodId,
        id: transactions.id,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.paymentStatus, ["pending", "partial"]),
        )
      );

    const eligible = pendingTxs.filter((tx) => tx.donorPhone);

    if (eligible.length === 0) {
      return success(c, { sent: 0, message: "Tidak ada transaksi pending yang memiliki nomor telepon" });
    }

    const frontendUrl = await getFrontendUrl(db, c.env);
    const recipients = eligible.map((tx) => {
      const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);
      const paidAmount = tx.paidAmount || 0;
      const remaining = transferAmount - paidAmount;
      return {
        phone: tx.donorPhone!,
        variables: {
          customer_name: tx.donorName,
          order_number: tx.transactionNumber,
          product_name: tx.productName,
          transfer_amount: wa.formatCurrency(transferAmount),
          paid_amount: wa.formatCurrency(paidAmount),
          remaining_amount: wa.formatCurrency(remaining),
          invoice_url: `${frontendUrl}/invoice/${tx.id}`,
        },
      };
    });

    wa.sendBulk(recipients, "wa_tpl_payment_reminder").catch(
      (err) => console.error("WA payment reminder bulk error:", err)
    );

    return success(c, { sent: recipients.length, message: `Mengirim pengingat ke ${recipients.length} donatur` });
  }
);

// POST /admin/whatsapp/send-savings-reminder — kirim pengingat cicilan (smart: hanya yang jatuh tempo & belum bayar)
whatsappAdmin.post(
  "/send-savings-reminder",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const { runSavingsReminders } = await import("../../services/savings-reminder");
    const result = await runSavingsReminders(db, c.env.FRONTEND_URL);
    return success(c, {
      ...result,
      message: result.sent > 0
        ? `Mengirim pengingat ke ${result.sent} penabung (${result.alreadyPaid} sudah bayar, ${result.skippedNoPhone} tanpa HP)`
        : result.dueToday === 0
          ? "Tidak ada tabungan yang jatuh tempo hari ini"
          : "Semua tabungan yang jatuh tempo sudah dibayar periode ini",
    });
  }
);

// POST /admin/whatsapp/test-connection — proxy test koneksi ke GOWA (bypass CORS)
whatsappAdmin.post(
  "/test-connection",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
    try {
      const config = await wa.getConfig();
      if (!config.apiUrl) {
        return error(c, "Gateway URL belum dikonfigurasi", 400);
      }
      const baseUrl = config.apiUrl.replace(/\/$/, "");
      const credentials = btoa(`${config.username}:${config.password}`);
      const headers: Record<string, string> = {
        Authorization: `Basic ${credentials}`,
      };
      if (config.deviceId) {
        headers["X-Device-Id"] = config.deviceId;
      }

      // Try /app/devices (older GOWA versions / SumoPod)
      const paths = ["/app/devices", "/devices"];
      let connected = false;
      let phoneNumber: string | undefined;
      let debugInfo: any = {};

      for (const path of paths) {
        const rawRes = await fetch(`${baseUrl}${path}`, { headers });
        if (rawRes.status === 404) continue;

        const rawBody = await rawRes.text();
        let parsed: any = null;
        try { parsed = JSON.parse(rawBody); } catch { /* not JSON */ }

        debugInfo = { url: `${baseUrl}${path}`, httpStatus: rawRes.status, response: parsed || rawBody };

        if (!parsed) continue;

        // Format: { code: "SUCCESS", results: { devices: [...] } }
        const devices = Array.isArray(parsed.results)
          ? parsed.results
          : Array.isArray(parsed.results?.devices)
            ? parsed.results.devices
            : [];

        if (devices.length > 0) {
          const device = config.deviceId
            ? devices.find((d: any) =>
                d.id === config.deviceId ||
                d.device_id === config.deviceId ||
                d.device === config.deviceId ||
                d.device?.replace("@s.whatsapp.net", "") === config.deviceId
              ) || devices[0]
            : devices[0];

          // Presence in results = connected (GOWA doesn't always have is_connected field)
          connected =
            device.is_connected === true ||
            device.state === "connected" ||
            device.status === "connected" ||
            !!device.device || !!device.name;
          phoneNumber =
            device.phone_number ||
            device.device?.replace("@s.whatsapp.net", "") ||
            device.jid?.replace("@s.whatsapp.net", "");
          break;
        }
      }

      return success(c, { connected, phoneNumber, debug: debugInfo });
    } catch (err: any) {
      return success(c, { connected: false, error: err.message });
    }
  }
);

// POST /admin/whatsapp/test-send — proxy kirim pesan test via GOWA (bypass CORS)
whatsappAdmin.post(
  "/test-send",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
    try {
      const body = await c.req.json();
      const { phone, message } = body;
      if (!phone || !message) {
        return error(c, "Phone dan message wajib diisi", 400);
      }
      const config = await wa.getConfig();
      if (!config.apiUrl) {
        return error(c, "Gateway URL belum dikonfigurasi", 400);
      }
      const client = new GOWAClient({
        apiUrl: config.apiUrl,
        username: config.username,
        password: config.password,
        deviceId: config.deviceId,
        messageDelay: config.messageDelay,
      });
      const sent = await client.sendText(phone, message);
      if (sent) {
        return success(c, { sent: true });
      } else {
        return error(c, "Gagal mengirim pesan, cek koneksi GOWA", 500);
      }
    } catch (err: any) {
      return error(c, err.message || "Gagal mengirim pesan", 500);
    }
  }
);

// GET /admin/whatsapp/bot-logs — riwayat percakapan bot AI (read-only)
whatsappAdmin.get(
  "/bot-logs",
  requireRole("super_admin"),
  requireDeveloper,
  async (c) => {
    try {
      const { getConversationLogs } = await import("../../services/whatsapp-ai");
      const logs = getConversationLogs();
      return success(c, logs);
    } catch {
      return success(c, []);
    }
  }
);

// ─── Template Preview ─────────────────────────────────────────────────────────

// GET /admin/whatsapp/templates/:key — ambil isi template dari settings (untuk preview)
// Key must match wa_tpl_* prefix — prevents exposing non-template settings like passwords
whatsappAdmin.get(
  "/templates/:key",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const key = c.req.param("key");

    if (!/^wa_tpl_[a-z0-9_]+$/.test(key)) {
      return error(c, "Template key tidak valid", 400);
    }

    const [enabledRow, contentRow] = await Promise.all([
      db.query.settings.findFirst({ where: eq(settings.key, `${key}_enabled`) }),
      db.query.settings.findFirst({ where: eq(settings.key, key) }),
    ]);

    return success(c, {
      key,
      content: contentRow?.value || null,
      enabled: enabledRow?.value === "true",
    });
  }
);

// GET /admin/whatsapp/broadcasts/estimate — hitung estimasi penerima
// Query: ?audienceScope=all|campaign_donors|inactive_62d&referenceId=...&batchSize=50&batchIntervalMinutes=60
whatsappAdmin.get(
  "/broadcasts/estimate",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const audienceScope = c.req.query("audienceScope") || "all";
    const referenceId = c.req.query("referenceId") || null;
    const batchSize = parseInt(c.req.query("batchSize") || "50");
    const batchIntervalMinutes = parseInt(c.req.query("batchIntervalMinutes") || "60");

    let recipientCount = 0;

    if (audienceScope === "all") {
      const result = await db
        .select({ value: count() })
        .from(donatur)
        .where(
          and(
            eq(donatur.isActive, true),
            eq(donatur.waOptOut, false),
            sql`COALESCE(${donatur.whatsappNumber}, ${donatur.phone}) IS NOT NULL`
          )
        );
      recipientCount = result[0]?.value ?? 0;
    } else if (audienceScope === "campaign_donors" && referenceId) {
      const result = await db
        .select({ value: count() })
        .from(donatur)
        .innerJoin(transactions, eq(transactions.donaturId, donatur.id))
        .where(
          and(
            eq(donatur.isActive, true),
            eq(donatur.waOptOut, false),
            sql`COALESCE(${donatur.whatsappNumber}, ${donatur.phone}) IS NOT NULL`,
            eq(transactions.productId, referenceId),
            eq(transactions.productType, "campaign"),
            eq(transactions.paymentStatus, "paid")
          )
        );
      recipientCount = result[0]?.value ?? 0;
    } else if (audienceScope === "inactive_62d") {
      const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
      const result = await db
        .select({ value: count() })
        .from(donatur)
        .where(
          and(
            eq(donatur.isActive, true),
            eq(donatur.waOptOut, false),
            sql`COALESCE(${donatur.whatsappNumber}, ${donatur.phone}) IS NOT NULL`,
            sql`(SELECT MAX(${transactions.paidAt}) FROM transactions WHERE ${transactions.donaturId} = ${donatur.id} AND ${transactions.paymentStatus} = 'paid') < ${sixtyTwoDaysAgo}`
          )
        );
      recipientCount = result[0]?.value ?? 0;
    }

    const batches = batchSize > 0 ? Math.ceil(recipientCount / batchSize) : 0;
    const estimatedMinutes = batches * batchIntervalMinutes;
    const estimatedHours = Math.round(estimatedMinutes / 60 * 10) / 10;

    return success(c, { count: recipientCount, batches, estimatedHours });
  }
);

// ─── Broadcast Jobs CRUD ─────────────────────────────────────────────────────

const createBroadcastSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["campaign_new", "manual_content", "manual_free", "reengagement"]),
  templateKey: z.string().optional(),
  contentOverride: z.string().optional(),
  referenceId: z.string().optional(),
  referenceName: z.string().optional(),
  audienceScope: z.enum(["all", "campaign_donors", "inactive_62d"]).default("all"),
  batchSize: z.number().int().min(1).max(500).default(50),
  batchIntervalMinutes: z.number().int().min(1).max(1440).default(60),
  scheduledAt: z.string().datetime().optional(),
});

// GET /admin/whatsapp/broadcasts — list broadcast jobs
whatsappAdmin.get(
  "/broadcasts",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      db.query.waBroadcastJobs.findMany({
        orderBy: [desc(waBroadcastJobs.createdAt)],
        limit,
        offset,
      }),
      db.select({ value: count() }).from(waBroadcastJobs),
    ]);

    return paginated(c, jobs, { page, limit, total: total[0]?.value ?? 0 });
  }
);

// POST /admin/whatsapp/broadcasts — create & queue a broadcast job
whatsappAdmin.post(
  "/broadcasts",
  requireRole("super_admin", "admin_finance"),
  zValidator("json", createBroadcastSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const body = c.req.valid("json");

    if (body.type !== "manual_free" && !body.templateKey) {
      return error(c, "templateKey wajib untuk tipe bukan manual_free", 400);
    }
    if (body.type === "manual_free" && !body.contentOverride) {
      return error(c, "contentOverride wajib untuk tipe manual_free", 400);
    }
    if (body.audienceScope === "campaign_donors" && !body.referenceId) {
      return error(c, "referenceId (campaign ID) wajib untuk audienceScope campaign_donors", 400);
    }

    const now = new Date();
    const nextBatchAt = body.scheduledAt ? new Date(body.scheduledAt) : now;

    const job = await db
      .insert(waBroadcastJobs)
      .values({
        id: createId(),
        name: body.name,
        type: body.type,
        templateKey: body.templateKey ?? null,
        contentOverride: body.contentOverride ?? null,
        referenceId: body.referenceId ?? null,
        referenceName: body.referenceName ?? null,
        audienceScope: body.audienceScope,
        batchSize: body.batchSize,
        batchIntervalMinutes: body.batchIntervalMinutes,
        nextBatchAt,
        status: "pending",
        createdBy: user!.id,
        createdAt: now,
      })
      .returning();

    return success(c, job[0], "Broadcast berhasil dibuat", 201);
  }
);

// GET /admin/whatsapp/broadcasts/:id — detail job
whatsappAdmin.get(
  "/broadcasts/:id",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");

    const job = await db.query.waBroadcastJobs.findFirst({
      where: eq(waBroadcastJobs.id, id),
    });

    if (!job) return error(c, "Broadcast job tidak ditemukan", 404);
    return success(c, job);
  }
);

// GET /admin/whatsapp/broadcasts/:id/logs — log pengiriman per penerima
whatsappAdmin.get(
  "/broadcasts/:id/logs",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      db.query.waBroadcastLogs.findMany({
        where: eq(waBroadcastLogs.jobId, id),
        with: { donaturRef: { columns: { id: true, name: true } } },
        orderBy: [desc(waBroadcastLogs.sentAt)],
        limit,
        offset,
      }),
      db.select({ value: count() }).from(waBroadcastLogs).where(eq(waBroadcastLogs.jobId, id)),
    ]);

    return paginated(c, logs, { page, limit, total: total[0]?.value ?? 0 });
  }
);

// POST /admin/whatsapp/broadcasts/:id/cancel — batalkan job yang masih pending/processing
whatsappAdmin.post(
  "/broadcasts/:id/cancel",
  requireRole("super_admin", "admin_finance"),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");

    const job = await db.query.waBroadcastJobs.findFirst({
      where: eq(waBroadcastJobs.id, id),
    });

    if (!job) return error(c, "Broadcast job tidak ditemukan", 404);
    if (!["pending", "processing"].includes(job.status)) {
      return error(c, `Job tidak bisa dibatalkan (status: ${job.status})`, 400);
    }

    await db
      .update(waBroadcastJobs)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(eq(waBroadcastJobs.id, id));

    return success(c, { cancelled: true });
  }
);

export default whatsappAdmin;
