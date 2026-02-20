"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import Autocomplete from "@/components/Autocomplete";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<CashFlowTransaction | null>(null);

  // Fetch cash flow report
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["cash-flow", startDate, endDate, accountCode, refType, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(accountCode && { accountCode }),
        ...(refType && { refType }),
        ...(search && { search }),
      });
      const response = await api.get(`/admin/reports/cash-flow?${params}`);
      return response.data?.data as CashFlowReport;
    },
    staleTime: 0,
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
  const totalPages = Number(reportData?.pagination?.totalPages || 1);

  // Handle date range preset
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setPage(1);
    const now = new Date();
    const today = formatLocalDate(now);

    switch (range) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "last7days":
        const last7 = new Date();
        last7.setDate(last7.getDate() - 6);
        setStartDate(formatLocalDate(last7));
        setEndDate(today);
        break;
      case "thisMonth":
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(formatLocalDate(firstDay));
        setEndDate(today);
        break;
      case "custom":
        break;
    }
  };

  const mapTypeLabel = (t: string, zakatType?: string | null) => {
    if (t === 'donation') return 'Donasi Umum';
    if (t === 'campaign') return 'Donasi Campaign';
    if (t === 'zakat') return 'Pembayaran Zakat';
    if (t === 'qurban') return 'Pembayaran Qurban';
    if (t === 'zakat_donation') return zakatType || 'Pembayaran Zakat';
    if (t === 'disbursement') return 'Penyaluran Umum';
    if (t === 'zakat_distribution') return zakatType ? `Penyaluran ${zakatType}` : 'Penyaluran Zakat';
    if (t === 'qurban_disbursement') return 'Pembelian Qurban';
    if (t === 'campaign_disbursement') return 'Penyaluran Campaign';
    if (t === 'qurban_payment') return 'Order Qurban';
    if (t === 'qurban_savings_deposit') return 'Tabungan Qurban (Setoran)';
    if (t === 'qurban_savings_withdrawal') return 'Tabungan Qurban (Penarikan)';
    if (t === 'unique_code') return 'Kode Unik';
    return 'Lainnya';
  };

  const getBadgeClass = (t: string) => {
    switch (t) {
      case 'donation': return 'bg-success-50 text-success-700';
      case 'campaign': return 'bg-success-50 text-success-700';
      case 'zakat': return 'bg-success-50 text-success-700';
      case 'qurban': return 'bg-success-50 text-success-700';
      case 'zakat_donation': return 'bg-success-50 text-success-700';
      case 'disbursement': return 'bg-info-50 text-info-700';
      case 'zakat_distribution': return 'bg-accent-50 text-accent-700';
      case 'qurban_disbursement': return 'bg-purple-50 text-purple-700';
      case 'campaign_disbursement': return 'bg-blue-50 text-blue-700';
      case 'qurban_payment': return 'bg-info-50 text-info-700';
      case 'qurban_savings_deposit': return 'bg-success-50 text-success-700';
      case 'qurban_savings_withdrawal': return 'bg-warning-50 text-warning-700';
      case 'unique_code': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    exportToExcel({
      data: transactions.map((t) => ({
        date: new Date(t.date).toLocaleString("id-ID"),
        type: mapTypeLabel(t.type, t.zakatTypeName),
        description: t.description,
        kasIn: t.kasIn > 0 ? t.kasIn : "",
        kasOut: t.kasOut > 0 ? t.kasOut : "",
        account: t.account,
        paymentMethod: t.paymentMethod,
        evidence: t.hasEvidence ? "Ada" : "Belum",
      })),
      columns: [
        { header: "Tanggal", key: "date", width: 20 },
        { header: "Jenis", key: "type", width: 22 },
        { header: "Deskripsi", key: "description", width: 40 },
        { header: "Kas Masuk", key: "kasIn", width: 18, format: "currency" },
        { header: "Kas Keluar", key: "kasOut", width: 18, format: "currency" },
        { header: "Akun", key: "account", width: 20 },
        { header: "Metode", key: "paymentMethod", width: 15 },
        { header: "Bukti", key: "evidence", width: 10 },
      ],
      filename: `Mutasi-Kas-Bank-${startDate}-${endDate}`,
      title: "Laporan Mutasi Kas & Bank",
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      summaryRow: {
        date: "TOTAL",
        kasIn: summary.totalIn,
        kasOut: summary.totalOut,
      },
    });
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
        <ExportButton
          onExportExcel={handleExportExcel}
          onPrint={() => window.print()}
        />
      </div>

      <div className="space-y-6">

        {/* Filter Bar */}
        <div className="bg-white shadow rounded-lg p-6 space-y-4 no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
              <Autocomplete
                options={periodOptions}
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder="Pilih Periode"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Akun</label>
              <Autocomplete
                options={accountOptions}
                value={accountCode}
                onChange={(value) => {
                  setAccountCode(value);
                  setPage(1);
                }}
                placeholder="Semua Akun"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Transaksi</label>
              <Autocomplete
                options={refTypeOptions}
                value={refType}
                onChange={(value) => {
                  setRefType(value);
                  setPage(1);
                }}
                placeholder="Semua"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nama donatur, campaign..."
                className="form-input w-full"
              />
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="form-input w-full"
                />
              </div>
            </div>
          )}
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
              {summary.transactionCount} transaksi total
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Kas Keluar</p>
            <p className="mt-2 text-2xl font-bold text-danger-600 mono">
              {formatRupiah(summary.totalOut)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Halaman {page} dari {totalPages}
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
            <>
              {/* Desktop Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tanggal & Jam</th>
                      <th>Jenis</th>
                      <th>Deskripsi</th>
                      <th className="text-right">Kas Masuk</th>
                      <th className="text-right">Kas Keluar</th>
                      <th>Akun</th>
                      <th>Metode</th>
                      <th className="text-center">Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr
                        key={`${transaction.type}-${transaction.id}-${transaction.date}-${index}`}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <td className="text-sm text-gray-900">
                          {new Date(transaction.date).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(transaction.type)}`}
                          >
                            {mapTypeLabel(transaction.type, transaction.zakatTypeName)}
                          </span>
                        </td>
                        <td className="text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="text-right text-sm font-medium text-success-600 mono">
                          {transaction.kasIn > 0 ? formatRupiah(transaction.kasIn) : '—'}
                        </td>
                        <td className="text-right text-sm font-medium text-danger-600 mono">
                          {transaction.kasOut > 0 ? formatRupiah(transaction.kasOut) : '—'}
                        </td>
                        <td className="text-sm text-gray-600">
                          {transaction.account}
                        </td>
                        <td className="text-sm text-gray-600">
                          {transaction.paymentMethod}
                        </td>
                        <td className="text-center">
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

                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between no-print">
                    <span className="text-sm text-gray-600">Hal {page} dari {totalPages}</span>
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
                {transactions.map((transaction, index) => (
                  <div
                    key={`${transaction.type}-${transaction.id}-${transaction.date}-${index}`}
                    className="table-card cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="table-card-header">
                      <div className="table-card-header-left">
                        <div className="table-card-header-title">
                          {transaction.description}
                        </div>
                        <div className="table-card-header-subtitle">
                          {new Date(transaction.date).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(transaction.type)}`}>
                        {mapTypeLabel(transaction.type, transaction.zakatTypeName)}
                      </span>
                    </div>

                    {transaction.kasIn > 0 && (
                      <div className="table-card-row">
                        <span className="table-card-row-label">Kas Masuk</span>
                        <span className="table-card-row-value mono text-success-600 font-medium">
                          Rp {formatRupiah(transaction.kasIn)}
                        </span>
                      </div>
                    )}

                    {transaction.kasOut > 0 && (
                      <div className="table-card-row">
                        <span className="table-card-row-label">Kas Keluar</span>
                        <span className="table-card-row-value mono text-danger-600 font-medium">
                          Rp {formatRupiah(transaction.kasOut)}
                        </span>
                      </div>
                    )}

                    <div className="table-card-row">
                      <span className="table-card-row-label">Metode</span>
                      <span className="table-card-row-value">{transaction.paymentMethod}</span>
                    </div>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 no-print">
                    <span className="text-sm text-gray-600">Hal {page}/{totalPages}</span>
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
            </>
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(selectedTransaction.type)}`}>
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
                      {selectedTransaction.kasIn > 0 ? formatRupiah(selectedTransaction.kasIn) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Kas Keluar</p>
                    <p className="mt-1 text-lg font-bold text-danger-600 mono">
                      {selectedTransaction.kasOut > 0 ? formatRupiah(selectedTransaction.kasOut) : '—'}
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedTransaction.hasEvidence ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedTransaction.hasEvidence ? 'Ada Bukti' : 'Belum Ada Bukti'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
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
