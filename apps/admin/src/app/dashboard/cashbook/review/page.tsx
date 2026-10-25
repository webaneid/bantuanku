"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { formatDateTimeWIB } from "@/lib/timezone";

const Row = ({ label, jumlah, nominal, tone, hint }: { label: string; jumlah: number; nominal: number; tone: "ok" | "warn" | "info"; hint: string }) => (
  <div className={`rounded-lg border p-4 ${tone === "warn" && jumlah > 0 ? "border-warning-200 bg-warning-50" : "border-gray-200 bg-white"}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium text-dark flex items-center gap-2">
          {tone === "info" ? <Info size={16} className="text-info-600" /> : jumlah === 0 ? <CheckCircle2 size={16} className="text-success-600" /> : <AlertTriangle size={16} className="text-warning-600" />}
          {label}
        </p>
        <p className="text-sm text-gray-600 mt-1">{hint}</p>
      </div>
      <div className="text-right whitespace-nowrap">
        <p className="mono font-semibold">{jumlah.toLocaleString("id-ID")}</p>
        <p className="mono text-sm text-gray-600">Rp {formatRupiah(nominal)}</p>
      </div>
    </div>
  </div>
);

export default function CashbookReviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cashbook", "review"],
    queryFn: async () => (await api.get("/admin/cashbook/review")).data?.data,
  });

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Perlu Ditinjau</h1>
        <p className="text-gray-600 mt-1">Celah pencatatan dan informasi yang sebaiknya diperiksa bendahara.</p>
      </div>
      {isError && <div className="card border border-danger-200 bg-danger-50 text-sm text-danger-700">Gagal memuat daftar.</div>}
      {isLoading || !data ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark">Belum masuk buku kas</h2>
          <Row tone="warn" label="Pembayaran terverifikasi belum diposting" {...data.belumDiposting.pembayaranVerified} hint="Seharusnya nol. Jalankan backfill bila ada." />
          <Row tone="warn" label="Pencairan paid belum diposting" {...data.belumDiposting.pencairanPaid} hint="Seharusnya nol. Jalankan backfill bila ada." />

          <h2 className="text-lg font-semibold text-dark pt-2">Informasi</h2>
          <Row tone="info" label="Akun belum dipetakan" {...data.informasi.akunBelumDipetakan} hint="Metode bayar yang tidak dikenal; perlu dipetakan ke rekening/gateway." />
          <Row tone="info" label="Kelebihan bayar / pembayaran ganda" {...data.informasi.kelebihan} hint="Tetap dihitung sebagai pemasukan (komponen kelebihan)." />
          <Row tone="info" label="Pemasukan sintetis (data eksisting)" {...data.informasi.pemasukanSintetis} hint="Transaksi paid tanpa pembayaran terverifikasi, dicatat sebagai pemasukan berlabel." />

          <h2 className="text-lg font-semibold text-dark pt-2">Transaksi paid tanpa bagi hasil</h2>
          <Row tone="warn" label="Hak amil/developer/mitra/influencer belum terhitung" jumlah={data.paidTanpaBagiHasil.jumlah} nominal={data.paidTanpaBagiHasil.nominal} hint="Wakaf, fidyah, dan qurban tanpa biaya admin memang tidak punya bagi hasil." />
          {data.paidTanpaBagiHasil.contoh.length > 0 && (
            <div className="card">
              <p className="text-sm font-medium text-gray-700 mb-2">Contoh (20 terbaru)</p>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th className="text-left">Transaksi</th><th className="text-left">Produk</th><th className="text-left">Jenis</th><th className="text-right">Jumlah</th><th className="text-left">Dibayar</th></tr></thead>
                  <tbody>
                    {data.paidTanpaBagiHasil.contoh.map((r: any) => (
                      <tr key={r.transactionNumber}>
                        <td className="mono text-sm">{r.transactionNumber}</td>
                        <td className="text-sm">{r.productName}</td>
                        <td className="text-sm">{r.productType}</td>
                        <td className="text-right mono">Rp {formatRupiah(r.total)}</td>
                        <td className="text-sm">{r.paidAt ? formatDateTimeWIB(r.paidAt) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
