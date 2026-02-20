"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

interface FundraiserRow {
  id: string;
  code: string;
  name: string;
  status: string;
  totalReferrals: number;
  totalDonationAmount: number;
  totalCommissionEarned: number;
  totalPaid: number;
  remainingBalance: number;
}

interface FundraiserDetail {
  fundraiser: { id: string; code: string; name: string; status: string };
  summary: { totalReferrals: number; totalCommission: number; totalPaid: number; remaining: number };
  referrals: {
    id: string;
    transactionNumber: string;
    donorName: string;
    productName: string;
    donationAmount: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
  }[];
  disbursements: {
    id: string;
    disbursementNumber: string;
    amount: number;
    paidAt: string;
  }[];
}

const PAGE_SIZE = 20;

export default function FundraiserReportPage() {
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
    queryKey: ["fundraiser-summary", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get(`/admin/reports/fundraiser-summary?${params.toString()}`);
      return res.data?.data as { summary: any; fundraisers: FundraiserRow[]; pagination?: { totalPages: number } };
    },
  });

  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["fundraiser-detail", selectedId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ fundraiserId: selectedId!, startDate, endDate });
      const res = await api.get(`/admin/reports/fundraiser-detail?${params}`);
      return res.data?.data as FundraiserDetail;
    },
    enabled: !!selectedId,
  });

  const fundraisers = summaryData?.fundraisers || [];
  const summary = summaryData?.summary || { totalReferrals: 0, totalCommission: 0, totalPaid: 0, remainingBalance: 0, fundraiserCount: 0 };
  const totalPages = Number(summaryData?.pagination?.totalPages || 1);

  const handleExportSummary = () => {
    exportToExcel({
      data: fundraisers.map((f) => ({
        code: f.code,
        name: f.name,
        status: f.status,
        referrals: f.totalReferrals,
        donations: f.totalDonationAmount,
        commission: f.totalCommissionEarned,
        paid: f.totalPaid,
        balance: f.remainingBalance,
      })),
      columns: [
        { header: "Kode", key: "code", width: 12 },
        { header: "Nama", key: "name", width: 25 },
        { header: "Status", key: "status", width: 12 },
        { header: "Referral", key: "referrals", width: 10, format: "number" },
        { header: "Total Donasi", key: "donations", width: 18, format: "currency" },
        { header: "Komisi", key: "commission", width: 18, format: "currency" },
        { header: "Dibayar", key: "paid", width: 18, format: "currency" },
        { header: "Sisa", key: "balance", width: 18, format: "currency" },
      ],
      filename: `Laporan-Per-Fundraiser-${new Date().toISOString().slice(0, 10)}`,
      title: "Laporan Per Fundraiser",
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Per Fundraiser</h1>
          <p className="text-gray-600 mt-1">Tracking komisi dan referral per fundraiser</p>
        </div>
        <ExportButton onExportExcel={handleExportSummary} onPrint={() => window.print()} />
      </div>

      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Jumlah Fundraiser</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{summary.fundraiserCount}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Komisi</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">Rp {formatRupiah(summary.totalCommission)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Sudah Dibayar</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">Rp {formatRupiah(summary.totalPaid)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Sisa Belum Bayar</p>
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
                      <th>Fundraiser</th>
                      <th className="text-center">Referral</th>
                      <th className="text-right">Total Donasi</th>
                      <th className="text-right">Komisi</th>
                      <th className="text-right">Dibayar</th>
                      <th className="text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundraisers.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(f.id)}>
                        <td>
                          <div className="text-sm font-medium text-gray-900">{f.name}</div>
                          <div className="text-xs text-gray-500">{f.code} · {f.status}</div>
                        </td>
                        <td className="text-center text-sm">{f.totalReferrals}</td>
                        <td className="text-right text-sm mono">Rp {formatRupiah(f.totalDonationAmount)}</td>
                        <td className="text-right text-sm mono text-primary-600 font-medium">Rp {formatRupiah(f.totalCommissionEarned)}</td>
                        <td className="text-right text-sm mono text-success-600">Rp {formatRupiah(f.totalPaid)}</td>
                        <td className="text-right text-sm mono text-warning-600 font-bold">Rp {formatRupiah(f.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!isLoading && fundraisers.length === 0 && (
                <div className="p-6 text-center text-gray-500">Belum ada data fundraiser</div>
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
              {fundraisers.map((f) => (
                <div key={f.id} className="table-card cursor-pointer" onClick={() => setSelectedId(f.id)}>
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{f.name}</div>
                      <div className="table-card-header-subtitle">{f.code} · {f.totalReferrals} referral</div>
                    </div>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Komisi</span>
                    <span className="table-card-row-value mono text-primary-600 font-medium">Rp {formatRupiah(f.totalCommissionEarned)}</span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Sisa</span>
                    <span className="table-card-row-value mono text-warning-600 font-bold">Rp {formatRupiah(f.remainingBalance)}</span>
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
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{detailData.fundraiser.name} ({detailData.fundraiser.code})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">Total Referral:</span> <span className="font-medium">{detailData.summary.totalReferrals}</span></div>
                    <div><span className="text-gray-500">Total Komisi:</span> <span className="mono font-medium text-primary-600">Rp {formatRupiah(detailData.summary.totalCommission)}</span></div>
                    <div><span className="text-gray-500">Dibayar:</span> <span className="mono font-medium text-success-600">Rp {formatRupiah(detailData.summary.totalPaid)}</span></div>
                    <div><span className="text-gray-500">Sisa:</span> <span className="mono font-medium text-warning-600">Rp {formatRupiah(detailData.summary.remaining)}</span></div>
                  </div>
                </div>

                {/* Referrals */}
                <div className="table-container mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Daftar Referral ({detailData.referrals.length})</h3>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Transaksi</th>
                        <th>Donatur</th>
                        <th>Program</th>
                        <th className="text-right">Donasi</th>
                        <th className="text-right">Komisi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.referrals.map((r) => (
                        <tr key={r.id}>
                          <td className="text-sm text-gray-600">{format(new Date(r.createdAt), "dd MMM yyyy", { locale: idLocale })}</td>
                          <td className="text-sm">{r.transactionNumber}</td>
                          <td className="text-sm">{r.donorName}</td>
                          <td className="text-sm">{r.productName}</td>
                          <td className="text-right text-sm mono">Rp {formatRupiah(r.donationAmount)}</td>
                          <td className="text-right text-sm mono text-primary-600 font-medium">Rp {formatRupiah(r.commissionAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detailData.referrals.length === 0 && <div className="p-6 text-center text-gray-500">Tidak ada referral</div>}
                </div>

                {/* Disbursements */}
                <div className="table-container">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran Komisi ({detailData.disbursements.length})</h3>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>No. Pencairan</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.disbursements.map((d) => (
                        <tr key={d.id}>
                          <td className="text-sm text-gray-600">{d.paidAt ? format(new Date(d.paidAt), "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                          <td className="text-sm">{d.disbursementNumber}</td>
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
