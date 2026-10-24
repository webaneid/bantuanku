/**
 * Base URL API untuk fetch data (server maupun klien).
 *
 * Di server, `API_INTERNAL_URL` (mis. http://127.0.0.1:50245/v1) dipakai bila di-set sehingga fetch SSR langsung ke
 * proses API di VPS, tanpa memutar lewat domain publik + Cloudflare. `API_INTERNAL_URL` bukan NEXT_PUBLIC_*, jadi
 * bernilai undefined di browser dan otomatis jatuh ke NEXT_PUBLIC_API_URL.
 */
function normalizeInternal(url: string): string {
  const base = url.replace(/\/$/, '');
  return base.endsWith('/v1') ? base : `${base}/v1`;
}

export const API_URL: string = process.env.API_INTERNAL_URL
  ? normalizeInternal(process.env.API_INTERNAL_URL)
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
