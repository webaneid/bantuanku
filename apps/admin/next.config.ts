import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787/v1",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/cdn.webane.net/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '50245',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
