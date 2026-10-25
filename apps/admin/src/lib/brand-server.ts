import { brandCss, resolveBrand } from "./brand";

/**
 * Warna brand dari settings publik API (SERVER ONLY, root layout). Cache data 60 dtk; gagal ambil → warna bawaan.
 * Nilai yang masuk CSS hanya angka hasil `resolveBrand` (menolak selain hex valid).
 */
export async function fetchBrandCss(): Promise<string> {
  try {
    const base = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1").replace(/\/$/, "");
    const url = base.endsWith("/v1") ? `${base}/settings` : `${base}/v1/settings`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return brandCss(resolveBrand(null));
    const json = await res.json();
    return brandCss(resolveBrand(json?.data));
  } catch {
    return brandCss(resolveBrand(null));
  }
}
