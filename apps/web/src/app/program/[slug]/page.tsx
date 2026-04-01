import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Header, Footer, ProgramCard, Breadcrumb } from '@/components/organisms';
import { fetchCampaignBySlug, fetchCampaigns, calculateDaysLeft, getImageUrl, getImageUrlByVariant } from '@/services/campaigns';
import { fetchPublicSettings } from '@/services/settings';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import { generateSiteMetadata, JsonLdScript, generateBreadcrumbJsonLd, fetchSeoSettings, type JsonLdArticle } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';
import CampaignTabs from './CampaignTabs';
import CampaignSidebar from './CampaignSidebar';
import CampaignGallery from './CampaignGallery';

interface CampaignPageProps {
  params: {
    slug: string;
  };
}

function normalizeCategory(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function shuffleArray<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function mapCampaignToCardProps(campaign: any, defaultCategoryLabel: string) {
  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description || '',
    image: getImageUrlByVariant(campaign.imageUrl, ['medium', 'thumbnail', 'large']),
    categoryName: campaign.categoryName || campaign.category || defaultCategoryLabel,
    currentAmount: campaign.collected || 0,
    targetAmount: campaign.goal || 0,
    donorCount: campaign.donorCount || 0,
    daysLeft: calculateDaysLeft(campaign.endDate) ?? undefined,
    isUrgent: campaign.isUrgent || false,
  };
}

function toAbsoluteUrl(appUrl: string, url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:")) return undefined;
  if (url.startsWith("http")) return url;
  return `${appUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function resolveCampaignOgImage(appUrl: string, candidates: Array<string | null | undefined>): string | undefined {
  for (const candidate of candidates) {
    const normalized = toAbsoluteUrl(appUrl, candidate);
    if (normalized) return normalized;
  }
  return undefined;
}

function pickRelatedCampaigns(allCampaigns: any[], currentCampaign: any, maxItems = 4): any[] {
  const currentCategory = normalizeCategory(currentCampaign.categoryName || currentCampaign.category);
  const pool = allCampaigns.filter((item) => item.id !== currentCampaign.id);
  const isPriority = (item: any) => Boolean(item.isFeatured || item.isUrgent);
  const itemCategory = (item: any) => normalizeCategory(item.categoryName || item.category);

  const sameCategoryPriority = shuffleArray(
    pool.filter((item) => isPriority(item) && itemCategory(item) === currentCategory)
  );
  const otherCategoryPriority = shuffleArray(
    pool.filter((item) => isPriority(item) && itemCategory(item) !== currentCategory)
  );

  const selected: any[] = [];
  const selectedIds = new Set<string>();

  const pushUnique = (items: any[]) => {
    for (const item of items) {
      if (selected.length >= maxItems) break;
      if (selectedIds.has(item.id)) continue;
      selected.push(item);
      selectedIds.add(item.id);
    }
  };

  // Rule 1 + 2
  pushUnique(sameCategoryPriority);
  pushUnique(otherCategoryPriority);

  // Rule 3 fallback: random dengan prioritas unggulan/mendesak
  if (selected.length < maxItems) {
    const remaining = pool.filter((item) => !selectedIds.has(item.id));
    const remainingPriority = shuffleArray(remaining.filter(isPriority));
    const remainingOthers = shuffleArray(remaining.filter((item) => !isPriority(item)));
    pushUnique(remainingPriority);
    pushUnique(remainingOthers);
  }

  return selected.slice(0, maxItems);
}

export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  try {
    const [campaign, settings] = await Promise.all([
      fetchCampaignBySlug(params.slug),
      fetchSeoSettings(),
    ]);
    const categoryLabel = campaign.categoryName || campaign.category || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';
    const campaignUrl = `${appUrl}/program/${campaign.slug}`;
    const featureImage = getImageUrlByVariant(campaign.imageUrl, ['large', 'medium']);

    // Per-entity SEO fields with fallback chains
    const title = (campaign as any).metaTitle || campaign.title;
    const description = (campaign as any).metaDescription || campaign.description?.substring(0, 160) || `Donasi untuk ${campaign.title}`;
    const canonical = (campaign as any).canonicalUrl || campaignUrl;

    // Keywords from focusKeyphrase or defaults
    const keywords = (campaign as any).focusKeyphrase
      ? (campaign as any).focusKeyphrase.split(',').map((k: string) => k.trim())
      : [categoryLabel, campaign.pillar, 'donasi', 'campaign'].filter((v): v is string => Boolean(v));

    // OG fields with fallback
    const ogTitle = (campaign as any).ogTitle || title;
    const ogDescription = (campaign as any).ogDescription || description;
    const ogImageUrl = resolveCampaignOgImage(appUrl, [
      (campaign as any).ogImageUrl,
      featureImage,
      settings.og_image,
      "/og-image.jpg",
    ]);

    // Robots
    const noIndex = (campaign as any).noIndex === true;
    const noFollow = (campaign as any).noFollow === true;

    return {
      title,
      description,
      keywords,
      alternates: { canonical },
      ...(noIndex || noFollow ? {
        robots: {
          index: !noIndex,
          follow: !noFollow,
        },
      } : {}),
      openGraph: {
        type: 'article',
        url: canonical,
        title: ogTitle,
        description: ogDescription,
        siteName: settings.site_name || 'Bantuanku',
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
  } catch (error) {
    return await generateSiteMetadata();
  }
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);

  // Fetch campaign by slug
  let campaign: any = null;

  try {
    campaign = await fetchCampaignBySlug(params.slug);
  } catch (error) {
    console.error('Failed to fetch campaign:', error);
    notFound();
  }

  // Fetch settings for footer
  let settings: any = {
    organization_logo: '/logo.svg',
    organization_name: 'Bantuanku',
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

  // Calculate campaign stats
  const daysLeft = calculateDaysLeft(campaign.endDate);
  const progressPercentage = campaign.goal
    ? Math.min((campaign.collected / campaign.goal) * 100, 100)
    : 0;
  const categoryLabel = campaign.categoryName || campaign.category || '';

  const campaignGalleryImages = Array.isArray(campaign.images)
    ? campaign.images
    : [];

  let relatedCampaigns: any[] = [];
  try {
    const campaignsResponse = await fetchCampaigns({ status: 'active', limit: 100 });
    const campaignsList = campaignsResponse.data || [];
    relatedCampaigns = pickRelatedCampaigns(campaignsList, campaign, 4);
  } catch (relatedError) {
    console.error('Failed to fetch related campaigns:', relatedError);
  }

  // Map pillar/category to program type
  let programType: 'zakat' | 'qurban' | 'infaq' | 'wakaf' = 'infaq';
  const pillar = campaign.pillar?.toLowerCase() || '';
  const category = categoryLabel.toLowerCase();

  if (pillar === 'zakat' || category === 'zakat') {
    programType = 'zakat';
  } else if (pillar === 'qurban' || category === 'qurban') {
    programType = 'qurban';
  } else if (pillar === 'wakaf' || category === 'wakaf') {
    programType = 'wakaf';
  } else if (category === 'sedekah' || category === 'infaq') {
    programType = 'infaq';
  }

  // Generate JSON-LD Schema for Campaign
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';
  const featureImage = getImageUrlByVariant(campaign.imageUrl, ['large', 'medium']);
  const schemaImage = resolveCampaignOgImage(appUrl, [
    (campaign as any).ogImageUrl,
    featureImage,
    settings.og_image,
    "/og-image.jpg",
  ]);

  const articleSchema: JsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: (campaign as any).metaTitle || campaign.title,
    description: (campaign as any).metaDescription || campaign.description?.substring(0, 160),
    ...(schemaImage ? { image: schemaImage } : {}),
    datePublished: campaign.createdAt,
    dateModified: campaign.updatedAt || campaign.createdAt,
    author: {
      '@type': 'Organization',
      name: settings.site_name || 'Bantuanku',
    },
    publisher: {
      '@type': 'Organization',
      name: settings.site_name || 'Bantuanku',
      logo: settings.organization_logo ? {
        '@type': 'ImageObject',
        url: settings.organization_logo.startsWith('http')
          ? settings.organization_logo
          : `${appUrl}${settings.organization_logo}`,
      } : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': (campaign as any).canonicalUrl || `${appUrl}/program/${campaign.slug}`,
    },
  };

  // Generate Breadcrumb Schema
  const breadcrumbSchema = generateBreadcrumbJsonLd([
    { name: t('campaignDetail.breadcrumb.home'), url: appUrl },
    { name: t('campaignDetail.breadcrumb.program'), url: `${appUrl}/program` },
    { name: campaign.title },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLdScript data={articleSchema} />
      <JsonLdScript data={breadcrumbSchema} />
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Breadcrumb — desktop only */}
        <div className="hidden lg:block">
          <Breadcrumb items={[
            { label: t('campaignDetail.breadcrumb.home'), href: '/' },
            { label: t('campaignDetail.breadcrumb.program'), href: '/program' },
            { label: campaign.title },
          ]} />
        </div>

        {/* Mobile: edge-to-edge gallery with back button */}
        <div className="lg:hidden relative">
          <a
            href="/program"
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <CampaignGallery
            featuredImage={campaign.imageUrl}
            galleryImages={campaignGalleryImages}
            altText={campaign.title}
          />
        </div>

        {/* Mobile: Title + Progress + Stats */}
        <div className="lg:hidden bg-white px-4 py-4 space-y-3">
          <h1 className="text-xl font-bold text-gray-900">{campaign.title}</h1>
          <div className="space-y-2">
            <span className="text-xl font-bold text-primary-600">
              Rp {(campaign.collected || 0).toLocaleString('id-ID')}
            </span>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{t('campaignDetail.sidebar.progress', { percent: progressPercentage.toFixed(1), target: (campaign.goal || 0).toLocaleString('id-ID') })}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{t('campaignDetail.sidebar.donors', { count: campaign.donorCount || 0 })}</span>
            </div>
            {daysLeft !== null && daysLeft > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('campaignDetail.sidebar.daysLeft', { days: daysLeft })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Amount Selector portal target */}
        <div id="mobile-amount-selector" className="lg:hidden"></div>

        {/* Campaign Content */}
        <div className="container py-4 lg:py-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Campaign Image — desktop only */}
              <div className="hidden lg:block">
                <CampaignGallery
                  featuredImage={campaign.imageUrl}
                  galleryImages={campaignGalleryImages}
                  altText={campaign.title}
                />
              </div>

              {/* Tabs */}
              <CampaignTabs
                campaignId={campaign.id}
                campaignDescription={campaign.content || campaign.description || ''}
                campaignVideoUrl={campaign.videoUrl}
                donorCount={campaign.donorCount || 0}
                coordinatorName={campaign.coordinatorName}
                ownerName={campaign.mitraName || campaign.organizationName || settings.organization_name}
                mobileMetaContent={
                  <div className="space-y-4">
                    {/* Mitra/Organization info */}
                    {(campaign.mitraName || campaign.organizationName || settings.organization_name) && (
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(
                            campaign.mitraLogoUrl || settings.organization_institution_logo || settings.organization_logo || '/logo.svg',
                            '/logo.svg'
                          )}
                          alt={campaign.mitraName || campaign.organizationName || settings.organization_name}
                          className="w-10 h-10 object-contain rounded-lg"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-900">
                            {campaign.mitraName || campaign.organizationName || settings.organization_name}
                          </span>
                          <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Meta card */}
                    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('campaignDetail.sidebar.meta.startDate')}</span>
                        <span className="font-medium text-gray-900">
                          {campaign.startDate
                            ? new Date(campaign.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('campaignDetail.sidebar.meta.pillar')}</span>
                        <span className="font-medium text-gray-900">{campaign.pillar || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('campaignDetail.sidebar.meta.category')}</span>
                        <span className="font-medium text-gray-900">{categoryLabel || '-'}</span>
                      </div>
                      {(campaign.isFeatured || campaign.isUrgent) && (
                        <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                          {campaign.isFeatured && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                              {t('campaignDetail.sidebar.badges.featured')}
                            </span>
                          )}
                          {campaign.isUrgent && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                              {t('campaignDetail.sidebar.badges.urgent')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <CampaignSidebar
                campaign={{
                  id: campaign.id,
                  slug: campaign.slug,
                  title: campaign.title,
                  category: categoryLabel,
                  pillar: campaign.pillar,
                  startDate: campaign.startDate,
                  isFeatured: campaign.isFeatured,
                  isUrgent: campaign.isUrgent,
                  organizationName: campaign.organizationName,
                  isVerified: campaign.isVerified,
                  collected: campaign.collected,
                  goal: campaign.goal,
                  donorCount: campaign.donorCount || 0,
                  mitraName: campaign.mitraName,
                  mitraSlug: campaign.mitraSlug,
                  mitraLogoUrl: campaign.mitraLogoUrl,
                }}
                settings={settings}
                programType={programType}
                daysLeft={daysLeft}
                progressPercentage={progressPercentage}
              />
            </div>
          </div>

          {relatedCampaigns.length > 0 && (
            <section className="mt-10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('campaignDetail.related.title')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedCampaigns.map((relatedCampaign) => (
                  <ProgramCard
                    key={relatedCampaign.id}
                    {...mapCampaignToCardProps(relatedCampaign, t('campaignDetail.defaultCategory'))}
                    variant="compact"
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer
        logo={settings.organization_logo || '/logo.svg'}
        organizationName={settings.organization_name || 'Bantuanku'}
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
