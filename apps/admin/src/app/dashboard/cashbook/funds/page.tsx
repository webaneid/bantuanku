"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import ReportFilters from "@/components/reports/ReportFilters";
import { formatRupiah } from "@/lib/format";
import { FUND_LABEL, qs, useCashbookRange } from "@/lib/cashbook";

type Program = { fund: string; masuk: number; hakPihakLain: number; disalurkan: number; sisa: number; rincian: Array<{ detail: string | null; masuk: number; hakPihakLain: number }> };

export default function CashbookFundsPage() {
  const { startDate, endDate, setStartDate, setEndDate } = useCashbookRange();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cashbook", "funds", startDate, endDate],
    queryFn: async () => (await api.get(`/admin/cashbook/funds?${qs({ startDate, endDate })}`)).data?.data,
  });
  const program: Program[] = data?.program || [];
  const nonProgram: Array<{ fund: string; keluar: number }> = data?.nonProgram || [];
  const identitas = data?.identitas;
  const totals = program.reduce(
    (t, p) => ({ masuk: t.masuk + p.masuk, hak: t.hak + p.hakPihakLain, disalurkan: t.disalurkan + p.disalurkan, sisa: t.sisa + p.sisa }),
    { masuk: 0, hak: 0, disalurkan: 0, sisa: 0 }
  );

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Dana per Sumber</h1>
        <p className="text-gray-600 mt-1">Dari mana uang berasal, berapa untuk pihak lain, berapa sudah disalurkan, dan berapa sisanya.</p>
        <p className="text-sm text-gray-500 mt-1">Sisa = masuk − hak pihak lain (amil, developer, mitra, influencer) − disalurkan. Sisa tetap menjadi sisa program.</p>
      </div>

      <ReportFilters allTimePreset startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
      {isError && <div className="card mb-6 border border-danger-200 bg-danger-50 text-sm text-danger-700">Gagal memuat laporan dana.</div>}

      <div className="card mb-6">
        {isLoading ? (
          <div className="animate-pulse h-32 bg-gray-100 rounded" />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Dana</th>
                  <th className="text-right">Masuk</th>
                  <th className="text-right">Hak pihak lain</th>
                  <th className="text-right">Disalurkan</th>
                  <th className="text-right">Sisa program</th>
                </tr>
              </thead>
              <tbody>
                {program.map((p) => (
                  <Fragment key={p.fund}>
                    <tr className="cursor-pointer hover:bg-light" onClick={() => setOpen(open === p.fund ? null : p.fund)}>
                      <td className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {p.rincian.length > 0 ? (open === p.fund ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5" />}
                          {FUND_LABEL[p.fund] || p.fund}
                        </span>
                      </td>
                      <td className="text-right mono">Rp {formatRupiah(p.masuk)}</td>
                      <td className="text-right mono text-gray-600">Rp {formatRupiah(p.hakPihakLain)}</td>
                      <td className="text-right mono text-gray-600">Rp {formatRupiah(p.disalurkan)}</td>
                      <td className="text-right mono font-semibold text-primary-700">Rp {formatRupiah(p.sisa)}</td>
                    </tr>
                    {open === p.fund &&
                      p.rincian.map((d, i) => (
                        <tr key={`${p.fund}-${i}`} className="bg-light">
                          <td className="pl-8 text-sm text-gray-600">{d.detail ? d.detail.replace(/_/g, " ") : "(tanpa rincian)"}</td>
                          <td className="text-right mono text-sm">Rp {formatRupiah(d.masuk)}</td>
                          <td className="text-right mono text-sm text-gray-600">Rp {formatRupiah(d.hakPihakLain)}</td>
                          <td className="text-right text-gray-400">-</td>
                          <td className="text-right text-gray-400">-</td>
                        </tr>
                      ))}
                  </Fragment>
                ))}
                <tr className="font-semibold border-t-2">
                  <td>Total dana program</td>
                  <td className="text-right mono">Rp {formatRupiah(totals.masuk)}</td>
                  <td className="text-right mono">Rp {formatRupiah(totals.hak)}</td>
                  <td className="text-right mono">Rp {formatRupiah(totals.disalurkan)}</td>
                  <td className="text-right mono text-primary-700">Rp {formatRupiah(totals.sisa)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">Penyaluran zakat dan qurban dihitung di tingkat dana (belum terpetakan ke jenis/paket tertentu).</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-dark mb-3">Pengeluaran non-program</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nonProgram.map((n) => (
            <div key={n.fund} className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">{FUND_LABEL[n.fund] || n.fund}</p>
              <p className="text-xl font-bold mono mt-1">Rp {formatRupiah(n.keluar)}</p>
            </div>
          ))}
        </div>
      </div>

      {identitas && (
        <div className={`card border ${identitas.selisih === 0 ? "border-success-200 bg-success-50" : "border-warning-200 bg-warning-50"}`}>
          <p className={`font-semibold flex items-center gap-2 ${identitas.selisih === 0 ? "text-success-700" : "text-warning-700"}`}>
            {identitas.selisih === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {identitas.selisih === 0 ? "Angka konsisten dengan buku kas" : `Ada selisih Rp ${formatRupiah(identitas.selisih)}`}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Sirkulasi total Rp {formatRupiah(identitas.sirkulasiTotal)} = sisa program Rp {formatRupiah(identitas.sisaProgram)} + hak pihak lain yang masih di kas Rp {formatRupiah(identitas.hakTersisaDiKas)}.
          </p>
        </div>
      )}
    </div>
  );
}
