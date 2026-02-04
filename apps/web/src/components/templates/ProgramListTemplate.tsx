'use client';

import { useState, useEffect } from 'react';
import { ProgramCard } from '@/components/organisms';
import { fetchCampaigns, calculateDaysLeft, getImageUrl } from '@/services/campaigns';
import { fetchCategories } from '@/services/categories';
import Autocomplete from '@/components/Autocomplete';

// Helper function to map campaign to ProgramCard props
function mapCampaignToCardProps(campaign: any) {
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

interface ProgramListTemplateProps {
  initialCategorySlug?: string;
  initialPillarSlug?: string;
  pageTitle?: string;
  pageDescription?: string;
  showCategoryFilter?: boolean;
}

export default function ProgramListTemplate({
  initialCategorySlug,
  initialPillarSlug,
  pageTitle = 'Semua Program',
  pageDescription = 'Pilih program yang ingin Anda dukung dan berbagi kebaikan untuk sesama',
  showCategoryFilter = true,
}: ProgramListTemplateProps) {
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pillars, setPillars] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const itemsPerPage = 12;

  // Fetch all campaigns and categories on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch campaigns
        const campaignsResponse = await fetchCampaigns({
          status: 'active',
          limit: 1000,
        });

        const campaignsData = campaignsResponse.data || [];
        setAllCampaigns(campaignsData);
        setFilteredCampaigns(campaignsData);

        // Fetch categories
        const categoriesResponse = await fetchCategories();
        const fetchedCategories = categoriesResponse.data || [];

        // Filter categories to only show those with campaigns
        const categoriesWithCampaigns = fetchedCategories.filter((category) => {
          const count = campaignsData.filter((c: any) => c.categoryId === category.id).length;
          return count > 0;
        });

        setCategories(categoriesWithCampaigns);

        // Fetch pillars from API
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
        const pillarsResponse = await fetch(`${API_URL}/pillars`);
        const pillarsData = await pillarsResponse.json();
        if (pillarsData.success && pillarsData.data) {
          // Filter pillars to only show those with campaigns
          const pillarsWithCampaigns = pillarsData.data.filter((pillar: any) => {
            const count = campaignsData.filter((c: any) =>
              c.pillar && c.pillar.toLowerCase() === pillar.slug.toLowerCase()
            ).length;
            return count > 0;
          });
          setPillars(pillarsWithCampaigns);
        }

        // Set initial category from slug if provided
        if (initialCategorySlug) {
          const matchingCategory = categoriesWithCampaigns.find(
            (cat: any) => cat.slug === initialCategorySlug
          );
          if (matchingCategory) {
            setSelectedCategory(matchingCategory.id);
          }
        }

        // Set initial pillar from slug if provided
        if (initialPillarSlug) {
          setSelectedPillar(initialPillarSlug);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [initialCategorySlug, initialPillarSlug]);

  // Filter campaigns when filters change
  useEffect(() => {
    let filtered = allCampaigns;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (campaign: any) => campaign.categoryId === selectedCategory
      );
    }

    // Filter by pillar (case-insensitive slug matching)
    if (selectedPillar !== 'all') {
      filtered = filtered.filter(
        (campaign: any) =>
          campaign.pillar &&
          campaign.pillar.toLowerCase() === selectedPillar.toLowerCase()
      );
    }

    // Filter by urgency
    if (selectedUrgency === 'urgent') {
      filtered = filtered.filter((campaign: any) => campaign.isUrgent);
    } else if (selectedUrgency === 'featured') {
      filtered = filtered.filter((campaign: any) => campaign.isFeatured);
    }

    // Filter by search query (search in title and description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (campaign: any) =>
          campaign.title?.toLowerCase().includes(query) ||
          campaign.description?.toLowerCase().includes(query)
      );
    }

    setFilteredCampaigns(filtered);
    setCurrentPage(1);
  }, [selectedCategory, selectedPillar, selectedUrgency, searchQuery, allCampaigns]);

  // Calculate pagination
  const totalCampaigns = filteredCampaigns.length;
  const totalPages = Math.ceil(totalCampaigns / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

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
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <>
      {/* Page Header */}
      <section className="py-12 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="section-title text-4xl font-bold text-gray-900 mb-4">
              {pageTitle}
            </h1>
            <p className="section-description text-lg text-gray-600">
              {pageDescription}
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      {showCategoryFilter && (
        <section className="category-filter-section py-8 bg-white border-b border-gray-200">
          <div className="container">
            <div className="category-filter">
              <button
                className={`category-filter__item ${selectedCategory === 'all' ? 'category-filter__item--active' : ''}`}
                onClick={() => handleCategoryChange('all')}
              >
                <span className="category-filter__label">Semua Program</span>
                <span className="category-filter__count">{allCampaigns.length}</span>
              </button>

              {categories.map((category) => {
                const count = allCampaigns.filter(c => c.categoryId === category.id).length;
                return (
                  <button
                    key={category.id}
                    className={`category-filter__item ${selectedCategory === category.id ? 'category-filter__item--active' : ''}`}
                    onClick={() => handleCategoryChange(category.id)}
                  >
                    <span className="category-filter__label">{category.name}</span>
                    <span className="category-filter__count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Additional Filters */}
      <section className="py-6 bg-gray-50 border-b border-gray-200">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Program
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari berdasarkan judul atau deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-lg bg-white text-gray-900 focus:border-primary-500 focus:outline-none transition-colors"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Pillar Filter */}
            {pillars.length > 0 && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Pilar
                </label>
                <Autocomplete
                  options={[
                    { value: 'all', label: 'Semua Pilar' },
                    ...pillars.map((pillar) => ({
                      value: pillar.slug,
                      label: pillar.name,
                    })),
                  ]}
                  value={selectedPillar}
                  onChange={(value) => setSelectedPillar(value)}
                  placeholder="Pilih Pilar"
                  allowClear={false}
                />
              </div>
            )}

            {/* Urgency Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Urgensi
              </label>
              <Autocomplete
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'urgent', label: 'Mendesak' },
                  { value: 'featured', label: 'Unggulan' },
                ]}
                value={selectedUrgency}
                onChange={(value) => setSelectedUrgency(value)}
                placeholder="Pilih Urgensi"
                allowClear={false}
              />
            </div>

            {/* Reset Filters Button */}
            {(selectedPillar !== 'all' || selectedUrgency !== 'all' || searchQuery) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedPillar('all');
                    setSelectedUrgency('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="loading-spinner"></div>
              <p className="text-gray-500 mt-4">Memuat program...</p>
            </div>
          ) : currentCampaigns.length > 0 ? (
            <>
              <div className="programs-grid">
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
            <div className="empty-state">
              <svg className="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="empty-state__title">Tidak ada program tersedia</h3>
              <p className="empty-state__description">
                Belum ada program untuk filter ini. Silakan pilih filter lain.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
