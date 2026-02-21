import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { fetchZakatTypes, type ZakatType } from '@/services/zakat';
import { fetchPublicSettings } from '@/services/settings';
import { fetchSeoSettings, generateBreadcrumbJsonLd, resolveOgImageUrl } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';
import ZakatArchive from './ZakatArchive';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';

  let seo: Record<string, any> = {};
  try {
    if (settings.seo_page_zakat) {
      seo = typeof settings.seo_page_zakat === 'string'
        ? JSON.parse(settings.seo_page_zakat)
        : settings.seo_page_zakat;
    }
  } catch {}

  const siteName = settings.site_name || 'Bantuanku';
  const title = seo.metaTitle || t('zakatPage.defaults.title');
  const description = seo.metaDescription || t('zakatPage.defaults.description');
  const canonical = seo.canonicalUrl || `${appUrl}/zakat`;

  const keywords = seo.focusKeyphrase
    ? seo.focusKeyphrase.split(',').map((k: string) => k.trim())
    : [
      t('zakatPage.defaults.keywords.zakat'),
      t('zakatPage.defaults.keywords.fitrah'),
      t('zakatPage.defaults.keywords.maal'),
      t('zakatPage.defaults.keywords.payOnline'),
    ];

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

function buildFallbackZakatTypes(t: (key: string, params?: Record<string, string | number>) => string): ZakatType[] {
  return [
    {
      id: 'zakat-fitrah',
      slug: 'zakat-fitrah',
      name: t('zakatPage.defaults.fallbackTypes.fitrah'),
      imageUrl: null,
      description: null,
      icon: null,
      hasCalculator: true,
      calculatorType: 'zakat-fitrah',
      isActive: true,
      displayOrder: 1,
    },
    {
      id: 'zakat-maal',
      slug: 'zakat-maal',
      name: t('zakatPage.defaults.fallbackTypes.maal'),
      imageUrl: null,
      description: null,
      icon: null,
      hasCalculator: true,
      calculatorType: 'zakat-maal',
      isActive: true,
      displayOrder: 2,
    },
    {
      id: 'zakat-penghasilan',
      slug: 'zakat-penghasilan',
      name: t('zakatPage.defaults.fallbackTypes.penghasilan'),
      imageUrl: null,
      description: null,
      icon: null,
      hasCalculator: true,
      calculatorType: 'zakat-profesi',
      isActive: true,
      displayOrder: 3,
    },
    {
      id: 'zakat-bisnis',
      slug: 'zakat-bisnis',
      name: t('zakatPage.defaults.fallbackTypes.bisnis'),
      imageUrl: null,
      description: null,
      icon: null,
      hasCalculator: true,
      calculatorType: 'zakat-bisnis',
      isActive: true,
      displayOrder: 4,
    },
  ];
}

export default async function ZakatPage() {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  // Fetch zakat types from API
  let zakatTypes = buildFallbackZakatTypes(t);
  try {
    const types = await fetchZakatTypes();
    if (types && types.length > 0) {
      zakatTypes = types;
    }
  } catch (error) {
    console.error('Failed to fetch zakat types, using fallback data:', error);
  }

  // Default page content
  let pageTitle = t('zakatPage.defaults.title');
  let pageDescription = t('zakatPage.defaults.description');
  let organizationName = t('zakatPage.defaults.organizationName');
  let infoTitle = t('zakatPage.defaults.infoTitle');
  let infoItems = [
    t('zakatPage.defaults.infoItems.item1'),
    t('zakatPage.defaults.infoItems.item2'),
    t('zakatPage.defaults.infoItems.item3'),
    t('zakatPage.defaults.infoItems.item4'),
  ];

  // Fetch settings from API
  try {
    const settings = await fetchPublicSettings();
    if (settings.organization_name) {
      organizationName = settings.organization_name;
    }

    if (settings.frontend_zakat_page) {
      const zakatPage = JSON.parse(settings.frontend_zakat_page);

      if (zakatPage.title) pageTitle = zakatPage.title;
      if (zakatPage.description) pageDescription = zakatPage.description;
      if (zakatPage.infoTitle) infoTitle = zakatPage.infoTitle;
      if (zakatPage.infoItems && Array.isArray(zakatPage.infoItems)) {
        infoItems = zakatPage.infoItems.map((item: any) => item.text);
      }

    }
  } catch (error) {
    console.error('[Zakat Page] Failed to fetch settings:', error);
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: pageTitle,
        description: pageDescription,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com'}/zakat`,
        isPartOf: {
          '@type': 'WebSite',
          name: organizationName,
          url: process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com',
        },
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        generateBreadcrumbJsonLd([
          { name: t('zakatPage.breadcrumb.home'), url: process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com' },
          { name: t('zakatPage.breadcrumb.zakat') },
        ])
      ) }} />
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <section className="py-12 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="section-title text-gray-900 mb-4">
                {pageTitle}
              </h1>
              <p className="section-description text-gray-600">
                {pageDescription}
              </p>
              <div className="mt-5">
                <Link
                  href="/zakat/laporan"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Lihat Laporan Zakat Publik
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 md:py-12">

          <ZakatArchive zakatTypes={zakatTypes} organizationName={organizationName} />

          {/* Info Box */}
          <div className="mt-12 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="hidden md:block w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="section-title text-emerald-900 mb-3">
                  {infoTitle}
                </h4>
                <ul className="!space-y-0 md:!space-y-2 !mb-0 !ml-0">
                  {infoItems.map((item, index) => (
                    <li key={index} className="section-description text-emerald-800">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
