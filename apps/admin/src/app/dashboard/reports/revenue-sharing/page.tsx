"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

interface RevenueShareRow {
  id: string;
  transactionId: string;
  transactionNumber: string | null;
  productType: string | null;
  productName: string | null;
  donationAmount: number;
  amilPercentage: string | number;
  developerAmount: number;
  fundraiserAmount: number;
  fundraiserCode: string | null;
  mitraAmount: number;
  mitraName: string | null;
  amilNetAmount: number;
  programAmount: number;
  calculatedAt: string;
}

interface RevenueShareSummary {
  totalRecords: number;
  totalDonationAmount: number;
  totalAmilAmount: number;
  totalAmilNet: number;
  totalDeveloper: number;
  totalFundraiser: number;
  totalMitra: number;
  totalProgram: number;
}

const productTypeLabels: Record<string, string> = {
  campaign: "Campaign",
  zakat: "Zakat",
  qurban: "Qurban",
};

const formatPercent = (value: string | number | null | undefined): string => {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "0%";
  return `${num.toFixed(2)}%`;
};

const PAGE_SIZE = 50;

export default function RevenueSharingReportPage() {
  const [page, setPage] = useState(1);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["reports-revenue-sharing", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const response = await api.get(`/admin/reports/revenue-sharing?${params.toString()}`);
      return (response.data?.data || {
        summary: {
          totalRecords: 0,
          totalDonationAmount: 0,
          totalAmilAmount: 0,
          totalAmilNet: 0,
          totalDeveloper: 0,
          totalFundraiser: 0,
          totalMitra: 0,
          totalProgram: 0,
        },
        rows: [],
        pagination: { total: 0, totalPages: 1 },
      }) as {
        summary: RevenueShareSummary;
        rows: RevenueShareRow[];
        pagination: { total: number; totalPages: number };
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const rows = reportData?.rows || [];
  const summary = reportData?.summary;
  const totalRows = Number(reportData?.pagination?.total || 0);
  const totalPages = Number(reportData?.pagination?.totalPages || 1);

  const handleExportExcel = () => {
    exportToExcel({
      data: rows.map((r) => ({
        date: format(new Date(r.calculatedAt), "dd/MM/yyyy", { locale: idLocale }),
        transaction: r.transactionNumber || "-",
        product: r.productName || "-",
        productType: productTypeLabels[r.productType || ""] || r.productType || "-",
        basis: r.donationAmount,
        developer: r.developerAmount,
        fundraiser: r.fundraiserAmount,
        mitra: r.mitraAmount,
        amilNet: r.amilNetAmount,
        program: r.programAmount,
      })),
      columns: [
        { header: "Tanggal", key: "date", width: 14 },
        { header: "Transaksi", key: "transaction", width: 18 },
        { header: "Produk", key: "product", width: 25 },
        { header: "Tipe", key: "productType", width: 12 },
        { header: "Basis", key: "basis", width: 18, format: "currency" },
        { header: "Developer", key: "developer", width: 16, format: "currency" },
        { header: "Fundraiser", key: "fundraiser", width: 16, format: "currency" },
        { header: "Mitra", key: "mitra", width: 16, format: "currency" },
        { header: "Amil Net", key: "amilNet", width: 16, format: "currency" },
        { header: "Dana Program", key: "program", width: 16, format: "currency" },
      ],
      filename: `Bagi-Hasil-Amil-${new Date().toISOString().slice(0, 10)}`,
      title: "Laporan Bagi Hasil Amil",
      summaryRow: {
        date: "TOTAL",
        basis: summary?.totalDonationAmount || 0,
        developer: summary?.totalDeveloper || 0,
        fundraiser: summary?.totalFundraiser || 0,
        mitra: summary?.totalMitra || 0,
        amilNet: summary?.totalAmilNet || 0,
        program: summary?.totalProgram || 0,
      },
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Bagi Hasil Amil</h1>
          <p className="text-gray-600 mt-1">Snapshot pembagian amil, developer, fundraiser, dan mitra.</p>
        </div>
        <ExportButton
          onExportExcel={handleExportExcel}
          onPrint={() => window.print()}
        />
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Basis Perhitungan</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 mono">
              Rp {formatRupiah(summary?.totalDonationAmount || 0)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Amil (Net)</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">
              Rp {formatRupiah(summary?.totalAmilNet || 0)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Developer + Fundraiser</p>
            <p className="mt-2 text-2xl font-bold text-info-600 mono">
              Rp {formatRupiah((summary?.totalDeveloper || 0) + (summary?.totalFundraiser || 0))}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Mitra</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">
              Rp {formatRupiah(summary?.totalMitra || 0)}
            </p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="table-container">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Detail Bagi Hasil</h2>
            <span className="text-sm text-gray-600">Total: {totalRows} record</span>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Belum ada data bagi hasil.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Transaksi</th>
                  <th>Produk</th>
                  <th className="text-right">Basis</th>
                  <th className="text-right">Developer</th>
                  <th className="text-right">Fundraiser</th>
                  <th className="text-right">Mitra</th>
                  <th className="text-right">Amil Net</th>
                  <th className="text-right">Dana Program</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="text-sm text-gray-700">
                      {format(new Date(row.calculatedAt), "dd MMM yyyy", { locale: idLocale })}
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-900">{row.transactionNumber || "-"}</div>
                      <div className="text-xs text-gray-500">{formatPercent(row.amilPercentage)}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{row.productName || "-"}</div>
                      <div className="text-xs text-gray-500">{productTypeLabels[row.productType || ""] || row.productType || "-"}</div>
                    </td>
                    <td className="text-right text-sm mono text-gray-900">Rp {formatRupiah(row.donationAmount || 0)}</td>
                    <td className="text-right text-sm mono text-info-700">Rp {formatRupiah(row.developerAmount || 0)}</td>
                    <td className="text-right text-sm mono text-amber-700">
                      Rp {formatRupiah(row.fundraiserAmount || 0)}
                      {row.fundraiserCode ? <div className="text-[11px] text-gray-500">{row.fundraiserCode}</div> : null}
                    </td>
                    <td className="text-right text-sm mono text-success-700">
                      Rp {formatRupiah(row.mitraAmount || 0)}
                      {row.mitraName ? <div className="text-[11px] text-gray-500">{row.mitraName}</div> : null}
                    </td>
                    <td className="text-right text-sm mono font-semibold text-primary-700">Rp {formatRupiah(row.amilNetAmount || 0)}</td>
                    <td className="text-right text-sm mono text-gray-900">Rp {formatRupiah(row.programAmount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between no-print">
              <span className="text-sm text-gray-600">
                Hal {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="table-mobile-cards">
          {rows.map((row) => (
            <div key={row.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{row.productName || "-"}</div>
                  <div className="table-card-header-subtitle">
                    {format(new Date(row.calculatedAt), "dd MMM yyyy", { locale: idLocale })} · {row.transactionNumber || "-"}
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {productTypeLabels[row.productType || ""] || row.productType || "-"}
                </span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Basis</span>
                <span className="table-card-row-value mono">Rp {formatRupiah(row.donationAmount || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Developer</span>
                <span className="table-card-row-value mono text-info-700">Rp {formatRupiah(row.developerAmount || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Fundraiser</span>
                <span className="table-card-row-value mono text-amber-700">Rp {formatRupiah(row.fundraiserAmount || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Mitra</span>
                <span className="table-card-row-value mono text-success-700">Rp {formatRupiah(row.mitraAmount || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Amil Net</span>
                <span className="table-card-row-value mono font-semibold text-primary-700">Rp {formatRupiah(row.amilNetAmount || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Dana Program</span>
                <span className="table-card-row-value mono">Rp {formatRupiah(row.programAmount || 0)}</span>
              </div>
            </div>
          ))}

          {!isLoading && rows.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada data bagi hasil.</p>
            </div>
          )}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 no-print">
              <span className="text-sm text-gray-600">
                Hal {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
