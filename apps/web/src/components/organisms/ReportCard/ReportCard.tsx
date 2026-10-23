import Link from 'next/link';
import { getImageUrlByVariant } from '@/lib/image';
import {
  formatReportDate,
  formatReportDateShort,
  getReportReferenceColor,
  getReportReferenceLabel,
  stripReportHtml,
} from '@/lib/report-label';

export interface ReportCardData {
  id: string;
  slug: string;
  title: string;
  referenceName: string | null;
  referenceType: string;
  activityDate: string;
  description: string;
  gallery: string[] | null;
  provinceName: string | null;
  regencyName: string | null;
}

export interface ReportCardProps {
  report: ReportCardData;
}

/**
 * Kartu laporan kegiatan. Mobile (< md): baris ringkas (thumbnail persegi + judul + meta kecil);
 * md ke atas: kartu. Induknya wajib grid `divide-y md:divide-y-0 gap-0 md:gap-6`.
 */
export function ReportCard({ report }: ReportCardProps) {
  const thumbnail = report.gallery?.[0];
  const location = [report.regencyName, report.provinceName].filter(Boolean).join(', ');
  const shortLocation = report.regencyName || report.provinceName;

  return (
      <Link
          href={`/laporan/${report.slug}`}
        className="group flex items-center gap-3 py-3 md:block md:py-0 md:bg-white md:border md:border-gray-200 md:rounded-xl md:overflow-hidden md:hover:shadow-lg transition-shadow"
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 rounded-lg md:rounded-none md:w-auto md:h-auto md:aspect-video bg-gray-100 relative overflow-hidden">
          {thumbnail ? (
            <img
              src={getImageUrlByVariant(thumbnail, ['medium'])}
              alt={report.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <span className={`hidden md:block absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getReportReferenceColor(report.referenceType)}`}>
            {getReportReferenceLabel(report.referenceType)}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 md:p-4 md:space-y-2">
          <h3 className="text-base font-semibold leading-snug text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {report.title}
          </h3>
          {report.referenceName && (
            <p className="hidden md:block text-sm text-emerald-600 font-medium truncate">{report.referenceName}</p>
          )}
          <p className="hidden md:block text-sm text-gray-500 line-clamp-2">{stripReportHtml(report.description)}</p>
          <div className="flex items-center gap-1.5 md:gap-3 text-xs text-gray-500 md:text-gray-400 mt-1 md:mt-0 md:pt-1">
            <span className="flex-shrink-0 md:hidden">{formatReportDateShort(report.activityDate)}</span>
            <span className="hidden md:inline">{formatReportDate(report.activityDate)}</span>
            {location && (
              <>
                <span>·</span>
                <span className="truncate md:hidden">{shortLocation}</span>
                <span className="truncate hidden md:inline">{location}</span>
              </>
            )}
          </div>
        </div>
      </Link>
  );
}
