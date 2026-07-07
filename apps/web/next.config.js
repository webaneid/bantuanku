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

const nextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: buildRemotePatterns(),
    formats: ['image/avif', 'image/webp'],
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

  // Headers for security
  async headers() {
    return [
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
