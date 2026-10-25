import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Header } from '@/components/organisms/Header';
import { Footer } from '@/components/organisms/Footer';
import { ProgramCard } from '@/components/organisms/ProgramCard';
import { HeroSlider, HeroSlide } from '@/components/organisms/HeroSlider';
import { FeaturedCarousel } from '@/components/organisms/FeaturedCarousel';
import { CategoryGrid } from '@/components/organisms/CategoryGrid';
import { QurbanSection } from '@/components/organisms/QurbanSection';
import { TestimonialSection } from '@/components/organisms/TestimonialSection';
import { Button, ProgramBadge } from '@/components/atoms';
import { fetchCampaigns, calculateDaysLeft, getImageUrlByVariant } from '@/services/campaigns';
import { fetchPublicSettings } from '@/services/settings';
import { fetchPublicStats } from '@/services/stats';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import { fetchActivePeriods, fetchPackagesByPeriod } from '@/services/qurban';
import { mapQurbanPackageToCardProps } from '@/lib/qurban-card';
import { fetchCategories } from '@/services/categories';
import { fetchSeoSettings, resolveOgImageUrl } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';
import { I18nNamespaces } from '@/lib/i18n/I18nNamespaces';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
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

  const siteName = settings.site_name || '';
  const siteTagline = settings.site_tagline || 'Platform Donasi Terpercaya';
  const title = seo.metaTitle || `${siteName} - ${siteTagline}`;
  const description = seo.metaDescription || settings.site_description || `Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf.`;
  const canonical = seo.canonicalUrl ? toAbsoluteUrl(seo.canonicalUrl) : appUrl;

  const keywords = seo.focusKeyphrase
    ? seo.focusKeyphrase.split(',').map((k: string) => k.trim())
    : (settings.site_keywords ? settings.site_keywords.split(',').map((k: string) => k.trim()) : []);

  const ogTitle = seo.ogTitle || title;
  const ogDescription = seo.ogDescription || description;
  const ogImageUrl = resolveOgImageUrl(appUrl, [seo.ogImageUrl, settings.og_image], '/og');

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
          url: '/page/tentang-kami',
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

  // Semua data dimulai sekaligus (paralel); blok di bawah hanya menunggu hasilnya.
  // `started` menandai promise sudah punya penangan supaya tidak jadi unhandled rejection
  // sebelum blok try yang menunggunya tercapai.
  const started = <T,>(promise: Promise<T>): Promise<T> => {
    promise.catch(() => {});
    return promise;
  };
  const activeCampaignsP = started(fetchCampaigns({ limit: 100, status: 'active' }));
  const statsP = started(fetchPublicStats());
  const categoriesP = started(fetchCategories());
  const settingsP = started(fetchPublicSettings());
  const addressP = started(
    settingsP.then((s: any) => (s?.organization_village_code ? fetchCompleteAddress(s.organization_village_code) : null))
  );
  const qurbanPackagesP = started(
    (async () => {
      const periods = (await fetchActivePeriods()).data || [];
      const perPeriod = await Promise.all(
        periods.map((period: any) =>
          fetchPackagesByPeriod(period.id)
            .then((res) => (res.data || []).map((pkg: any) => ({ ...pkg, __periodId: period.id, __periodName: period.name })))
            .catch((error) => {
              console.error(`Failed to fetch packages for period ${period.id}:`, error);
              return [] as any[];
            })
        )
      );
      return perPeriod.flat();
    })()
  );

  // Fetch latest 6 campaigns from API
  let campaigns: any[] = [];
  let urgentCampaign: any = null;
  let featuredAndUrgentCampaigns: any[] = [];

  try {
    const response = await activeCampaignsP;
    campaigns = [...(response.data || [])];

    // Sort by newest first (client-side sorting since API might not support it)
    campaigns = campaigns
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

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
    stats = await statsP;
  } catch (error) {
    console.error('Failed to fetch public stats:', error);
  }

  // Fetch qurban packages from active period
  let rawQurbanPackages: any[] = [];
  try {
    rawQurbanPackages = (await qurbanPackagesP).slice(0, 8);
  } catch (error) {
    console.error('Failed to fetch qurban packages:', error);
  }

  // Fetch categories from database (for campaign categorization)
  let allCategoriesForLookup: any[] = [];
  try {
    const categoriesResponse = await categoriesP;
    const dbCategories = categoriesResponse.data || [];

    // Store ALL categories for lookup (including inactive ones)
    allCategoriesForLookup = dbCategories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }

  // Menu kategori di bawah judul "Program": hanya kategori yang punya campaign aktif
  let programCategoryLinks: { id: string; name: string; slug: string }[] = [];
  try {
    const activeResponse = await activeCampaignsP;
    const activeCategoryIds = new Set((activeResponse.data || []).map((c: any) => c.categoryId).filter(Boolean));
    programCategoryLinks = allCategoriesForLookup
      .filter((cat: any) => cat.isActive !== false && activeCategoryIds.has(cat.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, localeTag))
      .map((cat: any) => ({ id: cat.id, name: cat.name, slug: cat.slug }));
  } catch (error) {
    console.error('Failed to fetch campaign categories:', error);
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
    organization_name: '',
  };

  let fullAddress: string | undefined;
  let footerProgramLinks: Array<{ label: string; href: string }> = [];
  // Tautan internal prioritas untuk crawler: ditampilkan lewat Footer (normalizedFooterProgramLinks), bukan section di beranda
  const crawlPriorityLinks = [
    { label: 'Program Donasi', href: '/program' },
    { label: 'Laporan Kegiatan', href: '/laporan' },
    { label: 'Tentang Kami', href: '/page/tentang-kami' },
    { label: 'Zakat', href: '/zakat' },
    { label: 'Qurban', href: '/qurban' },
    { label: 'Daftar Mitra', href: '/daftar-mitra' },
  ];

  try {
    settings = await settingsP;

    // Fetch complete address if village code exists
    if (settings.organization_village_code) {
      const completeAddress = await addressP;
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

  const normalizedFooterProgramLinks = Array.from(
    new Map(
      [...crawlPriorityLinks, ...footerProgramLinks].map((link) => [link.href, link])
    ).values()
  );

  const siteName = settings.site_name || '';

  // WebSite JSON-LD for homepage
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.site_name || '',
    url: appUrl,
    description: settings.site_description || 'Platform donasi online terpercaya',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${appUrl}/program?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const qurbanPackages = rawQurbanPackages.map((pkg) =>
    mapQurbanPackageToCardProps(pkg, {
      organizationName: settings.organization_name || settings.site_name || '',
      popularLabel: t('qurbanPage.badges.popular'),
      adminFeeCow: Number(settings.amil_qurban_sapi_fee) || 0,
      adminFeeGoat: Number(settings.amil_qurban_perekor_fee) || 0,
      periodId: pkg.__periodId || '',
      periodName: pkg.__periodName || '',
    })
  );

  return (
    <I18nNamespaces names={['home', 'qurbanPage', 'qurbanCard']}>
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

        {/* Featured Urgent Campaigns Carousel (section lengkap: teks kiri + kartu gelap kanan) */}
        {featuredAndUrgentCampaigns.length > 0 && (
          <FeaturedCarousel
            title={featuredSectionData.title}
            description={featuredSectionData.description}
            campaigns={featuredAndUrgentCampaigns
              .slice(0, featuredSectionData.limit)
              .map((campaign) => ({
                ...mapCampaign(campaign),
                // Varian large (900x498) = rasio crop media; kartu desktop ±340px (layar 2x)
                image: getImageUrlByVariant(campaign.imageUrl, ['large', 'medium']),
              }))}
          />
        )}

        {/* Our Programs */}
        <section className="programs-section py-16 bg-white">
          <div className="container">
            <div className="text-center mb-6">
              <h2 className="section-title text-gray-900">
                {programsSectionData.title}
              </h2>
              <p className="section-description text-gray-600">
                {programsSectionData.description}
              </p>
            </div>

            {programCategoryLinks.length > 0 && (
              <nav className="programs-nav" aria-label={programsSectionData.title}>
                <Link href="/program" className="programs-nav__link programs-nav__link--primary">
                  {t('home.programs.allPrograms')}
                </Link>
                {programCategoryLinks.map((cat) => (
                  <Link key={cat.id} href={`/program/kategori/${cat.slug}`} className="programs-nav__link">
                    {cat.name}
                  </Link>
                ))}
              </nav>
            )}

            {campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {campaigns.slice(0, programsSectionData.limit).map((campaign) => (
                  <ProgramCard
                    key={campaign.id}
                    {...mapCampaign(campaign)}
                  />
                ))}
              </div>
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

        {/* Qurban Packages — only show when packages exist */}
        {qurbanPackages.length > 0 && (
          <QurbanSection
            items={qurbanPackages}
            title={qurbanSectionData.title}
            description={qurbanSectionData.description}
          />
        )}

        {/* Stats */}
        <section className="funfact-section py-12 md:py-16 bg-white">
          <div className="container">
            <div className="relative overflow-hidden rounded-3xl bg-primary-600 p-6 text-white shadow-xl md:p-8 lg:p-10">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary-400/40 to-transparent"></div>
              <div className="relative z-10 pb-6">
                <h2 className="text-2xl font-bold md:text-3xl">{funfactSectionData.title}</h2>
                <p className="mt-1 text-primary-50">{funfactSectionData.description}</p>
              </div>
              <div className="relative z-10 grid grid-cols-2 gap-3 border-t border-white/15 pt-6 md:gap-4 lg:grid-cols-4">
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
                  <div key={item.id} className="funfact-section__item flex flex-col justify-between rounded-2xl bg-white/10 p-4 md:p-5 backdrop-blur-sm">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <svg className="h-6 w-6 text-accent-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                      </svg>
                    </div>
                    <div>
                      <div className="mono text-3xl font-bold tracking-tight md:text-4xl">{statValue}</div>
                      <div className="mt-1 text-sm font-semibold text-accent-300 md:text-base">{item.title}</div>
                      <p className="mt-0.5 text-xs text-primary-100 md:text-sm">{item.description}</p>
                    </div>
                  </div>
                );
              })}
              </div>
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

        {/* Testimonials */}
        <TestimonialSection locale={locale} />

        {/* CTA */}
        <section className="cta-section py-20 md:py-[5.4rem] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/10 rounded-full blur-3xl"></div>
          </div>

          <div className="container relative z-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
              <div>
                <h2 className="section-title text-white">
                  {ctaSectionData.title}
                </h2>
                <p className="mx-auto max-w-xl text-base leading-relaxed text-primary-100 md:text-lg">
                  {ctaSectionData.description}
                </p>
              </div>

              <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
                {ctaSectionData.buttons.map((button, index) => (
                  <Link key={index} href={button.url} className="w-full sm:w-auto">
                    {button.variant === 'primary' ? (
                      <Button size="lg" className="w-full sm:w-64 !bg-white !text-primary-700 hover:!bg-primary-50 font-bold shadow-lg shadow-black/10">
                        {button.text}
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="ml-2">
                          <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Button>
                    ) : (
                      <Button size="lg" variant="outline" className="w-full sm:w-64 !border-white !text-white hover:!bg-white hover:!text-primary-700 font-bold">
                        {button.text}
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="ml-2">
                          <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Button>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer
        logo={settings.organization_logo || '/logo.svg'}
        organizationName={settings.organization_name || ''}
        organizationAbout={settings.organization_about}
        organizationAboutUrl={settings.organization_about_url}
        organizationAboutUrlLabel={settings.organization_about_url_label}
        phone={settings.organization_phone}
        whatsapp={settings.organization_whatsapp}
        email={settings.organization_email}
        address={fullAddress || settings.organization_detail_address}
        programLinks={normalizedFooterProgramLinks}
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
    </I18nNamespaces>
  );
}
