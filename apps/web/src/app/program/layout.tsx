import type { Metadata } from 'next';
import { fetchSeoSettings, generateBreadcrumbJsonLd, resolveOgImageUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';

  let seo: Record<string, any> = {};
  try {
    if (settings.seo_page_program) {
      seo = typeof settings.seo_page_program === 'string'
        ? JSON.parse(settings.seo_page_program)
        : settings.seo_page_program;
    }
  } catch {}

  const siteName = settings.site_name || 'Bantuanku';
  const title = seo.metaTitle || 'Program';
  const description = seo.metaDescription || 'Daftar program donasi dan campaign yang sedang berlangsung';
  const canonical = seo.canonicalUrl || `${appUrl}/program`;

  const keywords = seo.focusKeyphrase
    ? seo.focusKeyphrase.split(',').map((k: string) => k.trim())
    : ['program donasi', 'campaign', 'donasi online', 'galang dana'];

  const ogTitle = seo.ogTitle || title;
  const ogDescription = seo.ogDescription || description;
  const ogImageUrl = resolveOgImageUrl(appUrl, [seo.ogImageUrl, settings.og_image], '/og-image.jpg');

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

export default async function ProgramLayout({
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
    name: 'Program',
    description: 'Daftar program donasi dan campaign yang sedang berlangsung',
    url: `${appUrl}/program`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: appUrl,
    },
  };

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Beranda', url: appUrl },
    { name: 'Program' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
