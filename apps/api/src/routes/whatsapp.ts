import { createHmac } from "crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { eq } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import { WhatsAppService } from "../services/whatsapp";
import { timingSafeEqualString } from "../lib/security";
import type { Env, Variables } from "../types";

const whatsappRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// Dedup: track processed message IDs to prevent double replies
const processedMessages = new Map<string, number>();
const DEDUP_TTL = 60_000; // 60 seconds
const DEDUP_MAX_ENTRIES = 5_000; // batas memori, jaga-jaga kalau webhook dibanjiri

function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Cleanup old entries
  for (const [id, ts] of processedMessages) {
    if (now - ts > DEDUP_TTL) processedMessages.delete(id);
  }
  if (processedMessages.has(messageId)) return true;
  // Map menjaga urutan insert — buang yang tertua kalau melebihi batas
  while (processedMessages.size >= DEDUP_MAX_ENTRIES) {
    const oldest = processedMessages.keys().next().value;
    if (oldest === undefined) break;
    processedMessages.delete(oldest);
  }
  processedMessages.set(messageId, now);
  return false;
}

// Verifikasi HMAC-SHA256 atas raw body. GOWA v8 mengirim header
// `X-Hub-Signature-256: sha256=<hex>`; secret sama di sisi GOWA
// (--webhook-secret / WHATSAPP_WEBHOOK_SECRET) dan di env API ini.
function verifyWebhookSignature(secret: string, rawBody: string, header: string | undefined): boolean {
  if (!header) return false;
  const provided = header.trim().replace(/^sha256=/i, "").toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualString(expected, provided);
}

// Helper: get single setting value
async function getSettingValue(db: any, key: string): Promise<string> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return row?.value || "";
}

// POST /whatsapp/webhook — Terima pesan masuk dari GOWA v8
// Header: X-Hub-Signature-256 (HMAC-SHA256 dari WHATSAPP_WEBHOOK_SECRET)
// GOWA v8 webhook payload format:
// {
//   "device_id": "628xxx@s.whatsapp.net",
//   "event": "message",
//   "payload": {
//     "body": "Halo saya mau donasi",
//     "chat_id": "628xxx@s.whatsapp.net",
//     "from": "628xxx@s.whatsapp.net",
//     "from_name": "Ahmad",
//     "id": "3B26C3756EC451645DDF",
//     "is_from_me": false,
//     "timestamp": "2026-02-18T18:13:58Z"
//   }
// }
// Batas body dipasang SEBELUM handler membaca teks — verifikasi HMAC butuh raw body penuh,
// jadi tanpa batas ini request tak terautentikasi bisa memaksa server memuat body sebesar apa pun.
const WEBHOOK_MAX_BODY = 1024 * 1024; // 1 MB

whatsappRoute.use("/webhook", bodyLimit({ maxSize: WEBHOOK_MAX_BODY, onError: (c) => c.text("Payload too large", 413) }));

whatsappRoute.post("/webhook", async (c) => {
  const db = c.get("db");

  // Fail-closed: tanpa secret terkonfigurasi, endpoint publik ini tidak boleh memproses apa pun
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[WA WEBHOOK] WHATSAPP_WEBHOOK_SECRET belum di-set — request ditolak");
    return c.text("Webhook not configured", 503);
  }

  // Signature dihitung atas raw body, jadi baca teks dulu, verifikasi, baru parse
  const rawBody = await c.req.text();
  if (!verifyWebhookSignature(webhookSecret, rawBody, c.req.header("x-hub-signature-256"))) {
    console.warn("[WA WEBHOOK] signature tidak valid — request ditolak");
    return c.text("Unauthorized", 401);
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.text("Bad Request", 400);
  }
  // Jangan log payload (berisi nomor HP, nama, isi pesan) — cukup event + id
  console.log("[WA WEBHOOK] incoming:", body?.event, body?.payload?.id || "");

  // Only process message events
  if (body.event !== "message") {
    return c.text("OK", 200);
  }

  const payload = body.payload || {};

  // GOWA v8 format: from = "628xxx@s.whatsapp.net"
  const from = (payload.from || "").replace("@s.whatsapp.net", "");
  const text = payload.body || "";
  const messageId = payload.id || "";
  const profileName = payload.from_name || "";
  const isGroup = (payload.chat_id || "").includes("@g.us");
  const isFromMe = payload.is_from_me || false;

  // Abaikan pesan dari group
  if (isGroup) {
    return c.text("OK", 200);
  }

  // Abaikan pesan dari diri sendiri
  if (isFromMe) {
    return c.text("OK", 200);
  }

  // Abaikan pesan duplikat (GOWA kadang kirim webhook 2x)
  if (messageId && isDuplicate(messageId)) {
    console.log("[WA WEBHOOK] duplicate message ignored:", messageId);
    return c.text("OK", 200);
  }

  // Extract image URL from GOWA payload
  // GOWA v8 sends image as relative path: "statics/media/xxx.jpeg"
  let imageUrl: string | undefined;
  let imageMimeType: string | undefined;
  if (payload.image) {
    if (typeof payload.image === "string") {
      // GOWA sends relative path like "statics/media/xxx.jpeg"
      imageUrl = payload.image.startsWith("http") ? payload.image : `__gowa_path__:${payload.image}`;
    } else if (payload.image.url) {
      const u = payload.image.url;
      imageUrl = u.startsWith("http") ? u : `__gowa_path__:${u}`;
      imageMimeType = payload.image.mimetype || payload.image.mime_type;
    } else if (payload.image.id) {
      imageUrl = `__gowa_media__:${payload.image.id}`;
      imageMimeType = payload.image.mimetype || payload.image.mime_type;
    }
  }

  // Determine message text — if image/document without text, generate a placeholder
  const hasImage = !!payload.image;
  const hasDocument = !!payload.document;
  const effectiveText = text
    || (hasImage ? "[Pengguna mengirim gambar/bukti transfer]" : "")
    || (hasDocument ? "[Pengguna mengirim dokumen]" : "");

  if (effectiveText && from) {
    // Check if bot is enabled
    const botEnabled = await getSettingValue(db, "whatsapp_bot_enabled");
    if (botEnabled === "true") {
      try {
        const { processIncomingMessage } = await import("../services/whatsapp-ai");
        await processIncomingMessage(db, {
          from,
          text: effectiveText,
          messageId,
          profileName,
          imageUrl,
          imageMimeType,
        }, c.env.FRONTEND_URL);
      } catch (err) {
        console.error("Error processing WA message:", err);
      }
    }
  }

  return c.text("OK", 200);
});

export default whatsappRoute;
