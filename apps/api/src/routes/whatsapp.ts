import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import { WhatsAppService } from "../services/whatsapp";
import type { Env, Variables } from "../types";

const whatsappRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// Dedup: track processed message IDs to prevent double replies
const processedMessages = new Map<string, number>();
const DEDUP_TTL = 60_000; // 60 seconds

function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Cleanup old entries
  for (const [id, ts] of processedMessages) {
    if (now - ts > DEDUP_TTL) processedMessages.delete(id);
  }
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
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
whatsappRoute.post("/webhook", async (c) => {
  const db = c.get("db");

  const body = await c.req.json();
  console.log("[WA WEBHOOK] incoming:", JSON.stringify(body));

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
    console.log("[WA WEBHOOK] image payload:", JSON.stringify(payload.image));
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
    console.log("[WA WEBHOOK] extracted imageUrl:", imageUrl, "mimeType:", imageMimeType);
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
