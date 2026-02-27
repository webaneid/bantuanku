import Link from 'next/link';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import { fetchPublicZakatReport } from '@/services/public-reports';
import ZakatReportFilters from './ZakatReportFilters';
import ZakatTitipanTable from './ZakatTitipanTable';
import ZakatActivityTable from './ZakatActivityTable';

interface PageProps {
  searchParams?: {
    tab?: string;
    periodId?: string;
    zakatTypeId?: string;
    program?: string;
  };
}

export default async function PublicZakatReportPage({ searchParams }: PageProps) {
  const tab = searchParams?.tab === 'kegiatan' ? 'kegiatan' : 'titipan';
  const periodId = searchParams?.periodId || '';
  const zakatTypeId = searchParams?.zakatTypeId || '';
  const program = searchParams?.program || '';

  const buildTabHref = (nextTab: 'titipan' | 'kegiatan') => {
    const params = new URLSearchParams();
    params.set('tab', nextTab);
    if (program) params.set('program', program);
    if (zakatTypeId) params.set('zakatTypeId', zakatTypeId);
    if (periodId) params.set('periodId', periodId);
    return `/zakat/laporan?${params.toString()}`;
  };

  const titipanData = await fetchPublicZakatReport({
    periodId: periodId || undefined,
    zakatTypeId: zakatTypeId || undefined,
    program: program || undefined,
  });

  return (
    <>
      <Header />
      <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Zakat', href: '/zakat' }, { label: 'Laporan' }]} />
      <main className="min-h-screen bg-gray-50">
        <section className="py-10 bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="section-title text-gray-900">Laporan Zakat Publik</h1>
                <p className="section-description text-gray-600 mt-1">Ringkas, transparan, dan mudah dicek.</p>
              </div>
              <Link href="/zakat" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
                Kembali ke Zakat
              </Link>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="container mx-auto px-4 space-y-4">
              <ZakatReportFilters
                tab={tab}
                initialProgram={program}
                initialZakatTypeId={zakatTypeId}
                initialPeriodId={periodId}
                programOptions={titipanData.filters.programs.map((item) => ({ value: item.key, label: item.label }))}
                zakatTypeOptions={titipanData.filters.types.map((item) => ({ value: item.id, label: item.name }))}
                periodOptions={titipanData.filters.periods.map((item) => ({ value: item.id, label: item.name }))}
              />

              <div className="bg-white border border-gray-200 rounded-xl p-2 flex gap-2 text-sm font-medium overflow-x-auto">
                <Link
                  href={buildTabHref('titipan')}
                  className={`px-4 py-2 rounded-lg border ${tab === 'titipan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
                >
                  Titipan Zakat
                </Link>
                <Link
                  href={buildTabHref('kegiatan')}
                  className={`px-4 py-2 rounded-lg border ${tab === 'kegiatan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
                >
                  Laporan Kegiatan
                </Link>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {tab === 'titipan'
                    ? `Tabel Titipan Zakat (${titipanData.rows.length})`
                    : `Tabel Laporan Kegiatan Zakat (${titipanData.activities.length})`}
                </h3>
                {tab === 'titipan' ? (
                  <ZakatTitipanTable rows={titipanData.rows} />
                ) : (
                  <ZakatActivityTable activities={titipanData.activities} />
                )}
              </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
