import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import { Button, ProgramBadge } from '@/components/atoms';
import { fetchCampaignBySlug, calculateDaysLeft, getImageUrl } from '@/services/campaigns';
import { fetchPublicSettings } from '@/services/settings';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import CampaignTabs from './CampaignTabs';
import CampaignSidebar from './CampaignSidebar';

interface CampaignPageProps {
  params: {
    slug: string;
  };
}

export default async function CampaignPage({ params }: CampaignPageProps) {
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

  // Map pillar/category to program type
  let programType: 'zakat' | 'qurban' | 'infaq' | 'wakaf' = 'infaq';
  const pillar = campaign.pillar?.toLowerCase() || '';
  const category = campaign.category?.toLowerCase() || '';

  if (pillar === 'zakat' || category === 'zakat') {
    programType = 'zakat';
  } else if (pillar === 'qurban' || category === 'qurban') {
    programType = 'qurban';
  } else if (pillar === 'wakaf' || category === 'wakaf') {
    programType = 'wakaf';
  } else if (category === 'sedekah' || category === 'infaq') {
    programType = 'infaq';
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-3">
            <nav className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-primary-600">
                Beranda
              </Link>
              <span>/</span>
              <Link href="/program" className="hover:text-primary-600">
                Program
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
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <img
                  src={getImageUrl(campaign.imageUrl)}
                  alt={campaign.title}
                  className="w-full aspect-video object-cover"
                />
              </div>

              {/* Tabs */}
              <CampaignTabs
                campaignId={campaign.id}
                campaignDescription={campaign.description || ''}
                donorCount={campaign.donorCount || 0}
              />
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <CampaignSidebar
                campaign={{
                  id: campaign.id,
                  slug: campaign.slug,
                  title: campaign.title,
                  category: campaign.category,
                  pillar: campaign.pillar,
                  organizationName: campaign.organizationName,
                  isVerified: campaign.isVerified,
                  collected: campaign.collected,
                  goal: campaign.goal,
                  donorCount: campaign.donorCount || 0,
                }}
                settings={settings}
                programType={programType}
                daysLeft={daysLeft}
                progressPercentage={progressPercentage}
              />
            </div>
          </div>
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
