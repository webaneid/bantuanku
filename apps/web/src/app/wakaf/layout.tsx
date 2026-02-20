import type { Metadata } from 'next';
import { fetchSeoSettings, generateBreadcrumbJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const toAbsoluteUrl = (url: string) =>
    url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

  let seo: Record<string, any> = {};
  try {
    if (settings.seo_page_wakaf) {
      seo = typeof settings.seo_page_wakaf === 'string'
        ? JSON.parse(settings.seo_page_wakaf)
        : settings.seo_page_wakaf;
    }
  } catch {}

  const siteName = settings.site_name || 'Bantuanku';
  const title = seo.metaTitle || 'Wakaf';
  const description = seo.metaDescription || 'Program wakaf produktif untuk kebermanfaatan umat';
  const canonical = seo.canonicalUrl || `${appUrl}/wakaf`;

  const keywords = seo.focusKeyphrase
    ? seo.focusKeyphrase.split(',').map((k: string) => k.trim())
    : ['wakaf', 'wakaf produktif', 'wakaf online', 'wakaf uang'];

  const ogTitle = seo.ogTitle || title;
  const ogDescription = seo.ogDescription || description;
  const ogImageUrl = seo.ogImageUrl
    ? toAbsoluteUrl(seo.ogImageUrl)
    : (settings.og_image ? toAbsoluteUrl(settings.og_image) : undefined);

  const noIndex = seo.noIndex === true;
  const noFollow = seo.noFollow === true;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    ...(noIndex || noFollow ? {
      robots: { index: !noIndex, follow: !noFollow },
    } : {}),
    openGraph: {
      type: 'website',
      url: canonical,
      title: ogTitle,
      description: ogDescription,
      siteName,
      locale: 'id_ID',
      ...(ogImageUrl ? {
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: ogTitle }],
      } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function WakafLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const siteName = settings.site_name || 'Bantuanku';

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Wakaf',
    description: 'Program wakaf produktif untuk kebermanfaatan umat',
    url: `${appUrl}/wakaf`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: appUrl,
    },
  };

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Beranda', url: appUrl },
    { name: 'Wakaf' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
