'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getImageUrlByVariant } from '@/lib/image';
import { RenderContent } from '@/lib/render-content';

interface ReportDetail {
  id: string;
  slug: string;
  referenceType: string;
  referenceName: string | null;
  title: string;
  activityDate: string;
  description: string;
  gallery: string[] | null;
  videoUrl: string | null;
  typeSpecificData: Record<string, any> | null;
  publishedAt: string | null;
  detailAddress: string | null;
  provinceName: string | null;
  regencyName: string | null;
  districtName: string | null;
  villageName: string | null;
  creatorName: string | null;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getReferenceLabel(type: string) {
  switch (type) {
    case 'campaign': return 'Program';
    case 'zakat_period': return 'Zakat';
    case 'zakat_disbursement': return 'Penyaluran Zakat';
    case 'qurban_period': return 'Qurban';
    default: return 'Laporan';
  }
}

function getYoutubeEmbedUrl(url: string): string | null {
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
}

export default function LaporanDetailClient({ report }: { report: ReportDetail }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tsd = report.typeSpecificData || {};
  const gallery = report.gallery || [];
  const addressParts = [report.detailAddress, report.villageName, report.districtName, report.regencyName, report.provinceName].filter(Boolean);

  return (
    <>
      <article className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
              {getReferenceLabel(report.referenceType)}
            </span>
            <span className="text-sm text-gray-500">{formatDate(report.activityDate)}</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900">{report.title}</h1>
          {report.referenceName && (
            <p className="text-lg text-emerald-600 font-medium">{report.referenceName}</p>
          )}
        </div>

        {/* Location */}
        {addressParts.length > 0 && (
          <div className="flex items-start gap-2 text-gray-600">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>{addressParts.join(', ')}</p>
          </div>
        )}

        {/* Type-specific stats */}
        {(tsd.beneficiary_count > 0 || tsd.recipient_count > 0 || tsd.animals_by_type) && (
          <div className="bg-emerald-50 rounded-xl p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Ringkasan Kegiatan</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tsd.beneficiary_count > 0 && (
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{tsd.beneficiary_count.toLocaleString('id-ID')}</p>
                  <p className="text-sm text-gray-600">Penerima Manfaat</p>
                </div>
              )}
              {tsd.recipient_count > 0 && (
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{tsd.recipient_count.toLocaleString('id-ID')}</p>
                  <p className="text-sm text-gray-600">Penerima</p>
                </div>
              )}
              {tsd.animals_by_type?.kambing > 0 && (
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{tsd.animals_by_type.kambing}</p>
                  <p className="text-sm text-gray-600">Kambing</p>
                </div>
              )}
              {tsd.animals_by_type?.sapi > 0 && (
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{tsd.animals_by_type.sapi}</p>
                  <p className="text-sm text-gray-600">Sapi</p>
                </div>
              )}
              {tsd.animals_by_type?.domba > 0 && (
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{tsd.animals_by_type.domba}</p>
                  <p className="text-sm text-gray-600">Domba</p>
                </div>
              )}
              {tsd.total_recipients > 0 && (
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{tsd.total_recipients.toLocaleString('id-ID')}</p>
                  <p className="text-sm text-gray-600">Penerima Daging</p>
                </div>
              )}
            </div>
            {tsd.distribution_areas?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <p className="text-sm text-gray-600">Area Distribusi: <span className="font-medium text-gray-900">{tsd.distribution_areas.join(', ')}</span></p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <RenderContent html={report.description} className="prose prose-sm md:prose-base max-w-none text-gray-700 prose-img:rounded-lg prose-headings:text-gray-900" />
        </div>

        {/* Video */}
        {report.videoUrl && getYoutubeEmbedUrl(report.videoUrl) && (
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Video Kegiatan</h3>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
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

        {/* Gallery */}
        {gallery.length > 0 && (
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Galeri Foto</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
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

        {/* Footer meta */}
        <div className="border-t border-gray-200 pt-6 flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-gray-500 space-y-1">
            {report.creatorName && <p>Dibuat oleh: {report.creatorName}</p>}
            {report.publishedAt && <p>Dipublikasikan: {formatDate(report.publishedAt)}</p>}
          </div>
          <Link
            href="/laporan"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
          >
            Lihat Semua Laporan
          </Link>
        </div>
      </article>

      {/* Lightbox */}
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
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + gallery.length) % gallery.length); }}
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
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % gallery.length); }}
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
