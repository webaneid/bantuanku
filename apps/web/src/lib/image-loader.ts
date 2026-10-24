/**
 * Loader global next/image (dirujuk dari next.config.js).
 *
 * Dengan `loader: 'custom'` endpoint `/_next/image` TIDAK dilayani sama sekali (404), jadi loader ini tidak boleh
 * mengarah ke sana. Tujuannya: tidak ada kerja resize/encode di VPS dan tidak bergantung pada Cloudflare (yang tidak
 * men-cache `/_next/image`).
 *
 * - Media kita (CDN/GCS/API, `.webp`) dikembalikan APA ADANYA: file sudah WebP hasil resize saat upload dan variannya
 *   (thumbnail/medium/large) dipilih pemanggil lewat `getImageUrlByVariant`. Tidak ada penukaran varian otomatis karena
 *   kategori tertentu (financial/activity/document) hanya punya satu file `original`.
 * - Unsplash (slide bawaan): resize oleh Unsplash lewat parameter URL.
 * - Lainnya: dikembalikan apa adanya.
 */
const MEDIA_HOSTS = new Set<string>(['storage.googleapis.com']);

for (const envUrl of [process.env.NEXT_PUBLIC_CDN_URL, process.env.NEXT_PUBLIC_API_URL]) {
  if (!envUrl) continue;
  try {
    MEDIA_HOSTS.add(new URL(envUrl).hostname);
  } catch {
    // env bukan URL absolut: abaikan
  }
}

function isPreOptimizedMedia(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    const url = new URL(src);
    return MEDIA_HOSTS.has(url.hostname) && /\.webp$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (isPreOptimizedMedia(src)) return src;

  if (/^https:\/\/images\.unsplash\.com\//i.test(src)) {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality || 75));
    url.searchParams.set('auto', 'format');
    return url.toString();
  }

  return src;
}
