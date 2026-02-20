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

interface QurbanReportData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  income: CategoryData[];
  expense: CategoryData[];
  periodByAnimal: Array<{
    periodId: string;
    periodName: string;
    gregorianYear: number;
    hijriYear: string | null;
    animalType: string;
    animalCount: number;
    transactionCount: number;
    totalCollected: number;
  }>;
}

const QURBAN_INCOME_LABELS: Record<string, string> = {
  'qurban_payment': 'Pembayaran Qurban',
  'qurban_savings': 'Tabungan Qurban',
};

const QURBAN_EXPENSE_LABELS: Record<string, string> = {
  'qurban_purchase_sapi': 'Pembelian Sapi Qurban',
  'qurban_purchase_kambing': 'Pembelian Kambing Qurban',
  'qurban_execution_fee': 'Biaya Penyembelihan & Distribusi',
};

const ANIMAL_LABELS: Record<string, string> = {
  cow: 'Sapi',
  sapi: 'Sapi',
  goat: 'Kambing',
  kambing: 'Kambing',
};

export default function QurbanReportPage() {
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
    queryKey: ["qurban-report", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/admin/reports/qurban?${params}`);
      return response.data?.data as QurbanReportData;
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
  const periodByAnimal = reportData?.periodByAnimal || [];

  const handleExportExcel = () => {
    const cols = [
      { header: "Kategori", key: "category", width: 35 },
      { header: "Jumlah Transaksi", key: "count", width: 18, format: "number" as const },
      { header: "Total", key: "total", width: 22, format: "currency" as const },
    ];

    exportMultiSheetExcel({
      sheets: [
        {
          name: "Pemasukan",
          title: "Laporan Qurban - Pemasukan",
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          data: income.map((i) => ({
            category: QURBAN_INCOME_LABELS[i.category] || i.category,
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
          name: "Pembelian",
          title: "Laporan Qurban - Pembelian",
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          data: expense.map((e) => ({
            category: QURBAN_EXPENSE_LABELS[e.category] || e.category,
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
          name: "Periode x Hewan",
          title: "Laporan Qurban - Periode & Jumlah Hewan",
          subtitle: `Periode Filter: ${startDate} s/d ${endDate}`,
          data: periodByAnimal.map((item) => ({
            period: `${item.periodName}${item.hijriYear ? ` (${item.hijriYear}H)` : ""}`,
            animal: ANIMAL_LABELS[item.animalType?.toLowerCase()] || item.animalType,
            animalCount: item.animalCount,
            transactionCount: item.transactionCount,
            totalCollected: item.totalCollected,
          })),
          columns: [
            { header: "Periode", key: "period", width: 32 },
            { header: "Jenis Hewan", key: "animal", width: 18 },
            { header: "Jumlah Hewan", key: "animalCount", width: 18, format: "number" as const },
            { header: "Jumlah Transaksi", key: "transactionCount", width: 18, format: "number" as const },
            { header: "Nilai Terkumpul", key: "totalCollected", width: 22, format: "currency" as const },
          ],
          summaryRow: {
            period: "TOTAL",
            animal: "",
            animalCount: periodByAnimal.reduce((s, i) => s + i.animalCount, 0),
            transactionCount: periodByAnimal.reduce((s, i) => s + i.transactionCount, 0),
            totalCollected: periodByAnimal.reduce((s, i) => s + i.totalCollected, 0),
          },
        },
      ],
      filename: `Laporan-Qurban-${startDate}-${endDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Qurban</h1>
          <p className="text-gray-600 mt-1">
            Pemasukan pembayaran qurban dan pembelian hewan qurban
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
            <p className="text-sm font-medium text-gray-600">Total Pemasukan Qurban</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">
              Rp {formatRupiah(summary.totalIncome)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Pembelian Qurban</p>
            <p className="mt-2 text-2xl font-bold text-danger-600 mono">
              Rp {formatRupiah(summary.totalExpense)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Saldo Qurban</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">
              Rp {formatRupiah(summary.balance)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Income - Desktop */}
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pemasukan Qurban per Jenis</h2>
              </div>

              {income.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Tidak ada data pemasukan dalam periode ini</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Jenis Pemasukan</th>
                      <th className="text-right">Jumlah Transaksi</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((item) => (
                      <tr key={item.category} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-900">
                          {QURBAN_INCOME_LABELS[item.category] || item.category}
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
                <h2 className="text-lg font-semibold text-gray-900">Pemasukan Qurban per Jenis</h2>
              </div>
              {income.map((item) => (
                <div key={item.category} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">
                        {QURBAN_INCOME_LABELS[item.category] || item.category}
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
                <h2 className="text-lg font-semibold text-gray-900">Laporan Qurban per Periode & Jumlah Hewan</h2>
              </div>

              {periodByAnimal.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Belum ada data qurban per periode dalam filter ini</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Jenis Hewan</th>
                      <th className="text-right">Jumlah Hewan</th>
                      <th className="text-right">Jumlah Transaksi</th>
                      <th className="text-right">Nilai Terkumpul</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodByAnimal.map((item) => (
                      <tr key={`${item.periodId}-${item.animalType}`} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-900">
                          {item.periodName}
                          {item.hijriYear ? ` (${item.hijriYear}H)` : ""}
                        </td>
                        <td className="text-sm text-gray-700">
                          {ANIMAL_LABELS[item.animalType?.toLowerCase()] || item.animalType}
                        </td>
                        <td className="text-sm text-right text-gray-700">{item.animalCount}</td>
                        <td className="text-sm text-right text-gray-700">{item.transactionCount}</td>
                        <td className="text-sm text-right font-medium text-success-600 mono">
                          Rp {formatRupiah(item.totalCollected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="font-bold text-gray-900" colSpan={2}>TOTAL</td>
                      <td className="text-right font-bold">{periodByAnimal.reduce((s, i) => s + i.animalCount, 0)}</td>
                      <td className="text-right font-bold">{periodByAnimal.reduce((s, i) => s + i.transactionCount, 0)}</td>
                      <td className="text-right font-bold text-success-600 mono">
                        Rp {formatRupiah(periodByAnimal.reduce((s, i) => s + i.totalCollected, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Expense - Desktop */}
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pembelian Qurban per Kategori</h2>
              </div>

              {expense.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Tidak ada data pembelian dalam periode ini</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kategori Pembelian</th>
                      <th className="text-right">Jumlah Pembelian</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expense.map((item) => (
                      <tr key={item.category} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-900">
                          {QURBAN_EXPENSE_LABELS[item.category] || item.category}
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
                <h2 className="text-lg font-semibold text-gray-900">Pembelian Qurban per Kategori</h2>
              </div>
              {expense.map((item) => (
                <div key={item.category} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">
                        {QURBAN_EXPENSE_LABELS[item.category] || item.category}
                      </div>
                      <div className="table-card-header-subtitle">{item.count} pembelian</div>
                    </div>
                    <span className="mono font-medium text-danger-600">Rp {formatRupiah(item.total)}</span>
                  </div>
                </div>
              ))}
              {expense.length === 0 && (
                <div className="text-center py-8 text-gray-500">Tidak ada data pembelian</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
