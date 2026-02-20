import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { fetchSeoSettings, generateBreadcrumbJsonLd } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const toAbsoluteUrl = (url: string) =>
    url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

  let seo: Record<string, any> = {};
  try {
    if (settings.seo_page_qurban) {
      seo = typeof settings.seo_page_qurban === 'string'
        ? JSON.parse(settings.seo_page_qurban)
        : settings.seo_page_qurban;
    }
  } catch {}

  const siteName = settings.site_name || t('qurbanPage.defaults.organizationName');
  const title = seo.metaTitle || t('qurbanLayout.defaults.title');
  const description = seo.metaDescription || t('qurbanLayout.defaults.description');
  const canonical = seo.canonicalUrl || `${appUrl}/qurban`;

  const keywords = seo.focusKeyphrase
    ? seo.focusKeyphrase.split(',').map((k: string) => k.trim())
    : [
        t('qurbanLayout.defaults.keywords.qurban'),
        t('qurbanLayout.defaults.keywords.online'),
        t('qurbanLayout.defaults.keywords.livestock'),
        t('qurbanLayout.defaults.keywords.eidAdha'),
      ];

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
      locale: locale === 'id' ? 'id_ID' : 'en_US',
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

export default async function QurbanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const siteName = settings.site_name || t('qurbanPage.defaults.organizationName');

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('qurbanLayout.defaults.title'),
    description: t('qurbanLayout.defaults.description'),
    url: `${appUrl}/qurban`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: appUrl,
    },
  };

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('qurbanDetail.breadcrumb.home'), url: appUrl },
    { name: t('qurbanDetail.breadcrumb.qurban') },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
