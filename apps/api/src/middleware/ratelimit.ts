import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    // Cleanup expired entries on each request
    cleanupExpiredEntries();

    const identifier = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "127.0.0.1";
    const key = `${identifier}:${c.req.path}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, record);
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

// Cleanup expired entries inline (not using setInterval for Workers compatibility)
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}
