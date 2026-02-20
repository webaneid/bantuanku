"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

interface UniqueCodeSummary {
  totalAmount: number;
  transactionCount: number;
  avgUniqueCode: number;
}

interface UniqueCodeByMonth {
  month: string;
  totalAmount: number;
  transactionCount: number;
}

interface UniqueCodeByProductType {
  productType: string | null;
  totalAmount: number;
  transactionCount: number;
}

interface UniqueCodeDetail {
  id: string;
  transactionNumber: string;
  donorName: string;
  productName: string | null;
  productType: string | null;
  totalAmount: number;
  uniqueCode: number;
  paidAt: string;
}

interface UniqueCodesResponse {
  summary: UniqueCodeSummary;
  byMonth: UniqueCodeByMonth[];
  byProductType: UniqueCodeByProductType[];
  detail: UniqueCodeDetail[];
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  campaign: "Campaign",
  zakat: "Zakat",
  qurban: "Qurban",
  donation: "Donasi",
};

export default function UniqueCodesReportPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ["reports-unique-codes", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/admin/reports/unique-codes?${params.toString()}`);
      return (response.data?.data || {
        summary: { totalAmount: 0, transactionCount: 0, avgUniqueCode: 0 },
        byMonth: [],
        byProductType: [],
        detail: [],
      }) as UniqueCodesResponse;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const summary = data?.summary || { totalAmount: 0, transactionCount: 0, avgUniqueCode: 0 };
  const byMonth = data?.byMonth || [];
  const byProductType = data?.byProductType || [];
  const detail = data?.detail || [];

  const handleExportExcel = () => {
    exportToExcel({
      data: detail.map((row) => ({
        paidAt: row.paidAt ? format(new Date(row.paidAt), "dd/MM/yyyy HH:mm", { locale: idLocale }) : "-",
        transactionNumber: row.transactionNumber,
        donorName: row.donorName || "Anonim",
        productName: row.productName || "-",
        productType: PRODUCT_TYPE_LABEL[row.productType || ""] || row.productType || "-",
        baseAmount: row.totalAmount || 0,
        uniqueCode: row.uniqueCode || 0,
      })),
      columns: [
        { header: "Tanggal Bayar", key: "paidAt", width: 22 },
        { header: "No Transaksi", key: "transactionNumber", width: 22 },
        { header: "Donatur", key: "donorName", width: 24 },
        { header: "Produk", key: "productName", width: 28 },
        { header: "Tipe", key: "productType", width: 14 },
        { header: "Nominal Donasi", key: "baseAmount", width: 20, format: "currency" },
        { header: "Kode Unik", key: "uniqueCode", width: 16, format: "currency" },
      ],
      filename: `Laporan-Kode-Unik-${startDate}-${endDate}`,
      title: "Laporan Pendapatan Kode Unik",
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      summaryRow: {
        paidAt: "TOTAL",
        uniqueCode: summary.totalAmount || 0,
      },
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Kode Unik</h1>
          <p className="text-gray-600 mt-1">Ringkasan pemasukan dari kode unik transaksi berstatus paid.</p>
        </div>
        <ExportButton onExportExcel={handleExportExcel} onPrint={() => window.print()} />
      </div>

      <div className="space-y-6">
        <div className="card no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input w-full"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Kode Unik</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">Rp {formatRupiah(summary.totalAmount || 0)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Jumlah Transaksi</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{summary.transactionCount || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Rata-rata Kode Unik</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">Rp {formatRupiah(summary.avgUniqueCode || 0)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="table-container">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Per Bulan</h2>
                </div>
                {byMonth.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">Tidak ada data.</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bulan</th>
                        <th className="text-right">Transaksi</th>
                        <th className="text-right">Kode Unik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byMonth.map((row) => (
                        <tr key={row.month}>
                          <td className="text-sm text-gray-900">{row.month}</td>
                          <td className="text-sm text-right text-gray-700">{row.transactionCount}</td>
                          <td className="text-sm text-right mono text-primary-700">Rp {formatRupiah(row.totalAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="table-container">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Per Tipe Produk</h2>
                </div>
                {byProductType.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">Tidak ada data.</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tipe</th>
                        <th className="text-right">Transaksi</th>
                        <th className="text-right">Kode Unik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byProductType.map((row) => (
                        <tr key={row.productType || "unknown"}>
                          <td className="text-sm text-gray-900">
                            {PRODUCT_TYPE_LABEL[row.productType || ""] || row.productType || "Lainnya"}
                          </td>
                          <td className="text-sm text-right text-gray-700">{row.transactionCount}</td>
                          <td className="text-sm text-right mono text-primary-700">Rp {formatRupiah(row.totalAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Detail Transaksi (Maks 100)</h2>
                <span className="text-sm text-gray-600">{detail.length} baris</span>
              </div>

              {detail.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Belum ada transaksi dengan kode unik.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>No Transaksi</th>
                      <th>Donatur</th>
                      <th>Produk</th>
                      <th className="text-right">Nominal</th>
                      <th className="text-right">Kode Unik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-700">
                          {row.paidAt ? format(new Date(row.paidAt), "dd MMM yyyy HH:mm", { locale: idLocale }) : "-"}
                        </td>
                        <td className="text-sm text-gray-900">{row.transactionNumber}</td>
                        <td className="text-sm text-gray-900">{row.donorName || "Anonim"}</td>
                        <td className="text-sm text-gray-900">
                          <div>{row.productName || "-"}</div>
                          <div className="text-xs text-gray-500">
                            {PRODUCT_TYPE_LABEL[row.productType || ""] || row.productType || "Lainnya"}
                          </div>
                        </td>
                        <td className="text-sm text-right mono text-gray-700">Rp {formatRupiah(row.totalAmount || 0)}</td>
                        <td className="text-sm text-right mono font-semibold text-primary-700">Rp {formatRupiah(row.uniqueCode || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
