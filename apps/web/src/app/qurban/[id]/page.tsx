import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import { fetchPackageDetail, fetchActivePeriods, getQurbanImageUrl } from '@/services/qurban';
import { fetchPublicSettings } from '@/services/settings';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';
import QurbanTabs from './QurbanTabs';
import QurbanSidebar from './QurbanSidebar';

interface QurbanPageProps {
  params: {
    id: string;
  };
}

export default async function QurbanPage({ params }: QurbanPageProps) {
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

  // Get admin fees from settings (convert to number to ensure proper calculation)
  const adminFeeCow = Number(settings.amil_qurban_sapi_fee) || 0;
  const adminFeeGoat = Number(settings.amil_qurban_perekor_fee) || 0;

  // Determine animal type label
  const animalTypeLabel = qurbanPackage.animalType === 'cow' ? 'Sapi' : 'Kambing';

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
              <Link href="/qurban" className="hover:text-primary-600">
                Qurban
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
                    src={getQurbanImageUrl(qurbanPackage.imageUrl)}
                    alt={qurbanPackage.name}
                    className="w-full aspect-video object-cover"
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
                }}
                periods={periods}
                adminFeeCow={adminFeeCow}
                adminFeeGoat={adminFeeGoat}
                settings={settings}
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
