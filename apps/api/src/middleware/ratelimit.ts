import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
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

    const identifier = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "127.0.0.1";
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

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300, // Increased for development
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});
