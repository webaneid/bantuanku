"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportMultiSheetExcel } from "@/utils/export-excel";

interface CategoryData {
  category: string;
  total: number;
  count: number;
}

interface ZakatReportData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  income: CategoryData[];
  expense: CategoryData[];
  periodByType: Array<{
    periodId: string;
    periodName: string;
    periodYear: number;
    periodHijriYear: string | null;
    zakatTypeId: string;
    zakatTypeName: string;
    total: number;
    count: number;
  }>;
}

const ASNAF_LABELS: Record<string, string> = {
  'zakat_to_fakir': 'Fakir',
  'zakat_to_miskin': 'Miskin',
  'zakat_to_amil': 'Amil',
  'zakat_to_mualaf': 'Mualaf',
  'zakat_to_riqab': 'Riqab',
  'zakat_to_gharim': 'Gharim',
  'zakat_to_fisabilillah': 'Fisabilillah',
  'zakat_to_ibnussabil': 'Ibnus Sabil',
};

const ZAKAT_TYPE_LABELS: Record<string, string> = {
  'zakat_fitrah': 'Zakat Fitrah',
  'zakat_maal': 'Zakat Maal',
  'zakat_profesi': 'Zakat Profesi',
  'zakat_pertanian': 'Zakat Pertanian',
  'zakat_peternakan': 'Zakat Peternakan',
};

export default function ZakatReportPage() {
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return formatLocalDate(firstDay);
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["zakat-report", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/admin/reports/zakat?${params}`);
      return response.data?.data as ZakatReportData;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const summary = reportData?.summary || {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  };

  const income = reportData?.income || [];
  const expense = reportData?.expense || [];
  const periodByType = reportData?.periodByType || [];

  const handleExportExcel = () => {
    const cols = [
      { header: "Kategori", key: "category", width: 30 },
      { header: "Jumlah Transaksi", key: "count", width: 18, format: "number" as const },
      { header: "Total", key: "total", width: 22, format: "currency" as const },
    ];

    exportMultiSheetExcel({
      sheets: [
        {
          name: "Pemasukan",
          title: "Laporan Zakat - Pemasukan",
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          data: income.map((i) => ({
            category: ZAKAT_TYPE_LABELS[i.category] || i.category,
            count: i.count,
            total: i.total,
          })),
          columns: cols,
          summaryRow: {
            category: "TOTAL",
            count: income.reduce((s, i) => s + i.count, 0),
            total: summary.totalIncome,
          },
        },
        {
          name: "Penyaluran per Asnaf",
          title: "Laporan Zakat - Penyaluran per Asnaf",
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          data: expense.map((e) => ({
            category: ASNAF_LABELS[e.category] || e.category,
            count: e.count,
            total: e.total,
          })),
          columns: cols,
          summaryRow: {
            category: "TOTAL",
            count: expense.reduce((s, e) => s + e.count, 0),
            total: summary.totalExpense,
          },
        },
        {
          name: "Periode x Jenis",
          title: "Laporan Zakat - Periode per Jenis Zakat",
          subtitle: `Periode Filter: ${startDate} s/d ${endDate}`,
          data: periodByType.map((item) => ({
            period: `${item.periodName}${item.periodHijriYear ? ` (${item.periodHijriYear}H)` : ""}`,
            zakatType: item.zakatTypeName,
            count: item.count,
            total: item.total,
          })),
          columns: [
            { header: "Periode", key: "period", width: 32 },
            { header: "Jenis Zakat", key: "zakatType", width: 28 },
            { header: "Jumlah Transaksi", key: "count", width: 18, format: "number" as const },
            { header: "Total", key: "total", width: 22, format: "currency" as const },
          ],
          summaryRow: {
            period: "TOTAL",
            zakatType: "",
            count: periodByType.reduce((s, i) => s + i.count, 0),
            total: periodByType.reduce((s, i) => s + i.total, 0),
          },
        },
      ],
      filename: `Laporan-Zakat-${startDate}-${endDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Zakat</h1>
          <p className="text-gray-600 mt-1">
            Pemasukan dan penyaluran zakat berdasarkan kategori & 8 asnaf
          </p>
        </div>
        <ExportButton
          onExportExcel={handleExportExcel}
          onPrint={() => window.print()}
        />
      </div>

      <div className="space-y-6">
        {/* Filter */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Pemasukan Zakat</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">
              Rp {formatRupiah(summary.totalIncome)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Penyaluran Zakat</p>
            <p className="mt-2 text-2xl font-bold text-danger-600 mono">
              Rp {formatRupiah(summary.totalExpense)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Saldo Zakat</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">
              Rp {formatRupiah(summary.balance)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Income by Type - Desktop */}
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pemasukan Zakat per Jenis</h2>
              </div>

              {income.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Tidak ada data pemasukan dalam periode ini</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Jenis Zakat</th>
                      <th className="text-right">Jumlah Transaksi</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((item) => (
                      <tr key={item.category} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-900">
                          {ZAKAT_TYPE_LABELS[item.category] || item.category}
                        </td>
                        <td className="text-sm text-right text-gray-600">{item.count}</td>
                        <td className="text-sm text-right font-medium text-success-600 mono">
                          Rp {formatRupiah(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="font-bold text-gray-900">TOTAL</td>
                      <td className="text-right font-bold">{income.reduce((s, i) => s + i.count, 0)}</td>
                      <td className="text-right font-bold text-success-600 mono">Rp {formatRupiah(summary.totalIncome)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Income - Mobile Cards */}
            <div className="table-mobile-cards">
              <div className="px-1 py-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Pemasukan Zakat per Jenis</h2>
              </div>
              {income.map((item) => (
                <div key={item.category} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">
                        {ZAKAT_TYPE_LABELS[item.category] || item.category}
                      </div>
                      <div className="table-card-header-subtitle">{item.count} transaksi</div>
                    </div>
                    <span className="mono font-medium text-success-600">Rp {formatRupiah(item.total)}</span>
                  </div>
                </div>
              ))}
              {income.length === 0 && (
                <div className="text-center py-8 text-gray-500">Tidak ada data pemasukan</div>
              )}
            </div>

            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Laporan Zakat per Periode & Jenis</h2>
              </div>

              {periodByType.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Belum ada transaksi zakat per periode dalam filter ini</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Jenis Zakat</th>
                      <th className="text-right">Jumlah Transaksi</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodByType.map((item) => (
                      <tr key={`${item.periodId}-${item.zakatTypeId}`} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-900">
                          {item.periodName}
                          {item.periodHijriYear ? ` (${item.periodHijriYear}H)` : ""}
                        </td>
                        <td className="text-sm text-gray-700">{item.zakatTypeName}</td>
                        <td className="text-sm text-right text-gray-600">{item.count}</td>
                        <td className="text-sm text-right font-medium text-success-600 mono">
                          Rp {formatRupiah(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="font-bold text-gray-900" colSpan={2}>TOTAL</td>
                      <td className="text-right font-bold">{periodByType.reduce((s, i) => s + i.count, 0)}</td>
                      <td className="text-right font-bold text-success-600 mono">
                        Rp {formatRupiah(periodByType.reduce((s, i) => s + i.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Expense by Asnaf - Desktop */}
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Penyaluran Zakat per Asnaf (8 Kategori)</h2>
              </div>

              {expense.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Tidak ada data penyaluran dalam periode ini</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Asnaf</th>
                      <th className="text-right">Jumlah Penyaluran</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expense.map((item) => (
                      <tr key={item.category} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-900">
                          {ASNAF_LABELS[item.category] || item.category}
                        </td>
                        <td className="text-sm text-right text-gray-600">{item.count}</td>
                        <td className="text-sm text-right font-medium text-danger-600 mono">
                          Rp {formatRupiah(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="font-bold text-gray-900">TOTAL</td>
                      <td className="text-right font-bold">{expense.reduce((s, e) => s + e.count, 0)}</td>
                      <td className="text-right font-bold text-danger-600 mono">Rp {formatRupiah(summary.totalExpense)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Expense - Mobile Cards */}
            <div className="table-mobile-cards">
              <div className="px-1 py-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Penyaluran Zakat per Asnaf</h2>
              </div>
              {expense.map((item) => (
                <div key={item.category} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">
                        {ASNAF_LABELS[item.category] || item.category}
                      </div>
                      <div className="table-card-header-subtitle">{item.count} penyaluran</div>
                    </div>
                    <span className="mono font-medium text-danger-600">Rp {formatRupiah(item.total)}</span>
                  </div>
                </div>
              ))}
              {expense.length === 0 && (
                <div className="text-center py-8 text-gray-500">Tidak ada data penyaluran</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
