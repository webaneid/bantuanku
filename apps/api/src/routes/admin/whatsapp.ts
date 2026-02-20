import { Hono } from "hono";
import { eq, and, inArray } from "drizzle-orm";
import {
  transactions,
  settings,
} from "@bantuanku/db";
import { success, error } from "../../lib/response";
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

export default whatsappAdmin;
