import Link from 'next/link';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import { fetchPublicQurbanReport } from '@/services/public-reports';
import QurbanReportFilters from './QurbanReportFilters';
import QurbanPenerimaanTable from './QurbanPenerimaanTable';
import QurbanPenyaluranTable from './QurbanPenyaluranTable';
import QurbanPenyembelihanTable from './QurbanPenyembelihanTable';
import QurbanActivityTable from './QurbanActivityTable';

interface PageProps {
  searchParams?: {
    tab?: string;
    periodId?: string;
    program?: string;
  };
}

export default async function PublicQurbanReportPage({ searchParams }: PageProps) {
  const validTabs = ['penerimaan', 'penyaluran', 'penyembelihan', 'kegiatan'] as const;
  type Tab = typeof validTabs[number];
  const tab: Tab = validTabs.includes(searchParams?.tab as Tab) ? (searchParams!.tab as Tab) : 'penerimaan';
  const periodId = searchParams?.periodId || '';
  const program = searchParams?.program || '';

  const hasFilter = !!periodId;

  const buildTabHref = (nextTab: Tab) => {
    const params = new URLSearchParams();
    params.set('tab', nextTab);
    if (program) params.set('program', program);
    if (periodId) params.set('periodId', periodId);
    return `/qurban/laporan?${params.toString()}`;
  };

  const data = await fetchPublicQurbanReport({
    periodId: periodId || undefined,
    program: program || undefined,
  });

  const tabItems: { key: Tab; label: string; count?: number }[] = [
    { key: 'penerimaan', label: 'Penerimaan', count: data.rows.length },
    { key: 'penyaluran', label: 'Penyaluran', count: data.disbursements.length },
    { key: 'penyembelihan', label: 'Penyembelihan', count: data.executions.length },
    { key: 'kegiatan', label: 'Laporan Kegiatan', count: data.activities.length },
  ];

  const totalDisbursed = data.disbursements.reduce((sum, d) => sum + d.amount, 0);

  return (
    <>
      <Header />
      <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Qurban', href: '/qurban' }, { label: 'Laporan' }]} />
      <main className="min-h-screen bg-gray-50">
        <section className="py-10 bg-gradient-to-br from-amber-50 to-white border-b border-amber-100">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="section-title text-gray-900">Laporan Qurban Publik</h1>
                <p className="section-description text-gray-600 mt-1">Ringkas, transparan, dan mudah dicek.</p>
              </div>
              <Link href="/qurban" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
                Kembali ke Qurban
              </Link>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="container mx-auto px-4 space-y-4">
              <QurbanReportFilters
                tab={tab}
                initialProgram={program}
                initialPeriodId={periodId}
                programOptions={data.filters.programs.map((item) => ({ value: item.key, label: item.label }))}
                periodOptions={data.filters.periods.map((item) => ({ value: item.id, label: item.name }))}
              />

              {!hasFilter ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <div className="text-4xl mb-4">🐄🐐</div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Pilih Periode Terlebih Dahulu</h2>
                  <p className="text-gray-500 text-sm">Silakan pilih periode qurban pada filter di atas untuk melihat laporan.</p>
                </div>
              ) : (
                <>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">🐐</div>
                        <div>
                          <p className="text-sm text-gray-500">Total Kambing</p>
                          <p className="text-2xl font-bold text-gray-900">{data.stats.totalGoats}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-2xl">🐄</div>
                        <div>
                          <p className="text-sm text-gray-500">Total Sapi</p>
                          <p className="text-2xl font-bold text-gray-900">{data.stats.totalCows}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-white border border-gray-200 rounded-xl p-2 flex gap-2 text-sm font-medium overflow-x-auto">
                    {tabItems.map((t) => (
                      <Link
                        key={t.key}
                        href={buildTabHref(t.key)}
                        className={`px-4 py-2 rounded-lg border whitespace-nowrap ${tab === t.key ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
                      >
                        {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
                      </Link>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4">
                    {tab === 'penerimaan' && (
                      <>
                        <h3 className="font-semibold text-gray-900 mb-4">
                          Tabel Penerimaan Qurban ({data.rows.length})
                        </h3>
                        <QurbanPenerimaanTable rows={data.rows} />
                      </>
                    )}

                    {tab === 'penyaluran' && (
                      <>
                        <h3 className="font-semibold text-gray-900 mb-4">
                          Tabel Penyaluran Qurban ({data.disbursements.length})
                        </h3>
                        <QurbanPenyaluranTable rows={data.disbursements} totalDisbursed={totalDisbursed} />
                      </>
                    )}

                    {tab === 'penyembelihan' && (
                      <>
                        <h3 className="font-semibold text-gray-900 mb-4">
                          Tabel Penyembelihan Qurban ({data.executions.length})
                        </h3>
                        <QurbanPenyembelihanTable rows={data.executions} />
                      </>
                    )}

                    {tab === 'kegiatan' && (
                      <>
                        <h3 className="font-semibold text-gray-900 mb-4">
                          Tabel Laporan Kegiatan Qurban ({data.activities.length})
                        </h3>
                        <QurbanActivityTable activities={data.activities} />
                      </>
                    )}
                  </div>
                </>
              )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
