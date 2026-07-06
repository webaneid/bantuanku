import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import { getImageUrl } from '@/lib/image';
import { fetchSeoSettings, generateBreadcrumbJsonLd, resolveOgImageUrl } from '@/lib/seo';
import { fetchCampaigns } from '@/services/campaigns';
import { fetchZakatTypes } from '@/services/zakat';
import { fetchActivePeriods, fetchPackagesByPeriod, getAnimalTypeLabel, getQurbanImageUrl } from '@/services/qurban';
import LaporanDetailClient from './LaporanDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

function slugifyReportTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function inferCanonicalReportUrl(appUrl: string, report: any, currentSlug: string): string {
  if (report?.canonicalUrl) {
    return report.canonicalUrl.startsWith('http')
      ? report.canonicalUrl
      : `${appUrl}${report.canonicalUrl.startsWith('/') ? report.canonicalUrl : `/${report.canonicalUrl}`}`;
  }

  const titleSlug = slugifyReportTitle(report?.title || '');
  const duplicateSuffixPattern = new RegExp(`^${titleSlug}-(?:\\d+|[a-z0-9]{4,12})$`);

  if (titleSlug && duplicateSuffixPattern.test(currentSlug)) {
    return `${appUrl}/laporan/${titleSlug}`;
  }

  return `${appUrl}/laporan/${currentSlug}`;
}

function getSquareVariantUrl(imageUrl: string): string {
  const [pathname, query = ''] = imageUrl.split('?');
  const squarePath = pathname.replace(/-(thumbnail|medium|large|square|original)\.webp$/i, '-square.webp');
  return query ? `${squarePath}?${query}` : squarePath;
}

function getZakatTypeLabel(calculatorType?: string | null): string {
  switch ((calculatorType || '').toLowerCase()) {
    case 'fitrah': return 'Zakat Fitrah';
    case 'maal': return 'Zakat Maal';
    case 'income': return 'Zakat Penghasilan';
    case 'trade': return 'Zakat Bisnis';
    case 'agriculture': return 'Zakat Pertanian';
    case 'livestock': return 'Zakat Peternakan';
    default: return 'Jenis Zakat';
  }
}

function sortSidebarCampaigns(items: any[]): any[] {
  return [...items].sort((a, b) => {
    const aGroup = a.isUrgent ? 0 : a.isFeatured ? 1 : 2;
    const bGroup = b.isUrgent ? 0 : b.isFeatured ? 1 : 2;
    if (aGroup !== bGroup) return aGroup - bGroup;
    const aNoDonor = (a.donorCount || 0) === 0 ? 0 : 1;
    const bNoDonor = (b.donorCount || 0) === 0 ? 0 : 1;
    if (aNoDonor !== bNoDonor) return aNoDonor - bNoDonor;
    if ((a.donorCount || 0) !== (b.donorCount || 0)) {
      return (a.donorCount || 0) - (b.donorCount || 0);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchReport(slug: string) {
  try {
    const res = await fetch(`${API_URL}/activity-reports/by-slug/${slug}`, {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    if (json.success && json.data) return json.data;
  } catch (err) {
    console.error('Failed to fetch report:', err);
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = await fetchReport(slug);
  if (!report) return { title: 'Laporan Tidak Ditemukan' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';
  let settings: Record<string, any> = {};
  try { settings = await fetchSeoSettings(); } catch {}
  const siteName = settings.site_name || 'Bantuanku';

  const seoTitle = report.metaTitle || report.title;
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').substring(0, 160);
  const seoDescription = report.metaDescription || stripHtml(report.description);
  const canonicalUrl = inferCanonicalReportUrl(appUrl, report, slug);

  // OG image: ogImageUrl > first gallery image > site default
  const ogImageUrl = resolveOgImageUrl(
    appUrl,
    [report.ogImageUrl, report.gallery?.[0] ? getImageUrl(report.gallery[0]) : null, settings.og_image],
    '/og'
  );

  const ogTitle = report.ogTitle || seoTitle;
  const ogDescription = report.ogDescription || seoDescription;
  const noIndex = Boolean(report.noIndex);
  const noFollow = Boolean(report.noFollow);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: canonicalUrl },
    robots: {
      index: !noIndex,
      follow: !noFollow,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'article',
      locale: 'id_ID',
      url: canonicalUrl,
      siteName,
      title: ogTitle,
      description: ogDescription,
      ...(report.publishedAt && { publishedTime: report.publishedAt }),
      images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: ogTitle }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function LaporanDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const report = await fetchReport(slug);

  if (!report) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';
  const canonicalUrl = inferCanonicalReportUrl(appUrl, report, slug);

  if (canonicalUrl !== `${appUrl}/laporan/${slug}`) {
    permanentRedirect(canonicalUrl);
  }

  // Fetch sidebar data
  let sidebarCampaigns: any[] = [];
  let sidebarZakat: any[] = [];
  let sidebarQurban: any[] = [];

  try {
    const [campaignsResponse, zakatTypes, periodsResponse] = await Promise.all([
      fetchCampaigns({ status: 'active', limit: 100 }),
      fetchZakatTypes(),
      fetchActivePeriods(),
    ]);

    const allCampaigns = Array.isArray(campaignsResponse?.data) ? campaignsResponse.data : [];
    sidebarCampaigns = sortSidebarCampaigns(allCampaigns).slice(0, 5);

    sidebarZakat = (Array.isArray(zakatTypes) ? zakatTypes : [])
      .filter((item: any) => item.isActive)
      .sort((a: any, b: any) => {
        if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        }
        return (a.name || '').localeCompare(b.name || '', 'id-ID');
      })
      .slice(0, 5);

    const periods = Array.isArray(periodsResponse?.data) ? periodsResponse.data : [];
    const activePeriod =
      periods.find((period: any) => String(period.status || '').toLowerCase() === 'active') || periods[0];

    if (activePeriod?.id) {
      const qurbanPackagesResponse = await fetchPackagesByPeriod(activePeriod.id);
      const packages = Array.isArray(qurbanPackagesResponse?.data) ? qurbanPackagesResponse.data : [];
      sidebarQurban = packages.slice(0, 5);
    }
  } catch (error) {
    console.error('Failed to load sidebar data:', error);
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Beranda', url: appUrl },
    { name: 'Laporan Kegiatan', url: `${appUrl}/laporan` },
    { name: report.title, url: `${appUrl}/laporan/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <Breadcrumb
            items={[
              { label: 'Beranda', href: '/' },
              { label: 'Laporan Kegiatan', href: '/laporan' },
              { label: report.title },
            ]}
          />
          <div className="container py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <LaporanDetailClient report={report} />
              </div>

              <aside className="lg:col-span-1">
                <div className="space-y-4 sticky top-24">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <h2 className="text-xl font-semibold text-gray-900">Program Lainnya</h2>
                      <Link href="/program" aria-label="Lihat semua program" className="text-gray-700 hover:text-primary-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                        </svg>
                      </Link>
                    </div>
                    <div className="pt-2 divide-y divide-gray-100">
                      {sidebarCampaigns.length === 0 ? (
                        <p className="py-3 text-sm text-gray-500">Belum ada program lain.</p>
                      ) : (
                        sidebarCampaigns.map((item: any) => {
                          const imageSquare = getSquareVariantUrl(getImageUrl(item.imageUrl));
                          return (
                            <Link key={item.id} href={`/program/${item.slug}`} className="flex items-start gap-3 py-3 group">
                              <img src={imageSquare} alt={item.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-500 capitalize line-clamp-1">{item.categoryName || item.category || 'Program'}</p>
                                <h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-600">{item.title}</h3>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <h2 className="text-xl font-semibold text-gray-900">Zakat Lainnya</h2>
                      <Link href="/zakat" aria-label="Lihat semua zakat" className="text-gray-700 hover:text-primary-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                        </svg>
                      </Link>
                    </div>
                    <div className="pt-2 divide-y divide-gray-100">
                      {sidebarZakat.length === 0 ? (
                        <p className="py-3 text-sm text-gray-500">Belum ada jenis zakat lain.</p>
                      ) : (
                        sidebarZakat.map((item: any) => {
                          const imageSquare = getSquareVariantUrl(getImageUrl(item.imageUrl));
                          return (
                            <Link key={item.id} href={`/zakat/${item.slug}`} className="flex items-start gap-3 py-3 group">
                              <img src={imageSquare} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-500 line-clamp-1">{getZakatTypeLabel(item.calculatorType)}</p>
                                <h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-600">{item.name}</h3>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <h2 className="text-xl font-semibold text-gray-900">Qurban Lainnya</h2>
                      <Link href="/qurban" aria-label="Lihat semua qurban" className="text-gray-700 hover:text-primary-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                        </svg>
                      </Link>
                    </div>
                    <div className="pt-2 divide-y divide-gray-100">
                      {sidebarQurban.length === 0 ? (
                        <p className="py-3 text-sm text-gray-500">Belum ada paket qurban lain.</p>
                      ) : (
                        sidebarQurban.map((item: any) => {
                          const imageSquare = getSquareVariantUrl(getQurbanImageUrl(item.imageUrl));
                          return (
                            <Link key={item.packagePeriodId || item.id} href={`/qurban/${item.packagePeriodId || item.id}`} className="flex items-start gap-3 py-3 group">
                              <img src={imageSquare} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-500 line-clamp-1">{getAnimalTypeLabel(item.animalType || '')}</p>
                                <h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-600">{item.name}</h3>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
