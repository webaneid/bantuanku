'use client';

import { useState, useEffect } from 'react';
import { Header, Footer, ProgramCard } from '@/components/organisms';
import { fetchCampaigns, calculateDaysLeft, getImageUrl } from '@/services/campaigns';
import { fetchPublicSettings } from '@/services/settings';

// Helper function to map campaign to ProgramCard props
function mapCampaignToCardProps(campaign: any) {
  // Use categoryName from API response (already enriched by backend)
  const categoryName = campaign.categoryName || 'Program';

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    image: getImageUrl(campaign.imageUrl),
    categoryName,
    currentAmount: campaign.collected || 0,
    targetAmount: campaign.goal || 0,
    donorCount: campaign.donorCount || 0,
    daysLeft: calculateDaysLeft(campaign.endDate) ?? undefined,
    isUrgent: campaign.isUrgent || false,
  };
}

export default function WakafPage() {
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Page settings state
  const [pageTitle, setPageTitle] = useState("Program Wakaf");
  const [pageDescription, setPageDescription] = useState("Salurkan wakaf Anda untuk aset produktif yang memberikan manfaat berkelanjutan");

  const itemsPerPage = 12;

  useEffect(() => {
    const loadCampaigns = async () => {
      setIsLoading(true);
      try {
        // Fetch all active campaigns
        const response = await fetchCampaigns({
          status: 'active',
          limit: 1000,
        });

        const allCampaignsData = response.data || [];

        // Filter campaigns with pillar = "Wakaf"
        const wakafCampaigns = allCampaignsData.filter(
          (campaign: any) => campaign.pillar?.toLowerCase() === 'wakaf'
        );

        setAllCampaigns(wakafCampaigns);
      } catch (error) {
        console.error('Failed to fetch wakaf campaigns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  // Fetch page settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchPublicSettings();

        if (settings.frontend_wakaf_page) {
          const wakafPage = JSON.parse(settings.frontend_wakaf_page);
          if (wakafPage.title) setPageTitle(wakafPage.title);
          if (wakafPage.description) setPageDescription(wakafPage.description);
        }
      } catch (error) {
        console.error('Failed to fetch wakaf page settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Calculate pagination
  const totalCampaigns = allCampaigns.length;
  const totalPages = Math.ceil(totalCampaigns / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = allCampaigns.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="py-12 bg-gradient-to-br from-violet-50 to-violet-100">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="section-title text-gray-900 mb-4">
                {pageTitle}
              </h1>
              <p className="section-description text-gray-600">
                {pageDescription}
              </p>
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section className="py-12 bg-gray-50">
          <div className="container">
            <div className="mb-8">
              <h2 className="section-title text-gray-900">
                Program Wakaf
              </h2>
              <p className="section-description text-gray-600">
                {totalCampaigns > 0
                  ? `${totalCampaigns} program wakaf tersedia`
                  : 'Memuat program wakaf...'}
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-20">
                <div className="loading-spinner"></div>
                <p className="text-gray-500 mt-4">Memuat program...</p>
              </div>
            ) : currentCampaigns.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentCampaigns.map((campaign) => (
                    <ProgramCard
                      key={campaign.id}
                      {...mapCampaignToCardProps(campaign)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination__btn pagination__btn--prev"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="pagination__text">Sebelumnya</span>
                    </button>

                    <div className="pagination__numbers">
                      {getPageNumbers().map((page, index) => (
                        typeof page === 'number' ? (
                          <button
                            key={index}
                            className={`pagination__number ${currentPage === page ? 'pagination__number--active' : ''}`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        ) : (
                          <span key={index} className="pagination__ellipsis">
                            {page}
                          </span>
                        )
                      ))}
                    </div>

                    <button
                      className="pagination__btn pagination__btn--next"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <span className="pagination__text">Selanjutnya</span>
                      <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Belum Ada Program Wakaf
                </h3>
                <p className="text-gray-600">
                  Saat ini belum ada program wakaf yang tersedia. Silakan cek kembali nanti.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Info Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="section-title text-gray-900 mb-6 text-center">
                Apa itu Wakaf?
              </h2>
              <div className="max-w-none mb-4">
                <p className="section-description text-gray-600 mb-4">
                  Wakaf adalah perbuatan hukum wakif untuk memisahkan dan/atau menyerahkan sebagian harta benda miliknya
                  untuk dimanfaatkan selamanya atau untuk jangka waktu tertentu sesuai dengan kepentingannya guna keperluan
                  ibadah dan/atau kesejahteraan umum menurut syariah.
                </p>
                <p className="section-description text-gray-600">
                  Berbeda dengan sedekah biasa, wakaf memiliki manfaat yang berkelanjutan (jariyah). Harta yang diwakafkan
                  tidak berkurang nilainya, bahkan dapat terus bertumbuh dan memberikan manfaat untuk generasi mendatang.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-violet-50 rounded-lg p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-500 text-white rounded-full mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="section-title text-gray-900 mb-2">Berkelanjutan</h3>
                  <p className="section-description text-gray-600">Manfaat terus mengalir meski Anda telah tiada</p>
                </div>

                <div className="bg-violet-50 rounded-lg p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-500 text-white rounded-full mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="section-title text-gray-900 mb-2">Produktif</h3>
                  <p className="section-description text-gray-600">Aset terus berkembang dan memberikan hasil</p>
                </div>

                <div className="bg-violet-50 rounded-lg p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-500 text-white rounded-full mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="section-title text-gray-900 mb-2">Bermanfaat</h3>
                  <p className="section-description text-gray-600">Membantu banyak orang dan masyarakat luas</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
