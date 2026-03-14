import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/checkout/payment-result/', '/api/', '/_next/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
