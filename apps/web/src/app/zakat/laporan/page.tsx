import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { fetchPublicZakatReport } from '@/services/public-reports';
import ZakatReportFilters from './ZakatReportFilters';

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount || 0);
}

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
      <main className="min-h-screen bg-gray-50">
        <section className="py-10 bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Laporan Zakat Publik</h1>
                  <p className="text-gray-600 mt-1">Ringkas, transparan, dan mudah dicek.</p>
                </div>
                <Link href="/zakat" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
                  Kembali ke Zakat
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto space-y-4">
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

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                  {tab === 'titipan'
                    ? `Tabel Titipan Zakat (${titipanData.rows.length})`
                    : `Tabel Laporan Kegiatan Zakat (${titipanData.activities.length})`}
                </div>
                <div className="overflow-x-auto">
                  {tab === 'titipan' ? (
                    <table className="w-full min-w-[860px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Tanggal</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Mitra/Program</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Campaign/Jenis Zakat</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Periode</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Donatur</th>
                          <th className="px-4 py-3 text-right text-sm text-gray-600">Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {titipanData.rows.map((row) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-sm text-gray-700">{row.paidAt ? new Date(row.paidAt).toLocaleString('id-ID') : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.programName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.zakatTypeName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.periodName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.donorName || 'Hamba Allah'}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">Rp {formatRupiah(row.amount)}</td>
                          </tr>
                        ))}
                        {titipanData.rows.length === 0 && (
                          <tr>
                            <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Belum ada data pada filter ini</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Tanggal Kegiatan</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Mitra/Program</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Jenis Zakat</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Periode</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-600">Judul Kegiatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {titipanData.activities.map((row) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-sm text-gray-700">{row.activityDate ? new Date(row.activityDate).toLocaleString('id-ID') : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.programName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.zakatTypeName || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.periodName || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.title}</td>
                          </tr>
                        ))}
                        {titipanData.activities.length === 0 && (
                          <tr>
                            <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>Belum ada laporan kegiatan pada filter ini</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
