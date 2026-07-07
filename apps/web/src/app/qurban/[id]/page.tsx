import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import { QurbanCard } from '@/components/organisms/QurbanCard/QurbanCard';
import { fetchPackageDetail, fetchActivePeriods, fetchPackagesByPeriod, getQurbanImageUrl, getQurbanImageUrlByVariant } from '@/services/qurban';
import { fetchPublicSettings } from '@/services/settings';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import { fetchSeoSettings, generateBreadcrumbJsonLd, resolveOgImageUrl, toAbsoluteUrl as toAbsoluteSeoUrl } from '@/lib/seo';
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const siteName = settings.site_name || t('qurbanPage.defaults.organizationName');

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
    const ogImageUrl = resolveOgImageUrl(
      appUrl,
      [pkg.ogImageUrl, pkg.imageUrl ? getQurbanImageUrl(pkg.imageUrl) : null, settings.og_image],
      '/og'
    );

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
        site: settings.twitter_handle || '',
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const packageImageUrl = qurbanPackage.imageUrl ? getQurbanImageUrl(qurbanPackage.imageUrl) : null;
  const productImageUrl = toAbsoluteSeoUrl(appUrl, packageImageUrl);

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
    ...(productImageUrl && { image: productImageUrl }),
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
        {/* Breadcrumb — desktop only */}
        <div className="hidden lg:block">
          <Breadcrumb items={[
            { label: t('qurbanDetail.breadcrumb.home'), href: '/' },
            { label: t('qurbanDetail.breadcrumb.qurban'), href: '/qurban' },
            { label: qurbanPackage.name },
          ]} />
        </div>

        {/* Mobile: edge-to-edge image with back button */}
        <div className="lg:hidden relative">
          <a
            href="/qurban"
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div className="bg-white overflow-hidden">
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
        </div>

        {/* Mobile: Title + Price + Stock info */}
        <div className="lg:hidden bg-white px-4 py-4 space-y-3">
          <h1 className="text-xl font-bold text-gray-900">{qurbanPackage.name}</h1>
          <div className="text-2xl font-bold text-primary-600 mono">
            Rp {(qurbanPackage.price || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-sm text-gray-600">
            {qurbanPackage.packageType === 'individual'
              ? t('qurbanDetail.sidebar.pricePer', { unit: t('qurbanDetail.sidebar.unit.animal') })
              : t('qurbanDetail.sidebar.pricePer', { unit: t('qurbanDetail.sidebar.unit.slot') })}
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            {qurbanPackage.packageType === 'individual' ? (
              <div className="text-sm">
                <span className="text-gray-600">{t('qurbanDetail.sidebar.stock.available')}</span>{' '}
                <span className="font-semibold text-gray-900">
                  {t('qurbanDetail.sidebar.stock.value', {
                    remaining: qurbanPackage.stock - qurbanPackage.stockSold,
                    total: qurbanPackage.stock,
                  })}
                </span>
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-600">{t('qurbanDetail.sidebar.slot.available')}</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {t('qurbanDetail.sidebar.slot.value', { count: qurbanPackage.availableSlots })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t('qurbanDetail.sidebar.slot.maxPerAnimal')}</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {t('qurbanDetail.sidebar.slot.maxValue', { count: qurbanPackage.maxSlots || 0 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Order Section portal target */}
        <div id="mobile-qurban-order" className="lg:hidden"></div>

        {/* Qurban Content */}
        <div className="container py-4 lg:py-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Qurban Image — desktop only */}
              <div className="hidden lg:block bg-white rounded-lg overflow-hidden shadow-sm">
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
                mobileMetaContent={
                  <div className="space-y-4">
                    {/* Owner info */}
                    {ownerName && (
                      <div className="flex items-center gap-3">
                        {ownerLogoUrl && (
                          <img
                            src={getQurbanImageUrl(ownerLogoUrl) || '/logo.svg'}
                            alt={ownerName}
                            className="w-10 h-10 object-contain rounded-lg"
                          />
                        )}
                        <span className="text-sm font-medium text-gray-900">{ownerName}</span>
                      </div>
                    )}

                    {/* Package info card */}
                    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('qurbanDetail.tabs.labels.animalType')}</span>
                        <span className="font-medium text-gray-900">{animalTypeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('qurbanDetail.tabs.labels.packageType')}</span>
                        <span className="font-medium text-gray-900">
                          {qurbanPackage.packageType === 'individual'
                            ? t('qurbanDetail.tabs.values.packageIndividual')
                            : t('qurbanDetail.tabs.values.packageShared')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('qurbanDetail.tabs.labels.period')}</span>
                        <span className="font-medium text-gray-900">{qurbanPackage.periodName || '-'}</span>
                      </div>
                    </div>
                  </div>
                }
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
                  activeDiscount: qurbanPackage.activeDiscount || null,
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
