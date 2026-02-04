import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

interface CacheConfig {
  ttl: number; // seconds
}

const cacheStore = new Map<string, { data: string; expiresAt: number }>();

export function cache(config: CacheConfig) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    // Cleanup expired cache on each request
    cleanupExpiredCache();

    if (c.req.method !== "GET") {
      await next();
      return;
    }

    const cacheKey = `${c.req.path}?${new URL(c.req.url).searchParams.toString()}`;
    const now = Date.now();

    const cached = cacheStore.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      c.header("X-Cache", "HIT");
      c.header("Cache-Control", `public, max-age=${Math.floor((cached.expiresAt - now) / 1000)}`);
      return c.json(JSON.parse(cached.data));
    }

    await next();

    if (c.res.status === 200) {
      const body = await c.res.clone().text();
      cacheStore.set(cacheKey, {
        data: body,
        expiresAt: now + config.ttl * 1000,
      });
      c.header("X-Cache", "MISS");
      c.header("Cache-Control", `public, max-age=${config.ttl}`);
    }
  };
}

export const campaignCache = cache({ ttl: 60 }); // 1 minute
export const categoryCache = cache({ ttl: 300 }); // 5 minutes
export const settingsCache = cache({ ttl: 600 }); // 10 minutes

// Cleanup expired cache entries inline (not using setInterval for Workers compatibility)
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, cached] of cacheStore.entries()) {
    if (now > cached.expiresAt) {
      cacheStore.delete(key);
    }
  }
}
