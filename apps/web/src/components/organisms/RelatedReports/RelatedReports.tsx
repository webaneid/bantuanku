'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { ReportCard, type ReportCardData } from '@/components/organisms/ReportCard';

export interface RelatedReportsProps {
  /** related = dari referensi (campaign dsb.) yang sama; other = laporan terbaru lainnya */
  mode: 'related' | 'other';
  reports: ReportCardData[];
}

export function RelatedReports({ mode, reports }: RelatedReportsProps) {
  const { t } = useI18n();

  if (reports.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="related-reports-title">
      <div className="mb-2 md:mb-4 flex items-center justify-between gap-3">
        <h2 id="related-reports-title" className="text-xl md:text-2xl font-bold text-dark">
          {mode === 'related' ? t('laporanDetail.related.title') : t('laporanDetail.related.other')}
        </h2>
        <Link href="/laporan" className="text-sm font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap">
          {t('laporanDetail.related.viewAll')}
        </Link>
      </div>
      <div className="grid grid-cols-1 divide-y divide-gray-100 md:divide-y-0 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </section>
  );
}
