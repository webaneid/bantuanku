import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import { getImageUrlByVariant } from '@/lib/image';
import { fetchSeoSettings, resolveOgImageUrl } from '@/lib/seo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface Report {
  id: string;
  slug: string;
  title: string;
  referenceName: string | null;
  referenceType: string;
  activityDate: string;
  description: string;
  gallery: string[] | null;
  publishedAt: string | null;
  provinceName: string | null;
  regencyName: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { page?: string };
}): Promise<Metadata> {
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const settings = await fetchSeoSettings();
  const siteName = settings.site_name || '';
  const canonical = `${appUrl}/laporan`;
  const title = page > 1
    ? `Arsip Laporan Kegiatan - Halaman ${page} | ${siteName}`
    : `Arsip Laporan Kegiatan | ${siteName}`;
  const description = `Dokumentasi penyaluran donasi, zakat, qurban, dan kegiatan sosial ${siteName} yang dipublikasikan secara terbuka.`;
  const ogImageUrl = resolveOgImageUrl(appUrl, [settings.og_image], '/og');
  const isPaginated = page > 1;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: !isPaginated,
      follow: true,
      googleBot: {
        index: !isPaginated,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: 'Arsip Laporan Kegiatan',
      description,
      siteName,
      locale: 'id_ID',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Arsip Laporan Kegiatan' }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Arsip Laporan Kegiatan',
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

async function fetchReports(page: number = 1): Promise<{ data: Report[]; pagination: PaginationData }> {
  try {
    const res = await fetch(`${API_URL}/activity-reports?page=${page}&limit=12`, {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.error('Failed to fetch reports:', err);
  }
  return { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function pageHref(page: number) {
  return page <= 1 ? '/laporan' : `/laporan?page=${page}`;
}

/** Nomor halaman yang ditampilkan: pertama, terakhir, dan ±1 dari halaman aktif; celahnya jadi 'ellipsis'. */
function getPageItems(current: number, total: number): Array<number | 'ellipsis'> {
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === total || Math.abs(p - current) <= 1
  );
  const items: Array<number | 'ellipsis'> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push('ellipsis');
    items.push(p);
  });
  return items;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').substring(0, 150);
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

function getReferenceColor(type: string) {
  switch (type) {
    case 'campaign': return 'bg-blue-50 text-blue-700';
    case 'zakat_period':
    case 'zakat_disbursement': return 'bg-emerald-50 text-emerald-700';
    case 'qurban_period': return 'bg-amber-50 text-amber-700';
    default: return 'bg-gray-50 text-gray-700';
  }
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  // Nilai tidak valid (abc, 0, negatif) jatuh ke halaman 1
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);
  const { data: reports, pagination } = await fetchReports(page);

  // Halaman di luar jangkauan (mis. ?page=99): arahkan ke halaman terakhir, bukan "belum ada laporan"
  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    redirect(pageHref(pagination.totalPages));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Laporan Kegiatan' }]} />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-10 bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100">
          <div className="container mx-auto px-4">
            <h1 className="section-title text-gray-900">Arsip Laporan Kegiatan</h1>
            <p className="section-description text-gray-600 mt-1">
              Transparansi penyaluran donasi dan kegiatan sosial yang telah dilaksanakan.
            </p>
          </div>
        </section>

        {/* Reports Grid */}
        <section className="py-4 md:py-8">
          <div className="container mx-auto px-[15px] md:px-4">
            {reports.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-lg">Belum ada laporan kegiatan yang dipublikasikan.</p>
              </div>
            ) : (
              <>
                {/* Mobile: daftar ringkas (thumbnail persegi + judul + meta kecil). md ke atas: grid kartu. */}
                <div className="grid grid-cols-1 divide-y divide-gray-100 md:divide-y-0 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6">
                  {reports.map((report) => {
                    const thumbnail = report.gallery?.[0];
                    const location = [report.regencyName, report.provinceName].filter(Boolean).join(', ');
                    const shortLocation = report.regencyName || report.provinceName;

                    return (
                      <Link
                        key={report.id}
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
                          <span className={`hidden md:block absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getReferenceColor(report.referenceType)}`}>
                            {getReferenceLabel(report.referenceType)}
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
                          <p className="hidden md:block text-sm text-gray-500 line-clamp-2">{stripHtml(report.description)}</p>
                          <div className="flex items-center gap-1.5 md:gap-3 text-xs text-gray-500 md:text-gray-400 mt-1 md:mt-0 md:pt-1">
                            <span className="flex-shrink-0 md:hidden">{formatDateShort(report.activityDate)}</span>
                            <span className="hidden md:inline">{formatDate(report.activityDate)}</span>
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
                  })}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <nav className="pagination" aria-label="Paginasi laporan kegiatan">
                    {page > 1 ? (
                      <Link href={pageHref(page - 1)} rel="prev" className="pagination__btn pagination__btn--prev" aria-label="Halaman sebelumnya">
                        <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="pagination__text">Sebelumnya</span>
                      </Link>
                    ) : (
                      <span className="pagination__btn pagination__btn--prev opacity-50 cursor-not-allowed" aria-disabled="true">
                        <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="pagination__text">Sebelumnya</span>
                      </span>
                    )}

                    {/* Mobile: ringkas "Halaman X dari N" (deretan nomor tidak muat) */}
                    <span className="sm:hidden px-2 text-sm text-gray-600">
                      Halaman {page} dari {pagination.totalPages}
                    </span>

                    {/* sm ke atas: deretan nomor halaman */}
                    <div className="hidden sm:block">
                      <div className="pagination__numbers">
                        {getPageItems(page, pagination.totalPages).map((item, idx) =>
                          item === 'ellipsis' ? (
                            <span key={`e${idx}`} className="pagination__ellipsis">…</span>
                          ) : (
                            <Link
                              key={item}
                              href={pageHref(item)}
                              aria-label={`Halaman ${item}`}
                              aria-current={item === page ? 'page' : undefined}
                              className={`pagination__number ${item === page ? 'pagination__number--active' : ''}`}
                            >
                              {item}
                            </Link>
                          )
                        )}
                      </div>
                    </div>

                    {page < pagination.totalPages ? (
                      <Link href={pageHref(page + 1)} rel="next" className="pagination__btn pagination__btn--next" aria-label="Halaman berikutnya">
                        <span className="pagination__text">Selanjutnya</span>
                        <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="pagination__btn pagination__btn--next opacity-50 cursor-not-allowed" aria-disabled="true">
                        <span className="pagination__text">Selanjutnya</span>
                        <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
