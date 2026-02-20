import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { fetchPublicQurbanReport } from '@/services/public-reports';
import QurbanReportFilters from './QurbanReportFilters';

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount || 0);
}

function animalLabel(value: string) {
  const key = (value || '').toLowerCase();
  if (key === 'cow' || key === 'sapi') return 'Sapi';
  if (key === 'goat' || key === 'kambing') return 'Kambing';
  return value || '-';
}

interface PageProps {
  searchParams?: {
    periodId?: string;
    program?: string;
  };
}

export default async function PublicQurbanReportPage({ searchParams }: PageProps) {
  const periodId = searchParams?.periodId || '';
  const program = searchParams?.program || '';

  const data = await fetchPublicQurbanReport({
    periodId: periodId || undefined,
    program: program || undefined,
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <section className="py-10 bg-gradient-to-br from-amber-50 to-white border-b border-amber-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Laporan Qurban Publik</h1>
                  <p className="text-gray-600 mt-1">Ringkas, transparan, dan mudah dicek.</p>
                </div>
                <Link href="/qurban" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
                  Kembali ke Qurban
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-2 flex gap-2 text-sm font-medium overflow-x-auto">
                <span className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">Detail</span>
                <span className="px-4 py-2 rounded-lg text-gray-500 border border-transparent">Kabar Terbaru</span>
                <span className="px-4 py-2 rounded-lg text-gray-500 border border-transparent">Donatur</span>
                <span className="px-4 py-2 rounded-lg text-gray-500 border border-transparent">Mitra</span>
              </div>

              <QurbanReportFilters
                initialProgram={program}
                initialPeriodId={periodId}
                programOptions={data.filters.programs.map((item) => ({ value: item.key, label: item.label }))}
                periodOptions={data.filters.periods.map((item) => ({ value: item.id, label: item.name }))}
              />

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                  Tabel Laporan Qurban ({data.rows.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Tanggal</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Program</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Paket</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Hewan</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Periode</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-600">Donatur</th>
                        <th className="px-4 py-3 text-right text-sm text-gray-600">Jumlah</th>
                        <th className="px-4 py-3 text-right text-sm text-gray-600">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-sm text-gray-700">{row.paidAt ? new Date(row.paidAt).toLocaleString('id-ID') : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.programName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.packageName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{animalLabel(row.animalType)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.periodName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.donorName || 'Hamba Allah'}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{row.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-amber-700">Rp {formatRupiah(row.amount)}</td>
                        </tr>
                      ))}
                      {data.rows.length === 0 && (
                        <tr>
                          <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>Belum ada data pada filter ini</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
