import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

interface CacheConfig {
  ttl: number; // seconds
}

interface CacheEntry {
  body: string;
  expiresAt: number;
}

const MAX_ENTRIES = 300;
const cacheStore = new Map<string, CacheEntry>();

/**
 * Cache respons GET publik di memori proses API (hanya status 200).
 *
 * HANYA untuk endpoint yang responsnya sama untuk semua pengunjung (tidak bergantung user/token). Kunci = path + query;
 * header Authorization tidak ikut kunci. Request dengan `search` tidak di-cache (ruang kunci tak terbatas).
 * Dikosongkan oleh `clearApiCache()` setiap kali admin berhasil mengubah data (lihat web-revalidate.ts), dan batas
 * maksimum entri membuang yang terlama. Cache per proses: aman karena API berjalan satu proses (PM2 fork); bila kelak
 * multi-instance, invalidasi perlu dipindah ke penyimpanan bersama.
 *
 * Header ke klien sengaja `max-age=0, must-revalidate`: browser tidak menahan data basi setelah admin mengubah sesuatu.
 */
export function cache(config: CacheConfig) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    if (c.req.method !== "GET" || c.req.query("search") !== undefined) {
      await next();
      return;
    }

    const url = new URL(c.req.url);
    const cacheKey = `${c.req.path}?${url.searchParams.toString()}`;
    const now = Date.now();

    const cached = cacheStore.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-Cache": "HIT",
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }
    if (cached) cacheStore.delete(cacheKey);

    await next();

    if (c.res.status === 200) {
      const body = await c.res.clone().text();
      if (cacheStore.size >= MAX_ENTRIES) {
        const oldest = cacheStore.keys().next().value;
        if (oldest !== undefined) cacheStore.delete(oldest);
      }
      cacheStore.set(cacheKey, { body, expiresAt: now + config.ttl * 1000 });
      c.header("X-Cache", "MISS");
      c.header("Cache-Control", "public, max-age=0, must-revalidate");
    }
  };
}

/** Buang seluruh cache respons (dipanggil setelah mutasi admin berhasil). */
export function clearApiCache() {
  cacheStore.clear();
}

export const campaignCache = cache({ ttl: 60 }); // 1 minute
export const categoryCache = cache({ ttl: 300 }); // 5 minutes
export const settingsCache = cache({ ttl: 300 }); // 5 minutes
export const statsCache = cache({ ttl: 120 }); // 2 minutes
