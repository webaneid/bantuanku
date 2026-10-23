import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Identitas klien untuk rate limit.
//
// `x-forwarded-for` yang dikirim KLIEN bisa dipalsukan: bila seluruh nilainya dipakai sebagai kunci,
// mengganti header di tiap request memberi kunci baru dan batas tidak pernah tercapai (brute force
// login/OTP lolos). Reverse proxy hanya MENAMBAHKAN alamat yang ia lihat di sisi KANAN header, jadi
// entri ke-N dari kanan (N = jumlah proxy tepercaya di depan API) adalah satu-satunya yang tidak bisa
// dipalsukan klien.
//
// Env `TRUSTED_PROXY_HOPS` (bilangan bulat >= 1) mengaktifkan perilaku aman itu:
//   - Nginx saja di depan API              -> 1
//   - Cloudflare + Nginx di depan API      -> 2 (tepat satu entri Cloudflare di kanan)
// Tanpa env ini perilaku lama dipertahankan (rentan dipalsukan) agar pengguna di balik proxy bersama
// tidak terkunci massal sebelum topologi proxy produksi dikonfirmasi.
function getClientIdentifier(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS || "", 10);

  if (Number.isInteger(hops) && hops >= 1) {
    const parts = (xff || "").split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[Math.max(0, parts.length - hops)];
    return c.req.header("x-real-ip") || "127.0.0.1";
  }

  return xff || c.req.header("x-real-ip") || "127.0.0.1";
}

export function rateLimit(config: RateLimitConfig) {
  // Store per-instance (bukan module-level shared) — kalau beberapa rate limiter
  // dipasang di rute yang sama (mis. `apiRateLimit` global + `authRateLimit`
  // khusus rute auth), masing-masing harus punya counter sendiri. Store yang
  // dibagi bareng menyebabkan tiap limiter ikut menaikkan counter limiter lain
  // untuk key (identifier+path) yang sama, jadi limiter yang lebih ketat
  // (mis. authRateLimit 20/15menit) trip jauh lebih cepat dari yang dikonfigurasi
  // karena "disumbang" oleh increment dari limiter lain yang jalan bareng.
  const store = new Map<string, { count: number; resetTime: number }>();

  function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }

  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    cleanupExpiredEntries();

    const identifier = getClientIdentifier(c);
    const key = `${identifier}:${c.req.path}`;
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      store.set(key, record);
    }

    record.count++;

    c.header("X-RateLimit-Limit", config.maxRequests.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, config.maxRequests - record.count).toString());
    c.header("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

    if (record.count > config.maxRequests) {
      return c.json(
        {
          success: false,
          message: "Too many requests, please try again later",
        },
        429
      );
    }

    await next();
  };
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
});

// Pencarian identitas publik (autofill checkout): ketat per IP karena mengembalikan data pribadi
export const lookupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300, // Increased for development
});

// Pembuatan transaksi publik (guest checkout). Tiap transaksi memicu WhatsApp ke nomor donatur, jadi dibatasi
// agar tidak dipakai membanjiri nomor orang lain. Satu checkout membuat satu transaksi per item keranjang.
export const transactionCreateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});
