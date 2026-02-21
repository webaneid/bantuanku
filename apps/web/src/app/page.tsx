import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Header,
  Footer,
  ProgramCard,
  HeroSlider,
  HeroSlide,
  FeaturedCarousel,
  CategoryGrid,
  QurbanSection,
} from '@/components/organisms';
import { Button, ProgramBadge } from '@/components/atoms';
import { fetchCampaigns, calculateDaysLeft, getImageUrlByVariant } from '@/services/campaigns';
import { fetchPublicSettings } from '@/services/settings';
import { fetchPublicStats } from '@/services/stats';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import { fetchActivePeriods, fetchPackagesByPeriod, getQurbanImageUrlByVariant } from '@/services/qurban';
import { fetchCategories } from '@/services/categories';
import { fetchSeoSettings, resolveOgImageUrl } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const toAbsoluteUrl = (url: string) =>
    url.startsWith('http') ? url : `${appUrl}${url.startsWith('/') ? url : `/${url}`}`;

  // Parse seo_page_home setting (JSON)
  let seo: Record<string, any> = {};
  try {
    if (settings.seo_page_home) {
      seo = typeof settings.seo_page_home === 'string'
        ? JSON.parse(settings.seo_page_home)
        : settings.seo_page_home;
    }
  } catch { }

  const siteName = settings.site_name || 'Bantuanku';
  const siteTagline = settings.site_tagline || 'Platform Donasi Terpercaya';
  const title = seo.metaTitle || `${siteName} - ${siteTagline}`;
  const description = seo.metaDescription || settings.site_description || `Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf.`;
  const canonical = seo.canonicalUrl ? toAbsoluteUrl(seo.canonicalUrl) : appUrl;

  const keywords = seo.focusKeyphrase
    ? seo.focusKeyphrase.split(',').map((k: string) => k.trim())
    : (settings.site_keywords ? settings.site_keywords.split(',').map((k: string) => k.trim()) : []);

  const ogTitle = seo.ogTitle || title;
  const ogDescription = seo.ogDescription || description;
  const ogImageUrl = resolveOgImageUrl(appUrl, [seo.ogImageUrl, settings.og_image], '/og-image.jpg');

  const noIndex = seo.noIndex === true || seo.noIndex === 'true';
  const noFollow = seo.noFollow === true || seo.noFollow === 'true';

  return {
    title: { absolute: title },
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

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

function getDefaultHeroSlides(t: TranslateFn): HeroSlide[] {
  return [
    {
      id: '1',
      title: t('home.hero.slides.education.title'),
      description: t('home.hero.slides.education.description'),
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&q=80',
      ctaText: t('home.hero.slides.education.cta'),
      ctaLink: '/program/bantuan-pendidikan',
    },
    {
      id: '2',
      title: t('home.hero.slides.zakat.title'),
      description: t('home.hero.slides.zakat.description'),
      image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80',
      ctaText: t('home.hero.slides.zakat.cta'),
      ctaLink: '/zakat',
    },
    {
      id: '3',
      title: t('home.hero.slides.qurban.title'),
      description: t('home.hero.slides.qurban.description'),
      image: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=1920&q=80',
      ctaText: t('home.hero.slides.qurban.cta'),
      ctaLink: '/qurban',
    },
  ];
}

function getDefaultSections(t: TranslateFn) {
  return {
    featuredSectionData: {
      title: t('home.featured.title'),
      description: t('home.featured.description'),
      limit: 6,
      sortBy: 'urgent' as const,
    },
    programsSectionData: {
      title: t('home.programs.title'),
      description: t('home.programs.description'),
      limit: 6,
      sortBy: 'created_date' as const,
    },
    funfactSectionData: {
      title: t('home.stats.title'),
      description: t('home.stats.description'),
      items: [
        { id: '1', key: 'donors' as const, title: t('home.stats.items.donors.title'), description: t('home.stats.items.donors.description') },
        { id: '2', key: 'campaigns' as const, title: t('home.stats.items.campaigns.title'), description: t('home.stats.items.campaigns.description') },
        { id: '3', key: 'disbursed' as const, title: t('home.stats.items.disbursed.title'), description: t('home.stats.items.disbursed.description') },
        { id: '4', key: 'partners' as const, title: t('home.stats.items.partners.title'), description: t('home.stats.items.partners.description') },
      ],
    },
    whyChooseUsSectionData: {
      title: t('home.whyChoose.title'),
      description: t('home.whyChoose.description'),
      items: [
        {
          id: '1',
          icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
          iconBgColor: 'primary' as const,
          title: t('home.whyChoose.items.trusted.title'),
          description: t('home.whyChoose.items.trusted.description'),
        },
        {
          id: '2',
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          iconBgColor: 'success' as const,
          title: t('home.whyChoose.items.easy.title'),
          description: t('home.whyChoose.items.easy.description'),
        },
        {
          id: '3',
          icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
          iconBgColor: 'info' as const,
          title: t('home.whyChoose.items.transparent.title'),
          description: t('home.whyChoose.items.transparent.description'),
        },
      ],
    },
    ctaSectionData: {
      title: t('home.cta.title'),
      description: t('home.cta.description'),
      buttons: [
        {
          text: t('home.cta.buttons.programs'),
          url: '/program',
          variant: 'primary' as const,
        },
        {
          text: t('home.cta.buttons.about'),
          url: '/tentang',
          variant: 'outline' as const,
        },
      ],
    },
    qurbanSectionData: {
      title: t('home.qurban.title'),
      description: t('home.qurban.description'),
    },
  };
}

// Categories are fetched from database and used as-is
// No hardcoded mapping needed

// Helper function to map qurban package to QurbanCard props
function mapQurbanPackageToCardProps(pkg: any) {
  return {
    id: pkg.packagePeriodId,
    slug: pkg.packagePeriodId,
    name: pkg.name,
    category: pkg.animalType === 'cow' ? ('sapi' as const) : ('kambing' as const),
    price: pkg.price,
    image: getQurbanImageUrlByVariant(pkg.imageUrl, ['medium', 'thumbnail', 'large']),
    description: pkg.description || undefined,
    badge: pkg.isFeatured ? 'Unggulan' : undefined,
  };
}

// Helper function to map campaign to ProgramCard props
function mapCampaignToCardProps(campaign: any, defaultCategoryName: string) {
  // Use categoryName from API response (already enriched by backend)
  const categoryName = campaign.categoryName || defaultCategoryName;

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    image: getImageUrlByVariant(campaign.imageUrl, ['medium', 'thumbnail', 'large']),
    categoryName,
    currentAmount: campaign.collected || 0,
    targetAmount: campaign.goal || 0,
    donorCount: campaign.donorCount || 0,
    daysLeft: calculateDaysLeft(campaign.endDate) ?? undefined,
    isUrgent: campaign.isUrgent || false,
  };
}

export default async function HomePage() {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const t: TranslateFn = (key, params) => translate(locale, key, params);
  const {
    featuredSectionData: defaultFeaturedSectionData,
    programsSectionData: defaultProgramsSectionData,
    funfactSectionData: defaultFunfactSectionData,
    whyChooseUsSectionData: defaultWhyChooseUsSectionData,
    ctaSectionData: defaultCtaSectionData,
    qurbanSectionData: defaultQurbanSectionData,
  } = getDefaultSections(t);
  const defaultProgramCategoryName = t('home.programs.defaultCategory');
  const mapCampaign = (campaign: any) => mapCampaignToCardProps(campaign, defaultProgramCategoryName);

  // Fetch latest 6 campaigns from API
  let campaigns: any[] = [];
  let urgentCampaign: any = null;
  let featuredAndUrgentCampaigns: any[] = [];

  try {
    const response = await fetchCampaigns({ limit: 20, status: 'active' });
    campaigns = response.data || [];

    // Sort by newest first (client-side sorting since API might not support it)
    campaigns = campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter featured and urgent campaigns for carousel
    featuredAndUrgentCampaigns = campaigns.filter(c => c.isFeatured || c.isUrgent);

    // Sort featured/urgent: urgent first, then featured, then by created date
    featuredAndUrgentCampaigns.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Find urgent campaign for featured section
    urgentCampaign = campaigns.find(c => c.isUrgent) || campaigns[0];
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
  }

  // Fetch public stats
  let stats = {
    totalDonors: 0,
    totalCampaigns: 0,
    totalDisbursed: 0,
    totalPartners: 0,
  };

  try {
    stats = await fetchPublicStats();
  } catch (error) {
    console.error('Failed to fetch public stats:', error);
  }

  // Fetch qurban packages from active period
  let qurbanPackages: any[] = [];
  try {
    const periodsResponse = await fetchActivePeriods();
    const periods = periodsResponse.data || [];

    if (periods.length > 0) {
      // Fetch packages from all active periods and combine them
      let allPackages: any[] = [];

      for (const period of periods) {
        try {
          const packagesResponse = await fetchPackagesByPeriod(period.id);
          const packages = packagesResponse.data || [];
          allPackages = [...allPackages, ...packages];
        } catch (error) {
          console.error(`Failed to fetch packages for period ${period.id}:`, error);
        }
      }

      // Map to QurbanCard props and limit to 8
      qurbanPackages = allPackages.slice(0, 8).map(mapQurbanPackageToCardProps);
    }
  } catch (error) {
    console.error('Failed to fetch qurban packages:', error);
  }

  // Fetch categories from database (for campaign categorization)
  let allCategoriesForLookup: any[] = [];
  try {
    const categoriesResponse = await fetchCategories();
    const dbCategories = categoriesResponse.data || [];

    // Store ALL categories for lookup (including inactive ones)
    allCategoriesForLookup = dbCategories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }

  // Service categories will be loaded from settings frontend_service_categories
  let serviceCategoriesData: any[] = [];

  // Fetch hero slides from settings
  let heroSlidesData: HeroSlide[] = getDefaultHeroSlides(t);
  let featuredSectionData = defaultFeaturedSectionData;
  let programsSectionData = defaultProgramsSectionData;
  let funfactSectionData = defaultFunfactSectionData;
  let whyChooseUsSectionData = defaultWhyChooseUsSectionData;
  let ctaSectionData = defaultCtaSectionData;
  let qurbanSectionData = defaultQurbanSectionData;

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

    // Parse hero slides
    if (settings.frontend_hero_slides) {
      const parsedSlides = JSON.parse(settings.frontend_hero_slides);
      if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
        heroSlidesData = parsedSlides;
      }
    }

    // Parse service categories from settings
    if (settings.frontend_service_categories) {
      const parsedCategories = JSON.parse(settings.frontend_service_categories);
      if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
        serviceCategoriesData = parsedCategories;
      }
    }

    // Map categories to footer program links
    if (serviceCategoriesData.length > 0) {
      footerProgramLinks = serviceCategoriesData.map((cat: any) => ({
        label: cat.name,
        href: cat.slug.startsWith('/') ? cat.slug : `/${cat.slug}`,
      }));
    }

    // Parse featured section
    if (settings.frontend_featured_section) {
      const parsedFeatured = JSON.parse(settings.frontend_featured_section);
      if (parsedFeatured) {
        featuredSectionData = parsedFeatured;
      }
    }

    // Parse programs section
    if (settings.frontend_programs_section) {
      const parsedPrograms = JSON.parse(settings.frontend_programs_section);
      if (parsedPrograms) {
        programsSectionData = parsedPrograms;
      }
    }

    // Parse funfact section
    if (settings.frontend_funfact_section) {
      const parsedFunfact = JSON.parse(settings.frontend_funfact_section);
      if (parsedFunfact) {
        funfactSectionData = parsedFunfact;
      }
    }

    // Parse why choose us section
    if (settings.frontend_why_choose_us_section) {
      const parsedWhyChooseUs = JSON.parse(settings.frontend_why_choose_us_section);
      if (parsedWhyChooseUs) {
        whyChooseUsSectionData = parsedWhyChooseUs;
      }
    }

    // Parse CTA section
    if (settings.frontend_cta_section) {
      const parsedCta = JSON.parse(settings.frontend_cta_section);
      if (parsedCta) {
        ctaSectionData = parsedCta;
      }
    }

    // Parse Qurban page section
    if (settings.frontend_qurban_page) {
      const parsedQurban = JSON.parse(settings.frontend_qurban_page);
      if (parsedQurban.title) qurbanSectionData.title = parsedQurban.title;
      if (parsedQurban.description) qurbanSectionData.description = parsedQurban.description;
    }
  } catch (error) {
    console.error('Failed to fetch frontend settings:', error);
  }

  // WebSite JSON-LD for homepage
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.site_name || 'Bantuanku',
    url: appUrl,
    description: settings.site_description || 'Platform donasi online terpercaya',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${appUrl}/program?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <Header />

      <main className="flex-1">
        {/* Hero Slider */}
        <HeroSlider slides={heroSlidesData} showNavigation={false} />

        {/* Program Categories */}
        <section className="categories-section py-12 bg-gray-50">
          <div className="container">
            <CategoryGrid categories={serviceCategoriesData} />
          </div>
        </section>

        {/* Featured Urgent Campaigns Carousel */}
        {featuredAndUrgentCampaigns.length > 0 && (
          <section className="py-16 bg-white">
            <div className="container">
              <div className="text-center mb-8">
                <h2 className="section-title text-gray-900">
                  {featuredSectionData.title}
                </h2>
                <p className="section-description text-gray-600">
                  {featuredSectionData.description}
                </p>
              </div>

              <div className="featured-carousel-wrapper">
                <FeaturedCarousel
                  campaigns={featuredAndUrgentCampaigns
                    .slice(0, featuredSectionData.limit)
                    .map(mapCampaign)
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* Our Programs */}
        <section className="programs-section py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="section-title text-gray-900">
                {programsSectionData.title}
              </h2>
              <p className="section-description text-gray-600">
                {programsSectionData.description}
              </p>
            </div>

            {campaigns.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-8">
                  {campaigns.slice(0, Math.min(3, programsSectionData.limit)).map((campaign) => (
                    <ProgramCard key={campaign.id} {...mapCampaign(campaign)} />
                  ))}
                </div>

                {campaigns.length > 3 && programsSectionData.limit > 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                    {campaigns.slice(3, programsSectionData.limit).map((campaign) => (
                      <ProgramCard key={campaign.id} {...mapCampaign(campaign)} variant="compact" />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('home.programs.empty')}</p>
              </div>
            )}

            <div className="text-center mt-12">
              <Link href="/program">
                <Button size="lg" variant="outline">
                  {t('home.programs.viewAll')}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7 4l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Qurban Packages */}
        <QurbanSection
          items={qurbanPackages}
          title={qurbanSectionData.title}
          description={qurbanSectionData.description}
        />

        {/* Stats */}
        <section className="funfact-section py-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white relative overflow-hidden rounded-xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="container relative z-10">
            <div className="text-center mb-4">
              <h2 className="section-title text-white">
                {funfactSectionData.title}
              </h2>
              <p className="section-description text-primary-50">
                {funfactSectionData.description}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
              {funfactSectionData.items.map((item) => {
                // Get stat value based on key
                let statValue: string = t('home.stats.defaultValue');
                if (item.key === 'donors') {
                  statValue = `${stats.totalDonors.toLocaleString(localeTag)}+`;
                } else if (item.key === 'campaigns') {
                  statValue = `${stats.totalCampaigns.toLocaleString(localeTag)}+`;
                } else if (item.key === 'disbursed') {
                  statValue = stats.totalDisbursed >= 1000000000
                    ? t('home.stats.disbursedBillion', { value: Math.floor(stats.totalDisbursed / 1000000000) })
                    : t('home.stats.disbursedMillion', { value: Math.floor(stats.totalDisbursed / 1000000) });
                } else if (item.key === 'partners') {
                  statValue = `${stats.totalPartners}+`;
                }

                // Get icon SVG path based on key
                let iconPath: string = '';
                if (item.key === 'donors') {
                  iconPath = 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
                } else if (item.key === 'campaigns') {
                  iconPath = 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10';
                } else if (item.key === 'disbursed') {
                  iconPath = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
                } else if (item.key === 'partners') {
                  iconPath = 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
                }

                return (
                  <div key={item.id} className="group relative">
                    <div className="absolute inset-0 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-sm transform transition-transform group-hover:scale-105"></div>
                    <div className="relative p-5 sm:p-6 md:p-8 text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center transform transition-transform group-hover:rotate-6">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                        </svg>
                      </div>
                      <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 mono">{statValue}</div>
                      <div className="text-sm sm:text-base md:text-lg text-primary-50 font-medium">{item.title}</div>
                      <p className="text-xs sm:text-sm text-primary-100 mt-1 sm:mt-2 hidden sm:block">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="why-choose-us-section py-16 bg-white">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="section-title text-gray-900">
                {whyChooseUsSectionData.title}
              </h2>
              <p className="section-description text-gray-600">
                {whyChooseUsSectionData.description}
              </p>
            </div>

            <div className={`grid grid-cols-2 ${whyChooseUsSectionData.items.length === 3 ? 'md:grid-cols-3' : whyChooseUsSectionData.items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-4`}>
              {whyChooseUsSectionData.items.map((item) => (
                <div key={item.id} className="text-center p-2 md:p-6 border border-gray-200 rounded-xl">
                  <div className={`w-14 h-14 mx-auto mb-4 bg-${item.iconBgColor}-100 rounded-full flex items-center justify-center`}>
                    <svg className={`w-10 h-10 text-${item.iconBgColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-t-xl">
          <div className="container text-center">
            <h2 className="text-[1.3rem] leading-[1.3] font-bold mb-2">
              {ctaSectionData.title}
            </h2>
            <p className="text-base leading-[1.4rem] text-gray-300 max-w-full mx-auto" style={{ marginBottom: '1rem' }}>
              {ctaSectionData.description}
            </p>
            <div className="flex gap-4 justify-center flex-wrap mt-4">
              {ctaSectionData.buttons.map((button, index) => (
                <Link key={index} href={button.url}>
                  {button.variant === 'primary' ? (
                    <Button size="lg" className="bg-primary-500 hover:bg-primary-600">
                      {button.text}
                    </Button>
                  ) : (
                    <Button size="lg" variant="outline" style={{ borderColor: 'white', color: 'white' }}>
                      {button.text}
                    </Button>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
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
        socialMedia={{
          facebook: settings.social_media_facebook,
          instagram: settings.social_media_instagram,
          youtube: settings.social_media_youtube,
          twitter: settings.social_media_twitter,
          linkedin: settings.social_media_linkedin,
          threads: settings.social_media_threads,
          tiktok: settings.social_media_tiktok,
        }}
      />
    </div>
  );
}
