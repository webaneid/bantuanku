'use client';

import { useState } from 'react';
import { getImageUrlByVariant } from '@/lib/image';
import { formatDate } from '@/lib/format';

interface ActivityRow {
  id: string;
  title: string;
  activityDate: string | null;
  referenceType: string;
  referenceId: string;
  periodId: string | null;
  periodName: string | null;
  programKey: string;
  programName: string;
}

interface ReportDetail {
  id: string;
  referenceType: string;
  referenceName: string | null;
  title: string;
  activityDate: string;
  description: string;
  gallery: string[] | null;
  videoUrl: string | null;
  typeSpecificData: Record<string, any> | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  detailAddress: string | null;
  provinceName: string | null;
  regencyName: string | null;
  districtName: string | null;
  villageName: string | null;
  creatorName: string | null;
}

const getYoutubeEmbedUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
      videoId = u.searchParams.get('v');
    } else if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.split('/embed/')[1];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
};


const ITEMS_PER_PAGE = 10;

export default function QurbanActivityTable({ activities }: { activities: ActivityRow[] }) {
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const paginatedActivities = activities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const openDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
      const response = await fetch(`${API_URL}/activity-reports/${id}`);
      const data = await response.json();
      if (data.success && data.data) {
        setSelectedReport(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch report detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedReport(null);
    setLightboxIndex(null);
  };

  const report = selectedReport;
  const tsd = report?.typeSpecificData || {};
  const addressParts = report
    ? [report.detailAddress, report.villageName, report.districtName, report.regencyName, report.provinceName].filter(Boolean)
    : [];
  const gallery = report?.gallery || [];

  return (
    <>
      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal Kegiatan</th>
              <th>Mitra/Program</th>
              <th>Periode</th>
              <th>Judul Kegiatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedActivities.map((row, index) => (
              <tr key={row.id}>
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td>
                  {row.activityDate ? formatDate(row.activityDate) : '-'}
                </td>
                <td>{row.programName}</td>
                <td>{row.periodName || '-'}</td>
                <td>{row.title}</td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="action-btn action-view"
                      onClick={() => openDetail(row.id)}
                      title="Lihat Detail"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {activities.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  Belum ada laporan kegiatan pada filter ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {paginatedActivities.map((row, index) => (
          <div key={row.id} className="table-card">
            <div className="table-card-header">
              <div className="table-card-header-left">
                <div className="table-card-header-title">{row.title}</div>
                <div className="table-card-header-subtitle">{row.programName}</div>
              </div>
              <span className="table-card-header-badge bg-primary-50 text-primary-700">
                #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
              </span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Tanggal</span>
              <span className="table-card-row-value">
                {row.activityDate ? formatDate(row.activityDate) : '-'}
              </span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Periode</span>
              <span className="table-card-row-value">{row.periodName || '-'}</span>
            </div>
            <div className="table-card-footer">
              <button
                type="button"
                className="action-btn action-view"
                onClick={() => openDetail(row.id)}
                title="Lihat Detail"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Belum ada laporan kegiatan pada filter ini
          </div>
        )}
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
                <span key={index} className="pagination__ellipsis">{page}</span>
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

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[1100] bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-3">Memuat detail...</p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {report && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center px-4" onClick={closeDetail}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">Detail Laporan Kegiatan</h2>
              <button
                type="button"
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">{report.title}</h3>

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Tanggal Kegiatan</span>
                <p className="text-gray-900 mt-1">{formatDate(report.activityDate)}</p>
              </div>

              {addressParts.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Lokasi Kegiatan</span>
                  <p className="text-gray-900 mt-1">{addressParts.join(', ')}</p>
                </div>
              )}

              {(tsd.beneficiary_count > 0 || tsd.recipient_count > 0 || tsd.animals_by_type) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tsd.beneficiary_count > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Jumlah Penerima Manfaat</span>
                        <p className="font-semibold text-gray-900">{tsd.beneficiary_count}</p>
                      </div>
                    )}
                    {tsd.recipient_count > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Jumlah Penerima</span>
                        <p className="font-semibold text-gray-900">{tsd.recipient_count}</p>
                      </div>
                    )}
                    {tsd.distribution_areas?.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Area Distribusi</span>
                        <p className="font-semibold text-gray-900">{tsd.distribution_areas.join(', ')}</p>
                      </div>
                    )}
                  </div>
                  {tsd.animals_by_type && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      {tsd.animals_by_type.kambing > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Kambing</span>
                          <p className="font-semibold text-gray-900">{tsd.animals_by_type.kambing}</p>
                        </div>
                      )}
                      {tsd.animals_by_type.sapi > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Sapi</span>
                          <p className="font-semibold text-gray-900">{tsd.animals_by_type.sapi}</p>
                        </div>
                      )}
                      {tsd.animals_by_type.domba > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Domba</span>
                          <p className="font-semibold text-gray-900">{tsd.animals_by_type.domba}</p>
                        </div>
                      )}
                      {tsd.total_recipients > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Penerima Daging</span>
                          <p className="font-semibold text-gray-900">{tsd.total_recipients}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Deskripsi Kegiatan</span>
                <div
                  className="prose prose-gray max-w-none mt-2 text-gray-700"
                  dangerouslySetInnerHTML={{ __html: report.description }}
                />
              </div>

              {report.videoUrl && getYoutubeEmbedUrl(report.videoUrl) && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Video</span>
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-black mt-2">
                    <iframe
                      src={getYoutubeEmbedUrl(report.videoUrl)!}
                      title={report.title}
                      className="w-full h-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {gallery.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Gallery Foto</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    {gallery.map((url, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
                      >
                        <img
                          src={getImageUrlByVariant(url, ['medium'])}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(report.creatorName || report.publishedAt) && (
                <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
                  {report.creatorName && <p>Dibuat oleh: {report.creatorName}</p>}
                  {report.publishedAt && <p>Dipublikasikan: {formatDate(report.publishedAt)}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxIndex !== null && gallery.length > 0 && (
        <div
          className="fixed inset-0 z-[1200] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {gallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex - 1 + gallery.length) % gallery.length);
              }}
              className="absolute left-4 text-white/80 hover:text-white z-10"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <img
            src={gallery[lightboxIndex]}
            alt={`Gallery ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {gallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % gallery.length);
              }}
              className="absolute right-4 text-white/80 hover:text-white z-10"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="absolute bottom-4 text-white/70 text-sm">
            {lightboxIndex + 1} / {gallery.length}
          </div>
        </div>
      )}
    </>
  );
}
