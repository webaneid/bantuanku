import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import { ProgramCard } from '@/components/organisms';
import { getImageUrl } from '@/lib/image';
import { calculateDaysLeft } from '@/services/campaigns';
import { fetchPublicSettings } from '@/services/settings';
import { fetchCompleteAddress, formatCompleteAddress } from '@/services/address';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface MitraPageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    tab?: string;
  };
}

function stripHtml(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchMitraProfile(slug: string) {
  const response = await fetch(`${API_URL}/mitra/${slug}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

export async function generateMetadata({ params }: MitraPageProps): Promise<Metadata> {
  const mitraData = await fetchMitraProfile(params.slug);

  if (!mitraData) {
    return { title: 'Mitra tidak ditemukan' };
  }

  return {
    title: `${mitraData.name} - Mitra Lembaga`,
    description: mitraData.description || `Profil mitra ${mitraData.name}`,
  };
}

export default async function MitraProfilePage({ params, searchParams }: MitraPageProps) {
  const mitraData = await fetchMitraProfile(params.slug);

  if (!mitraData) {
    notFound();
  }

  let settings: any = {
    organization_logo: '/logo.svg',
    organization_name: 'Bantuanku',
  };

  let fullAddress: string | undefined;
  let footerProgramLinks: Array<{ label: string; href: string }> = [];

  try {
    settings = await fetchPublicSettings();

    if (settings.organization_village_code) {
      const completeAddress = await fetchCompleteAddress(settings.organization_village_code);
      if (completeAddress && settings.organization_detail_address) {
        fullAddress = formatCompleteAddress(settings.organization_detail_address, completeAddress);
      }
    }

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
        // ignore
      }
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  }

  // Build mitra address
  let mitraAddress: string | undefined;
  if (mitraData.villageCode) {
    try {
      const completeAddress = await fetchCompleteAddress(mitraData.villageCode);
      if (completeAddress && mitraData.detailAddress) {
        mitraAddress = formatCompleteAddress(mitraData.detailAddress, completeAddress);
      } else if (mitraData.detailAddress) {
        mitraAddress = mitraData.detailAddress;
      }
    } catch {
      mitraAddress = mitraData.detailAddress || undefined;
    }
  } else {
    mitraAddress = mitraData.detailAddress || undefined;
  }

  const campaigns = mitraData.campaigns || [];
  const zakatTypes = mitraData.zakatTypes || [];
  const qurbanPackages = mitraData.qurbanPackages || [];
  const totalProgramItems = campaigns.length + zakatTypes.length + qurbanPackages.length;
  const rawTab = (searchParams?.tab || 'all').toLowerCase();
  const activeTab: 'all' | 'campaign' | 'zakat' | 'qurban' =
    rawTab === 'campaign' || rawTab === 'zakat' || rawTab === 'qurban' ? rawTab : 'all';

  // Format WhatsApp number for wa.me link
  const waNumber = mitraData.whatsappNumber
    ? mitraData.whatsappNumber.replace(/^0/, '62').replace(/[^0-9]/g, '')
    : null;

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
                {mitraData.name}
              </span>
            </nav>
          </div>
        </div>

        {/* Mitra Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-8">
            <div className="flex flex-col items-start gap-4">
              {/* Logo */}
              {mitraData.logoUrl ? (
                <div className="max-w-[20%]">
                  <img
                    src={getImageUrl(mitraData.logoUrl)}
                    alt={mitraData.name}
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{mitraData.name}</h1>
                    <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500">Mitra Lembaga</span>
                </div>

                {mitraData.description && (
                  <p className="text-sm text-gray-600">{stripHtml(mitraData.description)}</p>
                )}

                {/* Contact Info */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                  {mitraAddress && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{mitraAddress}</span>
                    </div>
                  )}

                  {mitraData.phone && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{mitraData.phone}</span>
                    </div>
                  )}

                  {waNumber && (
                    <a
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-green-600 hover:text-green-700"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Program Archive */}
        <div className="container py-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Arsip Program {mitraData.name} ({totalProgramItems})
          </h2>

          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { key: 'all', label: `All (${totalProgramItems})` },
              { key: 'campaign', label: `Campaign (${campaigns.length})` },
              { key: 'zakat', label: `Zakat (${zakatTypes.length})` },
              { key: 'qurban', label: `Qurban (${qurbanPackages.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={tab.key === 'all' ? `/mitra/${mitraData.slug}` : `/mitra/${mitraData.slug}?tab=${tab.key}`}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isActive
                      ? 'bg-primary-50 border-primary-200 text-primary-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-primary-200 hover:text-primary-700'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {totalProgramItems > 0 ? (
            <div className="space-y-10">
              {(activeTab === 'all' || activeTab === 'campaign') && campaigns.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Campaign ({campaigns.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign: any) => {
                      const endDate = campaign.endDate;
                      let daysLeft: number | undefined;
                      if (endDate) {
                        const dl = calculateDaysLeft(endDate);
                        if (dl !== null && dl > 0) daysLeft = dl;
                      }

                      return (
                        <ProgramCard
                          key={campaign.id}
                          id={campaign.id}
                          slug={campaign.slug}
                          title={campaign.title}
                          description={stripHtml(campaign.description || '')}
                          image={getImageUrl(campaign.imageUrl)}
                          categoryName={campaign.category || 'Program'}
                          currentAmount={campaign.collected || 0}
                          targetAmount={campaign.goal || 0}
                          donorCount={campaign.donorCount || 0}
                          daysLeft={daysLeft}
                          isUrgent={campaign.isUrgent}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'zakat') && zakatTypes.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Zakat ({zakatTypes.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zakatTypes.map((zakat: any) => (
                      <Link
                        key={zakat.id}
                        href={`/zakat/${zakat.slug}`}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition-colors"
                      >
                        <div className="aspect-[16/9] bg-gray-100">
                          {zakat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImageUrl(zakat.imageUrl)}
                              alt={zakat.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Zakat</div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-primary-600 font-medium mb-1">Program Zakat</p>
                          <h4 className="font-semibold text-gray-900 line-clamp-2">{zakat.name}</h4>
                          {zakat.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{stripHtml(zakat.description)}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'qurban') && qurbanPackages.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Qurban ({qurbanPackages.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {qurbanPackages.map((pkg: any) => (
                      <Link
                        key={pkg.packagePeriodId}
                        href={`/qurban/${pkg.packagePeriodId}`}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition-colors"
                      >
                        <div className="aspect-[16/9] bg-gray-100">
                          {pkg.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImageUrl(pkg.imageUrl)}
                              alt={pkg.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Qurban</div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs text-primary-600 font-medium">Program Qurban</p>
                            <span className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                              {pkg.animalType === 'cow' ? 'Sapi' : 'Kambing'}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 line-clamp-2">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{stripHtml(pkg.description)}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500">Belum ada program aktif (campaign, zakat, atau qurban) dari mitra ini</p>
            </div>
          )}

          {totalProgramItems > 0 && activeTab !== 'all' && (
            (activeTab === 'campaign' && campaigns.length === 0) ||
            (activeTab === 'zakat' && zakatTypes.length === 0) ||
            (activeTab === 'qurban' && qurbanPackages.length === 0)
          ) && (
            <div className="text-center py-12 text-gray-500">
              Tidak ada data pada kategori ini.
            </div>
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
