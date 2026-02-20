"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

interface MitraRow {
  id: string;
  name: string;
  status: string;
  campaignCount: number;
  totalIncome: number;
  totalRevenueShare: number;
  totalPaid: number;
  remainingBalance: number;
}

interface MitraDetail {
  mitra: { id: string; name: string; status: string };
  summary: { totalShare: number; totalPaid: number; remaining: number };
  revenueShares: {
    id: string;
    transactionNumber: string;
    productName: string;
    productType: string;
    donationAmount: number;
    mitraAmount: number;
    calculatedAt: string;
  }[];
  disbursements: {
    id: string;
    disbursementNumber: string;
    amount: number;
    purpose: string;
    paidAt: string;
  }[];
}

const PAGE_SIZE = 20;

export default function MitraReportPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["mitra-summary", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get(`/admin/reports/mitra-summary?${params.toString()}`);
      return res.data?.data as { summary: any; mitras: MitraRow[]; pagination?: { totalPages: number } };
    },
  });

  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["mitra-detail", selectedId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ mitraId: selectedId!, startDate, endDate });
      const res = await api.get(`/admin/reports/mitra-detail?${params}`);
      return res.data?.data as MitraDetail;
    },
    enabled: !!selectedId,
  });

  const mitras = summaryData?.mitras || [];
  const summary = summaryData?.summary || { totalIncome: 0, totalRevenueShare: 0, totalPaid: 0, remainingBalance: 0, mitraCount: 0 };
  const totalPages = Number(summaryData?.pagination?.totalPages || 1);

  const handleExportSummary = () => {
    exportToExcel({
      data: mitras.map((m) => ({
        name: m.name,
        status: m.status,
        campaigns: m.campaignCount,
        income: m.totalIncome,
        share: m.totalRevenueShare,
        paid: m.totalPaid,
        balance: m.remainingBalance,
      })),
      columns: [
        { header: "Mitra", key: "name", width: 30 },
        { header: "Status", key: "status", width: 12 },
        { header: "Program", key: "campaigns", width: 10, format: "number" },
        { header: "Total Income", key: "income", width: 18, format: "currency" },
        { header: "Revenue Share", key: "share", width: 18, format: "currency" },
        { header: "Sudah Dibayar", key: "paid", width: 18, format: "currency" },
        { header: "Sisa", key: "balance", width: 18, format: "currency" },
      ],
      filename: `Laporan-Per-Mitra-${new Date().toISOString().slice(0, 10)}`,
      title: "Laporan Per Mitra",
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Per Mitra</h1>
          <p className="text-gray-600 mt-1">Settlement statement per mitra lembaga</p>
        </div>
        <ExportButton onExportExcel={handleExportSummary} onPrint={() => window.print()} />
      </div>

      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Jumlah Mitra</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{summary.mitraCount}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Revenue Share</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">Rp {formatRupiah(summary.totalRevenueShare)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Sudah Dibayar</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">Rp {formatRupiah(summary.totalPaid)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Sisa Hutang</p>
            <p className="mt-2 text-2xl font-bold text-warning-600 mono">Rp {formatRupiah(summary.remainingBalance)}</p>
          </div>
        </div>

        {!selectedId ? (
          <>
            {/* Desktop */}
            <div className="table-container">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mitra</th>
                      <th className="text-center">Program</th>
                      <th className="text-right">Total Income</th>
                      <th className="text-right">Revenue Share</th>
                      <th className="text-right">Dibayar</th>
                      <th className="text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mitras.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(m.id)}>
                        <td>
                          <div className="text-sm font-medium text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.status}</div>
                        </td>
                        <td className="text-center text-sm">{m.campaignCount}</td>
                        <td className="text-right text-sm mono">Rp {formatRupiah(m.totalIncome)}</td>
                        <td className="text-right text-sm mono text-primary-600 font-medium">Rp {formatRupiah(m.totalRevenueShare)}</td>
                        <td className="text-right text-sm mono text-success-600">Rp {formatRupiah(m.totalPaid)}</td>
                        <td className="text-right text-sm mono text-warning-600 font-bold">Rp {formatRupiah(m.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!isLoading && mitras.length === 0 && (
                <div className="p-6 text-center text-gray-500">Belum ada data mitra</div>
              )}

              {totalPages > 1 && !selectedId && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between no-print">
                  <span className="text-sm text-gray-600">Hal {page} dari {totalPages}</span>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="table-mobile-cards">
              {mitras.map((m) => (
                <div key={m.id} className="table-card cursor-pointer" onClick={() => setSelectedId(m.id)}>
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{m.name}</div>
                      <div className="table-card-header-subtitle">{m.campaignCount} program · {m.status}</div>
                    </div>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Revenue Share</span>
                    <span className="table-card-row-value mono text-primary-600 font-medium">Rp {formatRupiah(m.totalRevenueShare)}</span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Sisa</span>
                    <span className="table-card-row-value mono text-warning-600 font-bold">Rp {formatRupiah(m.remainingBalance)}</span>
                  </div>
                </div>
              ))}

              {totalPages > 1 && !selectedId && (
                <div className="flex items-center justify-between pt-4 no-print">
                  <span className="text-sm text-gray-600">Hal {page}/{totalPages}</span>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Detail Mode */}
            <div className="no-print">
              <button className="btn btn-outline btn-sm mb-4" onClick={() => setSelectedId(null)}>← Kembali</button>
            </div>

            <div className="card no-print mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-full" />
                </div>
              </div>
            </div>

            {loadingDetail ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : detailData ? (
              <>
                <div className="card mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{detailData.mitra.name}</h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-500">Total Share:</span> <span className="mono font-medium text-primary-600">Rp {formatRupiah(detailData.summary.totalShare)}</span></div>
                    <div><span className="text-gray-500">Dibayar:</span> <span className="mono font-medium text-success-600">Rp {formatRupiah(detailData.summary.totalPaid)}</span></div>
                    <div><span className="text-gray-500">Sisa:</span> <span className="mono font-medium text-warning-600">Rp {formatRupiah(detailData.summary.remaining)}</span></div>
                  </div>
                </div>

                {/* Revenue Shares Table */}
                <div className="table-container mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Settlement Statement ({detailData.revenueShares.length})</h3>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Transaksi</th>
                        <th>Program</th>
                        <th className="text-right">Basis</th>
                        <th className="text-right">Share Mitra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.revenueShares.map((r) => (
                        <tr key={r.id}>
                          <td className="text-sm text-gray-600">{format(new Date(r.calculatedAt), "dd MMM yyyy", { locale: idLocale })}</td>
                          <td className="text-sm">{r.transactionNumber}</td>
                          <td className="text-sm">{r.productName}</td>
                          <td className="text-right text-sm mono">Rp {formatRupiah(r.donationAmount)}</td>
                          <td className="text-right text-sm mono text-primary-600 font-medium">Rp {formatRupiah(r.mitraAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detailData.revenueShares.length === 0 && <div className="p-6 text-center text-gray-500">Tidak ada data</div>}
                </div>

                {/* Disbursements Table */}
                <div className="table-container">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran ({detailData.disbursements.length})</h3>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>No. Pencairan</th>
                        <th>Tujuan</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.disbursements.map((d) => (
                        <tr key={d.id}>
                          <td className="text-sm text-gray-600">{d.paidAt ? format(new Date(d.paidAt), "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                          <td className="text-sm">{d.disbursementNumber}</td>
                          <td className="text-sm">{d.purpose || "-"}</td>
                          <td className="text-right text-sm mono text-success-600 font-medium">Rp {formatRupiah(d.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detailData.disbursements.length === 0 && <div className="p-6 text-center text-gray-500">Belum ada pembayaran</div>}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
