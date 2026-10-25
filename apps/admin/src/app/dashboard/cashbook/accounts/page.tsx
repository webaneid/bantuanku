"use client";

import { useQuery } from "@tanstack/react-query";
import { Landmark, ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import api from "@/lib/api";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportSummaryCards from "@/components/reports/ReportSummaryCards";
import { formatRupiah } from "@/lib/format";
import { KIND_LABEL, qs, useCashbookRange } from "@/lib/cashbook";

type Account = { id: string; kind: string; name: string; gateway: string | null; purpose: string; entries: number; masuk: number; keluar: number; sirkulasi: number };
type Gateway = { gateway: string; percobaan: number; berhasil: number; tertunda: number; gagal: number; totalBerhasil: number; totalTertunda: number; tingkatBerhasil: number };

export default function CashbookAccountsPage() {
  const { startDate, endDate, setStartDate, setEndDate } = useCashbookRange();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cashbook", "accounts", startDate, endDate],
    queryFn: async () => (await api.get(`/admin/cashbook/accounts?${qs({ startDate, endDate })}`)).data?.data,
  });
  const accounts: Account[] = data?.accounts || [];
  const gateways: Gateway[] = data?.gateways || [];
  const totals = data?.totals || { masuk: 0, keluar: 0, sirkulasi: 0 };

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Sirkulasi Rekening</h1>
        <p className="text-gray-600 mt-1">Uang yang beredar di setiap akun kas (rekening bank, QRIS, gateway, tunai). Ini catatan sistem, bukan saldo bank.</p>
      </div>

      <ReportFilters allTimePreset startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

      {isError && <div className="card mb-6 border border-danger-200 bg-danger-50 text-sm text-danger-700">Gagal memuat sirkulasi rekening.</div>}

      <ReportSummaryCards
        cards={[
          { label: "Masuk", value: totals.masuk, color: "success", icon: ArrowDownCircle },
          { label: "Keluar", value: totals.keluar, color: "danger", icon: ArrowUpCircle },
          { label: "Sirkulasi", value: totals.sirkulasi, color: "primary", icon: Scale },
        ]}
      />

      {(data?.peringatan?.length || 0) > 0 && (
        <div className="card mb-6 border border-warning-200 bg-warning-50 text-sm text-warning-800">
          <p className="font-semibold mb-1">Perlu perhatian</p>
          {data.peringatan.map((w: any, i: number) => (
            <p key={i}>Dana zakat disalurkan dari akun non-zakat &quot;{w.akun}&quot;: {w.jumlah} entri, Rp {formatRupiah(w.nominal)}</p>
          ))}
        </div>
      )}

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-dark mb-4 flex items-center gap-2"><Landmark size={18} /> Akun kas</h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded" />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Akun</th>
                  <th className="text-left">Jenis</th>
                  <th className="text-right">Entri</th>
                  <th className="text-right">Masuk</th>
                  <th className="text-right">Keluar</th>
                  <th className="text-right">Sirkulasi</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-6">Belum ada akun kas. Akun dibuat otomatis saat ada pembayaran atau pencairan.</td></tr>
                )}
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.name}{a.kind === "unmapped" && <span className="ml-2 text-xs text-warning-700">data lama, metode tidak diketahui</span>}</td>
                    <td>{KIND_LABEL[a.kind] || a.kind}{a.purpose === "zakat" ? " · zakat" : ""}</td>
                    <td className="text-right mono">{a.entries}</td>
                    <td className="text-right mono text-success-700">Rp {formatRupiah(a.masuk)}</td>
                    <td className="text-right mono text-danger-700">Rp {formatRupiah(a.keluar)}</td>
                    <td className="text-right mono font-semibold">Rp {formatRupiah(a.sirkulasi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-dark mb-1">Payment gateway</h2>
        <p className="text-sm text-gray-600 mb-4">Seluruh percobaan pembayaran per gateway. Uang yang berhasil dianggap sudah masuk; biaya gateway ditanggung donatur.</p>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="text-left">Gateway</th>
                <th className="text-right">Percobaan</th>
                <th className="text-right">Berhasil</th>
                <th className="text-right">Tertunda</th>
                <th className="text-right">Gagal / kedaluwarsa</th>
                <th className="text-right">Tingkat berhasil</th>
                <th className="text-right">Total berhasil</th>
                <th className="text-right">Masih tertunda</th>
              </tr>
            </thead>
            <tbody>
              {gateways.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-6">Tidak ada pembayaran gateway pada periode ini.</td></tr>}
              {gateways.map((g) => (
                <tr key={g.gateway}>
                  <td className="font-medium capitalize">{g.gateway}</td>
                  <td className="text-right mono">{g.percobaan}</td>
                  <td className="text-right mono text-success-700">{g.berhasil}</td>
                  <td className="text-right mono text-warning-700">{g.tertunda}</td>
                  <td className="text-right mono text-danger-700">{g.gagal}</td>
                  <td className="text-right mono">{g.tingkatBerhasil}%</td>
                  <td className="text-right mono font-semibold">Rp {formatRupiah(g.totalBerhasil)}</td>
                  <td className="text-right mono text-gray-500">Rp {formatRupiah(g.totalTertunda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
