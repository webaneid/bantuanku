import type { Context, Next } from "hono";

// Prefix route admin -> tag Next Data Cache di web yang harus di-revalidate (lihat arsitektur-cache-performance.md)
const ROUTE_TAGS: Array<[string, string[]]> = [
  ["campaigns", ["campaigns", "stats"]],
  ["categories", ["categories", "campaigns"]],
  ["pillars", ["categories", "campaigns"]],
  ["pages", ["pages"]],
  ["settings", ["settings"]],
  ["activity-reports", ["reports", "campaigns"]],
  ["qurban", ["qurban"]],
  ["zakat", ["zakat", "stats", "reports"]],
  ["mitra", ["campaigns", "stats"]],
  ["donations", ["campaigns", "stats"]],
  ["disbursements", ["stats"]],
  ["evidences", ["reports"]],
];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Setelah mutasi admin berhasil, minta web membuang cache data terkait.
 * Fire-and-forget: kegagalan tidak memengaruhi respons admin (cache tetap kedaluwarsa sendiri sesuai TTL).
 * No-op bila WEB_INTERNAL_URL / REVALIDATE_SECRET belum di-set.
 */
export async function webRevalidateMiddleware(c: Context, next: Next) {
  await next();

  const webUrl = process.env.WEB_INTERNAL_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!webUrl || !secret || !MUTATING.has(c.req.method) || c.res.status >= 400) return;

  const segment = c.req.path.replace(/^\/v1\/admin\//, "").split("/")[0] || "";
  const tags = new Set<string>();
  for (const [prefix, mapped] of ROUTE_TAGS) {
    if (segment === prefix || segment.startsWith(`${prefix}-`)) mapped.forEach((t) => tags.add(t));
  }
  if (tags.size === 0) return;

  fetch(`${webUrl.replace(/\/$/, "")}/revalidate-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ tags: [...tags] }),
    signal: AbortSignal.timeout(3000),
  }).catch((error) => {
    console.error("[web-revalidate] gagal:", error instanceof Error ? error.message : error);
  });
}
