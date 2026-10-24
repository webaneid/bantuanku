/** @type {import('next').NextConfig} */

function buildRemotePatterns() {
  const patterns = [
    { protocol: 'http', hostname: 'localhost', port: '50245', pathname: '/uploads/**' },
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'https', hostname: 'images.unsplash.com' },
    { protocol: 'https', hostname: 'placehold.co' },
    { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/cdn.webane.net/**' },
  ];
  // Add API and CDN hostnames from env so each deployment controls its own domains
  if (process.env.NEXT_PUBLIC_API_URL) {
    try { patterns.push({ protocol: 'https', hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname }); } catch {}
  }
  if (process.env.NEXT_PUBLIC_CDN_URL) {
    try { patterns.push({ protocol: 'https', hostname: new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname }); } catch {}
  }
  return patterns;
}

// Halaman publik yang sama untuk semua pengunjung (HTML tidak memuat data per-user; login/keranjang di sisi klien).
// Hanya aktif bila HTML_EDGE_CACHE=true SAAT BUILD (headers() dibekukan ke routes-manifest). Tanpa itu perilaku tidak berubah.
// Bahasa Inggris (cookie locale=en) TIDAK diberi header publik; Cloudflare WAJIB juga di-bypass untuk cookie itu
// (lihat docs/arsitektur-cache-performance.md, fase 7), kalau tidak pengunjung EN bisa menerima salinan ID.
const EDGE_CACHEABLE_PATHS = ['/', '/program', '/program/:slug', '/program/kategori/:slug', '/laporan', '/laporan/:slug', '/page/:slug'];

function buildEdgeCacheHeaders() {
  if (process.env.HTML_EDGE_CACHE !== 'true') return [];
  return EDGE_CACHEABLE_PATHS.map((source) => ({
    source,
    missing: [{ type: 'cookie', key: 'locale', value: 'en' }],
    headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' }],
  }));
}

const nextConfig = {
  reactStrictMode: true,

  // Loader kustom: /_next/image TIDAK dipakai/dilayani (tanpa kerja resize di VPS); lihat src/lib/image-loader.ts.
  // remotePatterns dipertahankan sebagai daftar host gambar yang sah bila loader kelak dikembalikan ke bawaan.
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    remotePatterns: buildRemotePatterns(),
  },

  // Rewrites for API proxy (development)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
    ];
  },

  // Headers for security (+ cache HTML publik di edge bila HTML_EDGE_CACHE=true; lihat buildEdgeCacheHeaders)
  async headers() {
    return [
      ...buildEdgeCacheHeaders(),
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
