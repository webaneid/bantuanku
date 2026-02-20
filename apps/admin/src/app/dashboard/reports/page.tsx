"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { format, startOfMonth } from "date-fns";
import { formatRupiah } from "@/lib/format";

type DashboardResponse = {
  period: { startDate: string | null; endDate: string | null };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    donationCount: number;
    disbursementCount: number;
    uniqueDonors: number;
    totalCampaigns: number;
    activeCampaigns: number;
  };
};

type ConsistencyCheckResponse = {
  period: { startDate: string | null; endDate: string | null };
  hasMismatch: boolean;
  standards: {
    incomeCategories: string[];
    expenseCategories: string[];
  };
  invalid: {
    transactions: Array<{ category: string; count: number }>;
    disbursements: Array<{ category: string; count: number }>;
  };
};

const quickLinks = [
  { label: "Catatan Mutasi", href: "/dashboard/reports/mutation" },
  { label: "Audit Kategori COA", href: "/dashboard/reports/category-audit" },
  { label: "Mutasi Kas & Bank", href: "/dashboard/reports/cash-flow" },
  { label: "Neraca", href: "/dashboard/reports/neraca" },
  { label: "Saldo Titipan Dana", href: "/dashboard/reports/liability-balance" },
  { label: "Bagi Hasil Amil", href: "/dashboard/reports/revenue-sharing" },
  { label: "Laporan Zakat", href: "/dashboard/reports/zakat" },
  { label: "Laporan Qurban", href: "/dashboard/reports/qurban" },
  { label: "Laporan Kode Unik", href: "/dashboard/reports/unique-codes" },
  { label: "Penyembelihan Qurban", href: "/dashboard/reports/qurban-execution" },
  { label: "Per Program", href: "/dashboard/reports/program" },
  { label: "Per Mitra", href: "/dashboard/reports/mitra" },
  { label: "Per Fundraiser", href: "/dashboard/reports/fundraiser" },
  { label: "Per Rekening", href: "/dashboard/reports/rekening" },
  { label: "Per Donatur", href: "/dashboard/reports/donatur" },
];

export default function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);

  const { data: dashboardData, isLoading, isError, error } = useQuery({
    queryKey: ["reports-dashboard", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/admin/reports/dashboard?${params.toString()}`);
      return response.data?.data as DashboardResponse;
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: consistencyData, isLoading: loadingConsistency, isError: consistencyError } = useQuery({
    queryKey: ["reports-consistency-check", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/admin/reports/consistency-check?${params.toString()}`);
      return response.data?.data as ConsistencyCheckResponse;
    },
    enabled: !!startDate && !!endDate,
    refetchInterval: 30_000,
  });

  const summary = dashboardData?.summary || {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    donationCount: 0,
    disbursementCount: 0,
    uniqueDonors: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Laporan</h1>
          <p className="text-gray-600 mt-1">Ringkasan keuangan dan akses cepat semua laporan</p>
        </div>
      </div>

      <div className="card mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="flex items-end text-sm text-gray-500">
            Periode ringkasan mengikuti tanggal filter di atas.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pemasukan</h3>
          <p className="text-3xl font-bold text-success-600 mono">Rp {formatRupiah(summary.totalIncome)}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pengeluaran</h3>
          <p className="text-3xl font-bold text-danger-600 mono">Rp {formatRupiah(summary.totalExpense)}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Saldo</h3>
          <p className={`text-3xl font-bold mono ${summary.balance >= 0 ? "text-primary-600" : "text-danger-600"}`}>
            Rp {formatRupiah(Math.abs(summary.balance))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-600">Donasi</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary.donationCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pencairan</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary.disbursementCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Donatur Unik</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary.uniqueDonors}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Campaign Aktif</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary.activeCampaigns}/{summary.totalCampaigns}</p>
        </div>
      </div>

      <div className={`card mb-8 border ${consistencyData?.hasMismatch ? "border-danger-200 bg-danger-50" : "border-success-200 bg-success-50"}`}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Consistency Check Kategori COA</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/reports/category-audit?startDate=${startDate}&endDate=${endDate}`}
              className="btn btn-outline btn-sm"
            >
              Lihat detail mismatch
            </Link>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${consistencyData?.hasMismatch ? "bg-danger-100 text-danger-700" : "bg-success-100 text-success-700"}`}>
              {consistencyData?.hasMismatch ? "Mismatch Terdeteksi" : "Valid"}
            </span>
          </div>
        </div>

        {loadingConsistency ? (
          <p className="text-sm text-gray-600">Memeriksa konsistensi kategori...</p>
        ) : consistencyError ? (
          <p className="text-sm text-danger-700">Gagal memuat consistency check.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Invalid Category pada Transactions</p>
              {consistencyData?.invalid?.transactions?.length ? (
                <ul className="mt-1 text-sm text-danger-700 list-disc list-inside">
                  {consistencyData.invalid.transactions.map((item) => (
                    <li key={`txn-${item.category}`}>{item.category} ({item.count})</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-success-700 mt-1">Tidak ada mismatch.</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800">Invalid Category pada Disbursements</p>
              {consistencyData?.invalid?.disbursements?.length ? (
                <ul className="mt-1 text-sm text-danger-700 list-disc list-inside">
                  {consistencyData.invalid.disbursements.map((item) => (
                    <li key={`disb-${item.category}`}>{item.category} ({item.count})</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-success-700 mt-1">Tidak ada mismatch.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {isError && (
        <div className="card mb-6 border border-danger-200 bg-danger-50">
          <p className="text-sm font-medium text-danger-700">Gagal memuat data laporan</p>
          <p className="text-sm text-danger-600 mt-1">
            {(error as any)?.response?.data?.message || (error as Error)?.message || "Terjadi kesalahan saat mengambil data."}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="animate-pulse space-y-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      )}
    </div>
  );
}
