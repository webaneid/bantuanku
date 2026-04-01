import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/checkout/payment-result/', '/api/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
