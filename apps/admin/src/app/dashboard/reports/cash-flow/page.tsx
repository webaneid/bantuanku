"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import Autocomplete from "@/components/Autocomplete";

interface CashFlowTransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  kasIn: number;
  kasOut: number;
  account: string;
  accountCode: string;
  paymentMethod: string;
  hasEvidence: boolean;
  refId: string;
  zakatTypeName?: string | null;
}

interface CashFlowSummary {
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  transactionCount: number;
}

interface CashFlowReport {
  summary: CashFlowSummary;
  transactions: CashFlowTransaction[];
}

// Autocomplete options
const periodOptions = [
  { value: "today", label: "Hari Ini" },
  { value: "last7days", label: "7 Hari Terakhir" },
  { value: "thisMonth", label: "Bulan Ini" },
  { value: "custom", label: "Custom" },
];

const accountOptions = [
  { value: "", label: "Semua Akun" },
  { value: "1010", label: "1010 - Kas" },
  { value: "1020", label: "1020 - Bank Operasional" },
];

const refTypeOptions = [
  { value: "", label: "Semua" },
  { value: "donation", label: "Donasi Umum Masuk" },
  { value: "zakat_donation", label: "Pembayaran Zakat Masuk" },
  { value: "disbursement", label: "Penyaluran Umum" },
  { value: "zakat_distribution", label: "Penyaluran Zakat" },
];

export default function CashFlowReportPage() {
  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter states
  const [dateRange, setDateRange] = useState("thisMonth");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return formatLocalDate(firstDay);
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));
  const [accountCode, setAccountCode] = useState("");
  const [refType, setRefType] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<CashFlowTransaction | null>(null);

  // Fetch cash flow report
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["cash-flow", startDate, endDate, accountCode, refType, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(accountCode && { accountCode }),
        ...(refType && { refType }),
        ...(search && { search }),
      });
      const response = await api.get(`/admin/reports/cash-flow?${params}`);
      return response.data?.data as CashFlowReport;
    },
    staleTime: 0, // Always refetch on mount
    refetchOnMount: 'always',
  });

  const summary = reportData?.summary || {
    openingBalance: 0,
    totalIn: 0,
    totalOut: 0,
    closingBalance: 0,
    transactionCount: 0,
  };

  const transactions = reportData?.transactions || [];

  // Handle date range preset
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const now = new Date();
    const today = formatLocalDate(now);

    switch (range) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "last7days":
        const last7 = new Date();
        last7.setDate(last7.getDate() - 6); // 7 hari termasuk hari ini
        setStartDate(formatLocalDate(last7));
        setEndDate(today);
        break;
      case "thisMonth":
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(formatLocalDate(firstDay));
        setEndDate(today);
        break;
      case "custom":
        // Keep current dates
        break;
    }
  };

  const mapTypeLabel = (t: string, zakatType?: string | null) => {
    if (t === 'donation') return 'Donasi Umum';
    if (t === 'zakat_donation') return zakatType || 'Pembayaran Zakat';
    if (t === 'disbursement') return 'Penyaluran Umum';
    if (t === 'zakat_distribution') return zakatType ? `Penyaluran ${zakatType}` : 'Penyaluran Zakat';
    if (t === 'qurban_payment') return 'Order Qurban';
    if (t === 'qurban_savings_deposit') return 'Tabungan Qurban (Setoran)';
    if (t === 'qurban_savings_withdrawal') return 'Tabungan Qurban (Penarikan)';
    return 'Lainnya';
  };

  const getBadgeClass = (t: string) => {
    switch (t) {
      case 'donation': return 'bg-success-50 text-success-700';
      case 'zakat_donation': return 'bg-success-50 text-success-700';
      case 'disbursement': return 'bg-info-50 text-info-700';
      case 'zakat_distribution': return 'bg-accent-50 text-accent-700';
      case 'qurban_payment': return 'bg-info-50 text-info-700';
      case 'qurban_savings_deposit': return 'bg-success-50 text-success-700';
      case 'qurban_savings_withdrawal': return 'bg-warning-50 text-warning-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Tanggal", "Jenis", "Deskripsi", "Kas Masuk", "Kas Keluar", "Akun", "Metode Bayar", "Bukti"];
    const rows = transactions.map(t => {
      const typeLabel = mapTypeLabel(t.type, t.zakatTypeName);

      return [
        new Date(t.date).toLocaleString('id-ID'),
        typeLabel,
        t.description,
        t.kasIn > 0 ? t.kasIn : '',
        t.kasOut > 0 ? t.kasOut : '',
        t.account,
        t.paymentMethod,
        t.hasEvidence ? 'Ada' : 'Belum',
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mutasi-kas-${startDate}-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mutasi Kas & Bank</h1>
          <p className="text-gray-600 mt-1">
            Pergerakan uang masuk dan keluar berdasarkan data transaksi Bantuanku.
          </p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Filter Bar */}
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Preset */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periode
              </label>
              <Autocomplete
                options={periodOptions}
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder="Pilih Periode"
              />
            </div>

            {/* Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Akun
              </label>
              <Autocomplete
                options={accountOptions}
                value={accountCode}
                onChange={setAccountCode}
                placeholder="Semua Akun"
              />
            </div>

            {/* Transaction Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Transaksi
              </label>
              <Autocomplete
                options={refTypeOptions}
                value={refType}
                onChange={setRefType}
                placeholder="Semua"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cari
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama donatur, campaign..."
                className="form-input w-full"
              />
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="btn btn-success btn-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Saldo Awal</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 mono">
              {formatRupiah(summary.openingBalance)}
            </p>
          </div>

          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Kas Masuk</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">
              {formatRupiah(summary.totalIn)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {transactions.filter(t => t.kasIn > 0).length} transaksi
            </p>
          </div>

          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Kas Keluar</p>
            <p className="mt-2 text-2xl font-bold text-danger-600 mono">
              {formatRupiah(summary.totalOut)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {transactions.filter(t => t.kasOut > 0).length} transaksi
            </p>
          </div>

          <div className="card">
            <p className="text-sm font-medium text-gray-600">Saldo Akhir</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">
              {formatRupiah(summary.closingBalance)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Daftar Transaksi ({summary.transactionCount})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Tidak ada transaksi dalam periode ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal & Jam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kas Masuk
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kas Keluar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akun
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metode
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bukti
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(transaction.type)}`}
                        >
                          {mapTypeLabel(transaction.type, transaction.zakatTypeName)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-success-600 mono">
                        {transaction.kasIn > 0 ? formatRupiah(transaction.kasIn) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-danger-600 mono">
                        {transaction.kasOut > 0 ? formatRupiah(transaction.kasOut) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {transaction.account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.hasEvidence
                              ? 'bg-success-50 text-success-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {transaction.hasEvidence ? 'Ada' : 'Belum'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Drawer */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Detail Transaksi</h3>
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tanggal</p>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedTransaction.date).toLocaleString('id-ID')}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Jenis Transaksi</p>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(selectedTransaction.type)}`}
                    >
                      {mapTypeLabel(selectedTransaction.type, selectedTransaction.zakatTypeName)}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Deskripsi</p>
                  <p className="mt-1 text-gray-900">{selectedTransaction.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Kas Masuk</p>
                    <p className="mt-1 text-lg font-bold text-success-600 mono">
                      {selectedTransaction.kasIn > 0
                        ? formatRupiah(selectedTransaction.kasIn)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Kas Keluar</p>
                    <p className="mt-1 text-lg font-bold text-danger-600 mono">
                      {selectedTransaction.kasOut > 0
                        ? formatRupiah(selectedTransaction.kasOut)
                        : '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Akun</p>
                  <p className="mt-1 text-gray-900">
                    {selectedTransaction.accountCode} - {selectedTransaction.account}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Metode Bayar</p>
                  <p className="mt-1 text-gray-900">{selectedTransaction.paymentMethod}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Bukti Transfer</p>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedTransaction.hasEvidence
                          ? 'bg-success-50 text-success-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedTransaction.hasEvidence ? 'Ada Bukti' : 'Belum Ada Bukti'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <a
                  href={
                    selectedTransaction.type === 'donation'
                      ? `/dashboard/donations/${selectedTransaction.refId}`
                      : `/dashboard/ledger/${selectedTransaction.refId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  Lihat Detail {selectedTransaction.type === 'donation' ? 'Donasi' : 'Penyaluran'}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="btn btn-secondary btn-md"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
