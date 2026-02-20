"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

interface TopDonor {
  userId: string | null;
  donorName: string;
  donorEmail: string;
  totalDonations: number;
  totalAmount: number;
  avgDonation: number;
  lastDonation: string;
}

interface DonorDetail {
  donor: { id: string; name: string; email: string; phone: string | null };
  summary: { totalTransactions: number; totalAmount: number; byProductType: Record<string, { count: number; total: number }> };
  transactions: {
    id: string;
    transactionNumber: string;
    productType: string;
    productName: string;
    totalAmount: number;
    paidAt: string;
    category: string;
  }[];
}

const TYPE_LABELS: Record<string, string> = {
  campaign: "Campaign",
  zakat: "Zakat",
  qurban: "Qurban",
};

export default function DonaturReportPage() {
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
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");

  // Top donors from donor-analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["donor-analytics", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await api.get(`/admin/reports/donor-analytics?${params}`);
      return res.data?.data as { topDonors: TopDonor[] };
    },
  });

  // Search donatur by email for detail view
  const { data: donaturList } = useQuery({
    queryKey: ["donatur-search", searchEmail],
    queryFn: async () => {
      const res = await api.get(`/admin/donatur?search=${encodeURIComponent(searchEmail)}&limit=10`);
      return (res.data?.data || []) as { id: string; name: string; email: string }[];
    },
    enabled: searchEmail.length >= 3,
  });

  // Detail for selected donor
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["donor-detail", selectedDonorId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ donorId: selectedDonorId!, startDate, endDate });
      const res = await api.get(`/admin/reports/donor-detail?${params}`);
      return res.data?.data as DonorDetail;
    },
    enabled: !!selectedDonorId,
  });

  const topDonors = analyticsData?.topDonors || [];

  const handleExport = () => {
    exportToExcel({
      data: topDonors.map((d, i) => ({
        rank: i + 1,
        name: d.donorName || "Anonim",
        email: d.donorEmail || "-",
        frequency: Number(d.totalDonations),
        total: Number(d.totalAmount),
        avg: Math.round(Number(d.avgDonation)),
        lastDonation: d.lastDonation ? format(new Date(d.lastDonation), "dd/MM/yyyy") : "-",
      })),
      columns: [
        { header: "#", key: "rank", width: 5 },
        { header: "Nama Donatur", key: "name", width: 25 },
        { header: "Email", key: "email", width: 25 },
        { header: "Frekuensi", key: "frequency", width: 12, format: "number" },
        { header: "Total Donasi", key: "total", width: 18, format: "currency" },
        { header: "Rata-rata", key: "avg", width: 18, format: "currency" },
        { header: "Terakhir", key: "lastDonation", width: 14 },
      ],
      filename: `Top-Donatur-${startDate}-${endDate}`,
      title: "Laporan Top Donatur",
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Donatur</h1>
          <p className="text-gray-600 mt-1">Analitik donatur dan riwayat donasi</p>
        </div>
        <ExportButton onExportExcel={handleExport} onPrint={() => window.print()} />
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <div className="card no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari Donatur</label>
              <input
                type="text"
                placeholder="Ketik nama/email (min 3 huruf)..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="form-input w-full"
              />
              {donaturList && donaturList.length > 0 && !selectedDonorId && (
                <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {donaturList.map((d) => (
                    <button
                      key={d.id}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      onClick={() => { setSelectedDonorId(d.id); setSearchEmail(d.name); }}
                    >
                      <span className="font-medium">{d.name}</span> <span className="text-gray-500">{d.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedDonorId ? (
          <>
            {/* Detail View */}
            <div className="no-print">
              <button className="btn btn-outline btn-sm mb-4" onClick={() => { setSelectedDonorId(null); setSearchEmail(""); }}>← Kembali ke Top Donatur</button>
            </div>

            {loadingDetail ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : detailData ? (
              <>
                <div className="card mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{detailData.donor.name}</h2>
                  <p className="text-sm text-gray-600">{detailData.donor.email} {detailData.donor.phone ? `· ${detailData.donor.phone}` : ""}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 text-sm">
                    <div><span className="text-gray-500">Total Transaksi:</span> <span className="font-medium">{detailData.summary.totalTransactions}x</span></div>
                    <div><span className="text-gray-500">Total Donasi:</span> <span className="mono font-medium text-success-600">Rp {formatRupiah(detailData.summary.totalAmount)}</span></div>
                    <div>
                      <span className="text-gray-500">Per Tipe:</span>
                      {Object.entries(detailData.summary.byProductType).map(([type, val]) => (
                        <span key={type} className="ml-2 text-xs">{TYPE_LABELS[type] || type}: {val.count}x</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>No. Transaksi</th>
                        <th>Tipe</th>
                        <th>Program</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="text-sm text-gray-600">{t.paidAt ? format(new Date(t.paidAt), "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                          <td className="text-sm">{t.transactionNumber}</td>
                          <td className="text-sm">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {TYPE_LABELS[t.productType] || t.productType}
                            </span>
                          </td>
                          <td className="text-sm">{t.productName}</td>
                          <td className="text-right text-sm mono text-success-600 font-medium">Rp {formatRupiah(t.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {detailData.transactions.length > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={4} className="font-bold">TOTAL</td>
                          <td className="text-right font-bold text-success-600 mono">Rp {formatRupiah(detailData.summary.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {detailData.transactions.length === 0 && <div className="p-6 text-center text-gray-500">Tidak ada transaksi</div>}
                </div>

                {/* Mobile Cards */}
                <div className="table-mobile-cards">
                  {detailData.transactions.map((t) => (
                    <div key={t.id} className="table-card">
                      <div className="table-card-header">
                        <div className="table-card-header-left">
                          <div className="table-card-header-title">{t.productName}</div>
                          <div className="table-card-header-subtitle">
                            {t.paidAt ? format(new Date(t.paidAt), "dd MMM yyyy", { locale: idLocale }) : "-"} · {t.transactionNumber}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {TYPE_LABELS[t.productType] || t.productType}
                        </span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Jumlah</span>
                        <span className="table-card-row-value mono text-success-600 font-medium">Rp {formatRupiah(t.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            {/* Top 20 Donors - Desktop */}
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Top 20 Donatur</h2>
              </div>
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Donatur</th>
                      <th className="text-center">Frekuensi</th>
                      <th className="text-right">Total Donasi</th>
                      <th className="text-right">Rata-rata</th>
                      <th>Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDonors.map((d, i) => (
                      <tr key={`${d.donorEmail || 'no-email'}-${d.donorName || 'anonim'}-${i}`} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-500">{i + 1}</td>
                        <td>
                          <div className="text-sm font-medium text-gray-900">{d.donorName || "Anonim"}</div>
                          <div className="text-xs text-gray-500">{d.donorEmail || "-"}</div>
                        </td>
                        <td className="text-center text-sm">{Number(d.totalDonations)}x</td>
                        <td className="text-right text-sm mono text-success-600 font-medium">Rp {formatRupiah(Number(d.totalAmount))}</td>
                        <td className="text-right text-sm mono">Rp {formatRupiah(Math.round(Number(d.avgDonation)))}</td>
                        <td className="text-sm text-gray-600">
                          {d.lastDonation ? format(new Date(d.lastDonation), "dd MMM yyyy", { locale: idLocale }) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!isLoading && topDonors.length === 0 && (
                <div className="p-6 text-center text-gray-500">Belum ada data donatur</div>
              )}
            </div>

            {/* Top Donors - Mobile */}
            <div className="table-mobile-cards">
              {topDonors.map((d, i) => (
                <div key={`${d.donorEmail || 'no-email'}-${d.donorName || 'anonim'}-${i}`} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">#{i + 1} {d.donorName || "Anonim"}</div>
                      <div className="table-card-header-subtitle">{d.donorEmail || "-"} · {Number(d.totalDonations)}x donasi</div>
                    </div>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Total</span>
                    <span className="table-card-row-value mono text-success-600 font-medium">Rp {formatRupiah(Number(d.totalAmount))}</span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Terakhir</span>
                    <span className="table-card-row-value text-sm">
                      {d.lastDonation ? format(new Date(d.lastDonation), "dd MMM yyyy", { locale: idLocale }) : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
