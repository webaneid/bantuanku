import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Header, Footer, ProgramCard } from '@/components/organisms';
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
    const toAbsoluteUrl = (url: string) =>
      url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;
    const campaignUrl = `${appUrl}/program/${campaign.slug}`;
    const imageUrl = getImageUrlByVariant(campaign.imageUrl, ['large', 'medium']);
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${appUrl}${imageUrl}`;

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
    const ogImageUrl = (campaign as any).ogImageUrl
      ? toAbsoluteUrl((campaign as any).ogImageUrl)
      : fullImageUrl || (settings.og_image ? toAbsoluteUrl(settings.og_image) : undefined);

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const imageUrl = getImageUrlByVariant(campaign.imageUrl, ['large', 'medium']);
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${appUrl}${imageUrl}`;

  const articleSchema: JsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: (campaign as any).metaTitle || campaign.title,
    description: (campaign as any).metaDescription || campaign.description?.substring(0, 160),
    image: (campaign as any).ogImageUrl
      ? ((campaign as any).ogImageUrl.startsWith('http') ? (campaign as any).ogImageUrl : `${appUrl}${(campaign as any).ogImageUrl}`)
      : fullImageUrl,
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
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-3">
            <nav className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-primary-600">
                {t('campaignDetail.breadcrumb.home')}
              </Link>
              <span>/</span>
              <Link href="/program" className="hover:text-primary-600">
                {t('campaignDetail.breadcrumb.program')}
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium line-clamp-1">
                {campaign.title}
              </span>
            </nav>
          </div>
        </div>

        {/* Campaign Content */}
        <div className="container py-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Campaign Image */}
              <CampaignGallery
                featuredImage={campaign.imageUrl}
                galleryImages={campaignGalleryImages}
                altText={campaign.title}
              />

              {/* Tabs */}
              <CampaignTabs
                campaignId={campaign.id}
                campaignDescription={campaign.content || campaign.description || ''}
                campaignVideoUrl={campaign.videoUrl}
                donorCount={campaign.donorCount || 0}
                coordinatorName={campaign.coordinatorName}
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
