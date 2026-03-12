import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import { fetchZakatTypes, type ZakatType } from '@/services/zakat';
import { fetchPublicSettings } from '@/services/settings';
import { fetchSeoSettings, generateBreadcrumbJsonLd, resolveOgImageUrl } from '@/lib/seo';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { normalizeLocale, translate } from '@/lib/i18n';
import { getImageUrlByVariant } from '@/lib/image';
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

    const zt = zakatType as any;

    // SEO Title: metaTitle > name
    const seoTitle = zt.metaTitle || zakatType.name;
    // SEO Description: metaDescription > description > fallback
    const seoDescription = zt.metaDescription || zakatType.description?.substring(0, 160) || t('zakatDetail.infoAndCalculator', { name: zakatType.name });

    // Canonical URL
    const canonicalUrl = zt.canonicalUrl || `${appUrl}/zakat/${params.slug}`;

    // OG Image
    const ogImageUrl = resolveOgImageUrl(
      appUrl,
      [zt.ogImageUrl, zakatType.imageUrl || null, settings.og_image],
      '/og-image.jpg'
    );

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
      <div className="hidden lg:block">
        <Breadcrumb items={[{ label: t('zakatDetail.breadcrumb.home'), href: '/' }, { label: t('zakatDetail.breadcrumb.zakat'), href: '/zakat' }, { label: zakatType.name }]} />
      </div>

      {/* Mobile: edge-to-edge image with back button */}
      {zakatType.imageUrl && (
        <div className="lg:hidden relative">
          <Link
            href="/zakat"
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <img
            src={getImageUrlByVariant(zakatType.imageUrl, ['large'])}
            alt={zakatType.name}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Mobile: title compact section */}
      <div className="lg:hidden bg-white px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {zakatType.name}
        </h1>
        {zakatType.description && (
          <p className="text-sm text-gray-600">{zakatType.description}</p>
        )}
      </div>

      <main className="min-h-screen bg-gray-50 py-4 lg:py-8">
        <div className="container mx-auto px-4">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {zakatType.name}
            </h1>
            {zakatType.description && (
              <p className="text-gray-600" style={{ fontSize: '15px' }}>
                {zakatType.description}
              </p>
            )}
          </div>

          {/* Desktop Image */}
          {zakatType.imageUrl && (
            <div className="hidden lg:block mb-8 rounded-xl overflow-hidden">
              <img
                src={getImageUrlByVariant(zakatType.imageUrl, ['large'])}
                alt={zakatType.name}
                className="w-full h-auto"
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

          {/* Help Card */}
          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              {t('zakatDetail.help.title')}
            </h3>
            <p className="text-sm text-blue-700">
              {t('zakatDetail.help.description')}
            </p>
            {settings.organization_whatsapp && (() => {
              const raw = settings.organization_whatsapp.replace(/[^0-9]/g, '');
              const waNumber = raw.startsWith('0') ? '62' + raw.slice(1) : raw;
              const waMessage = encodeURIComponent(`Saya butuh bantuan tentang ${zakatType.name}`);
              return (
                <a
                  href={`https://wa.me/${waNumber}?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-sm text-blue-700 font-medium hover:text-blue-900"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('zakatDetail.help.whatsapp')}
                </a>
              );
            })()}
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
