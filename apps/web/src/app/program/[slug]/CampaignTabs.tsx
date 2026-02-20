'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { getImageUrlByVariant } from '@/lib/image';

interface Donation {
  id: string;
  donorName: string;
  isAnonymous: boolean;
  totalAmount: number;
  message: string | null;
  paidAt: string | null;
}

interface ActivityReport {
  id: string;
  title: string;
  description: string;
  activityDate: string;
  gallery: string[] | null;
  createdAt: string;
}

interface CampaignTabsProps {
  campaignId: string;
  campaignDescription: string;
  campaignVideoUrl?: string | null;
  donorCount: number;
  coordinatorName?: string;
}

export default function CampaignTabs({
  campaignId,
  campaignDescription,
  campaignVideoUrl,
  donorCount,
  coordinatorName,
}: CampaignTabsProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'detail' | 'updates' | 'donors' | 'partners'>('detail');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [activityReports, setActivityReports] = useState<ActivityReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [donationsPage, setDonationsPage] = useState(1);
  const [donationsTotalPages, setDonationsTotalPages] = useState(1);
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';

  // Fetch data when tabs are active
  useEffect(() => {
    if (activeTab === 'donors') {
      fetchDonations();
    } else if (activeTab === 'updates') {
      fetchActivityReports();
    }
  }, [activeTab, campaignId, donationsPage]);

  const fetchDonations = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
      const response = await fetch(`${API_URL}/campaigns/${campaignId}/donors?limit=20&page=${donationsPage}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setDonations(data.data);
        // Calculate total pages from total count if available
        if (data.pagination) {
          setDonationsTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityReports = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
      const response = await fetch(`${API_URL}/activity-reports/campaign/${campaignId}?limit=50`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setActivityReports(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFullDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
  };

  const getYoutubeEmbedUrl = (url?: string | null): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      let videoId = "";

      if (host.includes("youtu.be")) {
        videoId = parsed.pathname.replace("/", "").split("/")[0] || "";
      } else if (host.includes("youtube.com")) {
        videoId =
          parsed.searchParams.get("v") ||
          parsed.pathname.split("/embed/")[1]?.split("/")[0] ||
          parsed.pathname.split("/shorts/")[1]?.split("/")[0] ||
          "";
      }

      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    } catch {
      return null;
    }
  };

  const youtubeEmbedUrl = getYoutubeEmbedUrl(campaignVideoUrl);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Tabs Header */}
      <div className="border-b border-gray-200">
        <nav className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'detail'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t('campaignDetail.tabs.detail')}
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'updates'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t('campaignDetail.tabs.updates')}
          </button>
          <button
            onClick={() => setActiveTab('donors')}
            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'donors'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t('campaignDetail.tabs.donors')}
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
              {donorCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'partners'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t('campaignDetail.tabs.partners')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Detail Tab */}
        {activeTab === 'detail' && (
          <div className="space-y-6">
            <div
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: campaignDescription }}
            />
            {youtubeEmbedUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">{t('campaignDetail.tabs.videoTitle')}</h3>
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={t('campaignDetail.tabs.videoTitle')}
                    className="w-full h-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                {t('campaignDetail.tabs.coordinatorLabel')}{" "}
                <span className="font-medium text-gray-900">
                  {coordinatorName || t('campaignDetail.tabs.coordinatorUnset')}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 mt-4">{t('campaignDetail.tabs.loadingUpdates')}</p>
              </div>
            ) : activityReports.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                <p className="text-gray-600">{t('campaignDetail.tabs.noUpdates')}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {activityReports.map((report, index) => (
                  <div key={report.id} className="relative">
                    {/* Timeline line */}
                    {index !== activityReports.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                    )}

                    {/* Timeline content */}
                    <div className="flex gap-6">
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center relative z-10">
                        <svg
                          className="w-6 h-6 text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-8">
                        <div className="mb-2">
                          <time className="text-sm text-gray-500 font-medium">
                            {formatDate(report.activityDate)}
                          </time>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {report.title}
                        </h3>
                        <div
                          className="prose prose-gray max-w-none mb-4 text-gray-600"
                          dangerouslySetInnerHTML={{ __html: report.description }}
                        />

                        {/* Gallery */}
                        {report.gallery && report.gallery.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {report.gallery.map((imageUrl, imgIndex) => (
                              <div
                                key={imgIndex}
                                className="relative aspect-video rounded-lg overflow-hidden bg-gray-100"
                              >
                                  <img
                                  src={getImageUrlByVariant(imageUrl, ['large', 'medium'])}
                                  alt={t('campaignDetail.tabs.photoAlt', { title: report.title, number: imgIndex + 1 })}
                                  className="w-full h-full object-contain bg-gray-100"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Donors Tab */}
        {activeTab === 'donors' && (
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 mt-4">{t('campaignDetail.tabs.loadingDonors')}</p>
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-gray-600">{t('campaignDetail.tabs.noDonors')}</p>
              </div>
            ) : (
              <>
                {/* Donors List */}
                <div className="space-y-4">
                  {donations.map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-start justify-between pb-4 border-b border-gray-100 last:border-b-0"
                    >
                      {/* Left: Donor info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-primary-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-gray-900 mb-1" style={{ fontSize: '15px', fontWeight: 600 }}>
                              {donation.isAnonymous ? t('campaignDetail.tabs.anonymousDonor') : donation.donorName}
                            </h4>
                            <p className="text-gray-500" style={{ fontSize: '12px' }}>
                              {formatFullDate(donation.paidAt)}
                            </p>
                            {donation.message && (
                              <p className="text-gray-600 italic mt-2" style={{ fontSize: '15px', fontWeight: 400 }}>
                                &ldquo;{donation.message}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Donation amount */}
                      <div className="flex-shrink-0 text-right ml-4">
                        <div className="text-gray-500 mb-1" style={{ fontSize: '12px' }}>{t('campaignDetail.tabs.donationLabel')}</div>
                        <div className="mono text-primary-600" style={{ fontSize: '15px', fontWeight: 600 }}>
                          Rp {donation.totalAmount.toLocaleString(localeTag)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {donationsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setDonationsPage(prev => Math.max(1, prev - 1))}
                      disabled={donationsPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: donationsTotalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === donationsTotalPages ||
                            (page >= donationsPage - 1 && page <= donationsPage + 1)
                          );
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {/* Add ellipsis if there's a gap */}
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setDonationsPage(page)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                donationsPage === page
                                  ? 'bg-primary-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={() => setDonationsPage(prev => Math.min(donationsTotalPages, prev + 1))}
                      disabled={donationsPage === donationsTotalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Partners Tab */}
        {activeTab === 'partners' && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-600">{t('campaignDetail.tabs.noPartners')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
