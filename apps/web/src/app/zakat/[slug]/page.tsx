import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header, Footer } from '@/components/organisms';
import { fetchZakatTypes, type ZakatType } from '@/services/zakat';
import { fetchPublicSettings } from '@/services/settings';
import { fetchSeoSettings, generateBreadcrumbJsonLd } from '@/lib/seo';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { normalizeLocale, translate } from '@/lib/i18n';
import ZakatFitrahCalculatorPage from '../calculator/zakat-fitrah/page';
import ZakatMaalCalculatorPage from '../calculator/zakat-maal/page';
import ZakatProfesiCalculatorPage from '../calculator/zakat-profesi/page';
import ZakatPertanianCalculatorPage from '../calculator/zakat-pertanian/page';
import ZakatPeternakanCalculatorPage from '../calculator/zakat-peternakan/page';
import ZakatBisnisCalculatorPage from '../calculator/zakat-bisnis/page';
import { ZakatDisplayMetaProvider } from '@/components/zakat/ZakatDisplayMetaContext';

// Legacy fallback map by slug
const calculatorBySlug: Record<string, ComponentType<any>> = {
  'zakat-fitrah': ZakatFitrahCalculatorPage,
  'zakat-maal': ZakatMaalCalculatorPage,
  'zakat-profesi': ZakatProfesiCalculatorPage,
  'zakat-penghasilan': ZakatProfesiCalculatorPage, // Redirect logic to zakat-profesi calculator
  'zakat-pertanian': ZakatPertanianCalculatorPage,
  'zakat-peternakan': ZakatPeternakanCalculatorPage,
  'zakat-bisnis': ZakatBisnisCalculatorPage,
};

// Primary map by calculator type from database
const calculatorByType: Record<string, ComponentType<any>> = {
  'zakat-fitrah': ZakatFitrahCalculatorPage,
  'fitrah': ZakatFitrahCalculatorPage,
  'zakat-maal': ZakatMaalCalculatorPage,
  'maal': ZakatMaalCalculatorPage,
  'zakat-profesi': ZakatProfesiCalculatorPage,
  'profesi': ZakatProfesiCalculatorPage,
  'zakat-penghasilan': ZakatProfesiCalculatorPage,
  'penghasilan': ZakatProfesiCalculatorPage,
  'zakat-pertanian': ZakatPertanianCalculatorPage,
  'pertanian': ZakatPertanianCalculatorPage,
  'zakat-peternakan': ZakatPeternakanCalculatorPage,
  'peternakan': ZakatPeternakanCalculatorPage,
  'zakat-bisnis': ZakatBisnisCalculatorPage,
  'bisnis': ZakatBisnisCalculatorPage,
};

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  try {
    const zakatTypes = await fetchZakatTypes();
    const zakatType = zakatTypes.find((type) => type.slug === params.slug);
    if (!zakatType) return { title: t('zakatPage.defaults.title') };

    const settings = await fetchSeoSettings();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
    const siteName = settings.site_name || 'Bantuanku';
    const toAbsoluteUrl = (url: string) =>
      url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

    const zt = zakatType as any;

    // SEO Title: metaTitle > name
    const seoTitle = zt.metaTitle || zakatType.name;
    // SEO Description: metaDescription > description > fallback
    const seoDescription = zt.metaDescription || zakatType.description?.substring(0, 160) || t('zakatDetail.infoAndCalculator', { name: zakatType.name });

    // Canonical URL
    const canonicalUrl = zt.canonicalUrl || `${appUrl}/zakat/${params.slug}`;

    // OG Image
    const rawOgImage = zt.ogImageUrl || (zakatType.imageUrl || null) || settings.og_image;
    const ogImageUrl = rawOgImage ? toAbsoluteUrl(rawOgImage) : undefined;

    // OG Title & Description
    const ogTitle = zt.ogTitle || seoTitle;
    const ogDescription = zt.ogDescription || seoDescription;

    // Robots
    const noIndex = Boolean(zt.noIndex);
    const noFollow = Boolean(zt.noFollow);

    // Keywords
    const keywords = zt.focusKeyphrase
      ? zt.focusKeyphrase.split(',').map((k: string) => k.trim()).filter(Boolean)
      : [
        t('zakatPage.defaults.keywords.zakat'),
        zakatType.name,
        t('zakatPage.defaults.keywords.calculator'),
        t('zakatPage.defaults.keywords.pay'),
      ].filter(Boolean);

    return {
      title: seoTitle,
      description: seoDescription,
      keywords,
      alternates: { canonical: canonicalUrl },
      robots: {
        index: !noIndex,
        follow: !noFollow,
        googleBot: { index: !noIndex, follow: !noFollow, 'max-video-preview': -1, 'max-image-preview': 'large' as const, 'max-snippet': -1 },
      },
      openGraph: {
        type: 'website',
        locale: 'id_ID',
        url: canonicalUrl,
        siteName,
        title: ogTitle,
        description: ogDescription,
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: ogTitle }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        site: settings.twitter_handle || '@bantuanku',
        title: ogTitle,
        description: ogDescription,
        images: ogImageUrl ? [ogImageUrl] : undefined,
      },
    };
  } catch {
    return { title: t('zakatPage.defaults.title') };
  }
}

export default async function ZakatDetailPage({ params }: Props) {
  const { slug } = params;
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);

  // Fetch all zakat types to find this one
  let zakatTypes: ZakatType[];
  let settings: any = {};
  try {
    const [zakatTypesData, settingsData] = await Promise.all([
      fetchZakatTypes(),
      fetchPublicSettings(),
    ]);
    zakatTypes = zakatTypesData;
    settings = settingsData || {};
  } catch (error) {
    console.error('Failed to fetch zakat types:', error);
    notFound();
  }

  // Find the zakat type by slug
  const zakatType = zakatTypes.find((type) => type.slug === slug);

  if (!zakatType) {
    notFound();
  }

  // Generate JSON-LD
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const toAbsoluteUrl = (url: string) =>
    url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('zakatDetail.breadcrumb.home'), url: appUrl },
    { name: t('zakatDetail.breadcrumb.zakat'), url: `${appUrl}/zakat` },
    { name: zakatType.name },
  ]);

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: (zakatType as any).metaTitle || zakatType.name,
    description: (zakatType as any).metaDescription || zakatType.description || t('zakatDetail.infoAndCalculator', { name: zakatType.name }),
    url: `${appUrl}/zakat/${slug}`,
    ...(zakatType.imageUrl && { image: toAbsoluteUrl(zakatType.imageUrl) }),
    isPartOf: {
      '@type': 'WebSite',
      name: settings.site_name || settings.organization_name || 'Bantuanku',
      url: appUrl,
    },
  };

  const jsonLdScripts = (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </>
  );

  // Redirect calculator page using calculatorType from DB (fallback to slug mapping).
  if (zakatType.hasCalculator) {
    const calculatorType = String(zakatType.calculatorType || "").trim().toLowerCase();
    const CalculatorPage = calculatorByType[calculatorType] || calculatorBySlug[slug];
    if (CalculatorPage) {
      const isMitraOwner = zakatType.ownerType === "mitra" && !!zakatType.ownerName;
      const owner = isMitraOwner
        ? {
            type: "mitra" as const,
            name: zakatType.ownerName,
            slug: zakatType.ownerSlug || null,
            logoUrl:
              zakatType.ownerLogoUrl ||
              settings.organization_institution_logo ||
              settings.organization_logo ||
              null,
          }
        : {
            type: "organization" as const,
            name: settings.organization_name || settings.site_name || "Bantuanku",
            slug: null,
            logoUrl: settings.organization_institution_logo || settings.organization_logo || null,
          };

      return (
        <>
          {jsonLdScripts}
          <ZakatDisplayMetaProvider
            value={{
              id: zakatType.id,
              slug: zakatType.slug,
              calculatorType: zakatType.calculatorType || null,
              name: zakatType.name,
              description: zakatType.description,
              imageUrl: zakatType.imageUrl,
              fitrahAmount: zakatType.fitrahAmount ?? null,
              owner,
            }}
          >
            <CalculatorPage />
          </ZakatDisplayMetaProvider>
        </>
      );
    }
  }

  // Show info page for zakat types without calculator
  return (
    <>
      {jsonLdScripts}
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link
            href="/zakat"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('zakatDetail.backToList')}
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {zakatType.name}
            </h1>
            {zakatType.description && (
              <p className="text-gray-600" style={{ fontSize: '15px' }}>
                {zakatType.description}
              </p>
            )}
          </div>

          {/* Image */}
          {zakatType.imageUrl && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={zakatType.imageUrl}
                alt={zakatType.name}
                className="w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            <div className="prose max-w-none">
              {!zakatType.hasCalculator ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('zakatDetail.aboutTitle', { name: zakatType.name })}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {t('zakatDetail.aboutDescription', { name: zakatType.name })}
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-blue-800">
                      {t('zakatDetail.aboutHelp', { name: zakatType.name })}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('zakatDetail.calculatorTitle', { name: zakatType.name })}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {t('zakatDetail.calculatorDescription', { name: zakatType.name })}
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <p className="text-amber-800">
                      {t('zakatDetail.calculatorHelp', { name: zakatType.name })}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Back to Zakat List */}
          <div className="mt-8 text-center">
            <Link
              href="/zakat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              {t('zakatDetail.viewOther')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
