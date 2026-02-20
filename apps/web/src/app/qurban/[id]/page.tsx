import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import { QurbanCard } from '@/components/organisms/QurbanCard/QurbanCard';
import { fetchPackageDetail, fetchActivePeriods, fetchPackagesByPeriod, getQurbanImageUrl, getQurbanImageUrlByVariant } from '@/services/qurban';
import { fetchPublicSettings } from '@/services/settings';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import { fetchSeoSettings, generateBreadcrumbJsonLd } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';
import QurbanTabs from './QurbanTabs';
import QurbanSidebar from './QurbanSidebar';

interface QurbanPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: QurbanPageProps): Promise<Metadata> {
  try {
    const locale = normalizeLocale(cookies().get('locale')?.value);
    const t = (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params);
    const response = await fetchPackageDetail(params.id);
    const pkg = response.data;
    const settings = await fetchSeoSettings();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
    const siteName = settings.site_name || t('qurbanPage.defaults.organizationName');
    const toAbsoluteUrl = (url: string) =>
      url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

    // SEO Title: metaTitle > name
    const seoTitle = pkg.metaTitle || pkg.name;
    // SEO Description: metaDescription > description > fallback
    const seoDescription =
      pkg.metaDescription ||
      pkg.description?.substring(0, 160) ||
      t('qurbanDetail.metadata.descriptionFallback', { name: pkg.name });

    // Canonical URL
    const canonicalUrl = pkg.canonicalUrl || `${appUrl}/qurban/${params.id}`;

    // OG Image
    const rawOgImage = pkg.ogImageUrl || (pkg.imageUrl ? getQurbanImageUrl(pkg.imageUrl) : null) || settings.og_image;
    const ogImageUrl = rawOgImage ? toAbsoluteUrl(rawOgImage) : undefined;

    // OG Title & Description
    const ogTitle = pkg.ogTitle || seoTitle;
    const ogDescription = pkg.ogDescription || seoDescription;

    // Robots
    const noIndex = Boolean(pkg.noIndex);
    const noFollow = Boolean(pkg.noFollow);

    // Keywords
    const animalLabel =
      pkg.animalType === 'cow'
        ? t('qurbanDetail.confirmModal.animalType.cow')
        : t('qurbanDetail.confirmModal.animalType.goat');
    const keywords = pkg.focusKeyphrase
      ? pkg.focusKeyphrase.split(',').map((k: string) => k.trim()).filter(Boolean)
      : [
          t('qurbanDetail.metadata.keywords.qurban'),
          animalLabel,
          pkg.name,
          t('qurbanDetail.metadata.keywords.eidAdha'),
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
        locale: locale === 'id' ? 'id_ID' : 'en_US',
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
    const locale = normalizeLocale(cookies().get('locale')?.value);
    return { title: translate(locale, 'qurbanLayout.defaults.title') };
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function mapQurbanPackageToCardProps(
  pkg: any,
  organizationName: string,
  popularBadgeLabel: string
) {
  const ownerName =
    pkg.ownerType === "mitra" && pkg.ownerName
      ? pkg.ownerName
      : organizationName;

  return {
    id: pkg.packagePeriodId,
    slug: pkg.packagePeriodId,
    name: pkg.name,
    category: pkg.animalType === 'cow' ? ('sapi' as const) : ('kambing' as const),
    packageType: pkg.packageType,
    price: pkg.price,
    image: getQurbanImageUrlByVariant(pkg.imageUrl, ['medium', 'thumbnail', 'large']),
    badge: pkg.isFeatured ? popularBadgeLabel : undefined,
    ownerName,
  };
}

function pickRelatedQurbanPackages(allPackages: any[], currentPackage: any, maxItems = 4): any[] {
  const pool = allPackages.filter((item) => item.packagePeriodId !== currentPackage.packagePeriodId);
  const isPriority = (item: any) => Boolean(item.isFeatured);
  const sameAnimalPriority = shuffleArray(
    pool.filter((item) => isPriority(item) && item.animalType === currentPackage.animalType)
  );
  const otherAnimalPriority = shuffleArray(
    pool.filter((item) => isPriority(item) && item.animalType !== currentPackage.animalType)
  );

  const selected: any[] = [];
  const selectedIds = new Set<string>();

  const pushUnique = (items: any[]) => {
    for (const item of items) {
      if (selected.length >= maxItems) break;
      if (selectedIds.has(item.packagePeriodId)) continue;
      selected.push(item);
      selectedIds.add(item.packagePeriodId);
    }
  };

  pushUnique(sameAnimalPriority);
  pushUnique(otherAnimalPriority);

  if (selected.length < maxItems) {
    const remaining = pool.filter((item) => !selectedIds.has(item.packagePeriodId));
    const remainingPriority = shuffleArray(remaining.filter(isPriority));
    const remainingOthers = shuffleArray(remaining.filter((item) => !isPriority(item)));
    pushUnique(remainingPriority);
    pushUnique(remainingOthers);
  }

  return selected.slice(0, maxItems);
}

export default async function QurbanPage({ params }: QurbanPageProps) {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);

  // Fetch qurban package by id
  let qurbanPackage: any = null;

  try {
    const response = await fetchPackageDetail(params.id);
    qurbanPackage = response.data;
  } catch (error) {
    console.error('Failed to fetch qurban package:', error);
    notFound();
  }

  // Fetch active periods for selection
  let periods: any[] = [];
  try {
    const periodsResponse = await fetchActivePeriods();
    periods = periodsResponse.data || [];
  } catch (error) {
    console.error('Failed to fetch periods:', error);
  }

  // Fetch settings for footer and admin fees
  let settings: any = {
    organization_logo: '/logo.svg',
    organization_name: t('qurbanPage.defaults.organizationName'),
  };

  let fullAddress: string | undefined;
  let footerProgramLinks: Array<{ label: string; href: string }> = [];

  try {
    settings = await fetchPublicSettings();

    // Fetch complete address if village code exists
    if (settings.organization_village_code) {
      const completeAddress = await fetchCompleteAddress(settings.organization_village_code);
      if (completeAddress && settings.organization_detail_address) {
        fullAddress = formatCompleteAddress(settings.organization_detail_address, completeAddress);
      }
    }

    // Parse program links from service categories
    if (settings.frontend_service_categories) {
      try {
        const categories = JSON.parse(settings.frontend_service_categories);
        if (Array.isArray(categories)) {
          footerProgramLinks = categories.map((cat: any) => ({
            label: cat.name,
            href: `/${cat.slug}`,
          }));
        }
      } catch (e) {
        console.error('Failed to parse service categories:', e);
      }
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  }

  // Get admin fees from settings (convert to number to ensure proper calculation)
  const adminFeeCow = Number(settings.amil_qurban_sapi_fee) || 0;
  const adminFeeGoat = Number(settings.amil_qurban_perekor_fee) || 0;

  // Determine animal type label
  const animalTypeLabel =
    qurbanPackage.animalType === 'cow'
      ? t('qurbanDetail.confirmModal.animalType.cow')
      : t('qurbanDetail.confirmModal.animalType.goat');
  const isMitraOwner = qurbanPackage.ownerType === 'mitra' && !!qurbanPackage.ownerName;
  const ownerName = isMitraOwner
    ? qurbanPackage.ownerName
    : settings.organization_name || settings.site_name || t('qurbanPage.defaults.organizationName');
  const ownerLogoUrl = isMitraOwner
    ? qurbanPackage.ownerLogoUrl ||
      settings.organization_institution_logo ||
      settings.organization_logo ||
      null
    : settings.organization_institution_logo || settings.organization_logo || null;
  const ownerSlug = isMitraOwner ? qurbanPackage.ownerSlug || null : null;
  let relatedQurbanPackages: any[] = [];

  try {
    const periodPackagesResponse = await fetchPackagesByPeriod(qurbanPackage.periodId);
    const periodPackages = periodPackagesResponse.data || [];
    relatedQurbanPackages = pickRelatedQurbanPackages(periodPackages, qurbanPackage, 4);
  } catch (relatedError) {
    console.error('Failed to fetch related qurban packages:', relatedError);
  }

  // Generate JSON-LD
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const packageImageUrl = qurbanPackage.imageUrl ? getQurbanImageUrl(qurbanPackage.imageUrl) : null;
  const toAbsoluteUrl = (url: string) =>
    url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('qurbanDetail.breadcrumb.home'), url: appUrl },
    { name: t('qurbanDetail.breadcrumb.qurban'), url: `${appUrl}/qurban` },
    { name: qurbanPackage.name },
  ]);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: qurbanPackage.name,
    description:
      qurbanPackage.description?.substring(0, 160) ||
      t('qurbanDetail.metadata.descriptionFallback', { name: qurbanPackage.name }),
    ...(packageImageUrl && { image: toAbsoluteUrl(packageImageUrl) }),
    category: animalTypeLabel,
    offers: {
      '@type': 'Offer',
      price: qurbanPackage.price,
      priceCurrency: 'IDR',
      availability: (qurbanPackage.availableSlots > 0 || (qurbanPackage.stock - qurbanPackage.stockSold) > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
    isPartOf: {
      '@type': 'WebSite',
      name:
        settings.site_name ||
        settings.organization_name ||
        t('qurbanPage.defaults.organizationName'),
      url: appUrl,
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-3">
            <nav className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-primary-600">
                {t('qurbanDetail.breadcrumb.home')}
              </Link>
              <span>/</span>
              <Link href="/qurban" className="hover:text-primary-600">
                {t('qurbanDetail.breadcrumb.qurban')}
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium line-clamp-1">
                {qurbanPackage.name}
              </span>
            </nav>
          </div>
        </div>

        {/* Qurban Content */}
        <div className="container py-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Qurban Image */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                {qurbanPackage.imageUrl ? (
                  <img
                    src={getQurbanImageUrlByVariant(qurbanPackage.imageUrl, ['large', 'medium'])}
                    alt={qurbanPackage.name}
                    className="w-full aspect-video object-contain bg-gray-100"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <QurbanTabs
                packageId={qurbanPackage.id}
                packageDescription={qurbanPackage.description || ''}
                animalType={animalTypeLabel}
                packageType={qurbanPackage.packageType}
                periodName={qurbanPackage.periodName || ''}
              />
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <QurbanSidebar
                qurbanPackage={{
                  packagePeriodId: qurbanPackage.packagePeriodId,
                  id: qurbanPackage.id,
                  name: qurbanPackage.name,
                  animalType: qurbanPackage.animalType,
                  packageType: qurbanPackage.packageType,
                  price: qurbanPackage.price,
                  stock: qurbanPackage.stock,
                  stockSold: qurbanPackage.stockSold,
                  maxSlots: qurbanPackage.maxSlots,
                  slotsFilled: qurbanPackage.slotsFilled,
                  availableSlots: qurbanPackage.availableSlots,
                  periodId: qurbanPackage.periodId,
                  availablePeriods: qurbanPackage.availablePeriods || [],
                  ownerType: isMitraOwner ? 'mitra' : 'organization',
                  ownerName,
                  ownerLogoUrl,
                  ownerSlug,
                }}
                periods={periods}
                adminFeeCow={adminFeeCow}
                adminFeeGoat={adminFeeGoat}
                settings={settings}
              />
            </div>
          </div>

          {relatedQurbanPackages.length > 0 && (
            <section className="mt-10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('qurbanDetail.related.title')}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedQurbanPackages.map((pkg) => {
                  const { packageType, ...cardProps } = mapQurbanPackageToCardProps(
                    pkg,
                    settings.organization_name ||
                      settings.site_name ||
                      t('qurbanPage.defaults.organizationName'),
                    t('qurbanPage.badges.popular')
                  );
                  return <QurbanCard key={pkg.packagePeriodId} {...cardProps} />;
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer
        logo={settings.organization_logo || '/logo.svg'}
        organizationName={settings.organization_name || t('qurbanPage.defaults.organizationName')}
        organizationAbout={settings.organization_about}
        organizationAboutUrl={settings.organization_about_url}
        organizationAboutUrlLabel={settings.organization_about_url_label}
        phone={settings.organization_phone}
        whatsapp={settings.organization_whatsapp}
        email={settings.organization_email}
        address={fullAddress || settings.organization_detail_address}
        programLinks={footerProgramLinks}
      />
    </div>
  );
}
