"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfYear } from "date-fns";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";

type AccountRow = {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

type NeracaResponse = {
  balanceSheet: {
    assets: AccountRow[];
    liabilities: AccountRow[];
    equity: AccountRow[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  incomeStatement: {
    revenue: AccountRow[];
    expenses: AccountRow[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
};

export default function NeracaReportPage() {
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports-neraca", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await api.get(`/admin/reports/financial-statement?${params.toString()}`);
      return res.data?.data as NeracaResponse;
    },
  });

  const balanceSheet = data?.balanceSheet;
  const incomeStatement = data?.incomeStatement;

  const totalAssets = Number(balanceSheet?.totalAssets || 0);
  const totalLiabilities = Number(balanceSheet?.totalLiabilities || 0);
  const totalEquity = Number(balanceSheet?.totalEquity || 0);
  const rightSide = totalLiabilities + totalEquity;
  const balanceGap = totalAssets - rightSide;
  const isBalanced = Math.abs(balanceGap) < 1;
  const hasRows =
    (balanceSheet?.assets?.length || 0) > 0 ||
    (balanceSheet?.liabilities?.length || 0) > 0 ||
    (incomeStatement?.revenue?.length || 0) > 0 ||
    (incomeStatement?.expenses?.length || 0) > 0;

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neraca</h1>
          <p className="text-gray-600 mt-1">Posisi aset, kewajiban, ekuitas, pendapatan, dan beban</p>
        </div>
      </div>

      <div className="card mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" />
          </div>
        </div>
      </div>

      {isError && (
        <div className="card mb-6 border border-danger-200 bg-danger-50">
          <p className="text-sm font-medium text-danger-700">Gagal memuat data neraca</p>
          <p className="text-sm text-danger-600 mt-1">{(error as any)?.response?.data?.message || (error as Error)?.message || "Terjadi kesalahan."}</p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      ) : (
        <>
          {!hasRows && (
            <div className="card mb-6 border border-warning-200 bg-warning-50">
              <p className="text-sm font-semibold text-warning-700">Data neraca masih kosong</p>
              <p className="text-sm text-warning-700 mt-1">
                Belum ada transaksi/pencairan berstatus paid pada periode ini. Coba ubah periode tanggal atau pastikan transaksi sudah terbayar.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <p className="text-sm text-gray-600">Total Aset</p>
              <p className="text-2xl font-bold text-primary-700 mono mt-1">Rp {formatRupiah(totalAssets)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Total Kewajiban</p>
              <p className="text-2xl font-bold text-danger-700 mono mt-1">Rp {formatRupiah(totalLiabilities)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Total Ekuitas</p>
              <p className="text-2xl font-bold text-success-700 mono mt-1">Rp {formatRupiah(totalEquity)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-gray-900 mono mt-1">Rp {formatRupiah(Number(incomeStatement?.netIncome || 0))}</p>
            </div>
          </div>

          <div className={`card mb-6 border ${isBalanced ? "border-success-200 bg-success-50" : "border-warning-200 bg-warning-50"}`}>
            <p className={`font-semibold ${isBalanced ? "text-success-700" : "text-warning-700"}`}>
              {isBalanced ? "Neraca balance" : "Neraca belum balance"}
            </p>
            <p className={`text-sm mt-1 ${isBalanced ? "text-success-700" : "text-warning-700"}`}>
              Aset: Rp {formatRupiah(totalAssets)} · Kewajiban + Ekuitas: Rp {formatRupiah(rightSide)} · Selisih: Rp {formatRupiah(Math.abs(balanceGap))}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Aset</h3></div>
              <table className="table">
                <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
                <tbody>
                  {(balanceSheet?.assets || []).map((row) => (
                    <tr key={row.accountCode}><td className="text-sm">{row.accountCode} - {row.accountName}</td><td className="text-right mono text-sm">Rp {formatRupiah(Number(row.balance || 0))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Kewajiban</h3></div>
              <table className="table">
                <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
                <tbody>
                  {(balanceSheet?.liabilities || []).map((row) => (
                    <tr key={row.accountCode}><td className="text-sm">{row.accountCode} - {row.accountName}</td><td className="text-right mono text-sm">Rp {formatRupiah(Number(row.balance || 0))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Pendapatan</h3></div>
              <table className="table">
                <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
                <tbody>
                  {(incomeStatement?.revenue || []).map((row) => (
                    <tr key={row.accountCode}><td className="text-sm">{row.accountCode} - {row.accountName}</td><td className="text-right mono text-sm text-success-700">Rp {formatRupiah(Number(row.balance || 0))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-container">
              <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Beban</h3></div>
              <table className="table">
                <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
                <tbody>
                  {(incomeStatement?.expenses || []).map((row) => (
                    <tr key={row.accountCode}><td className="text-sm">{row.accountCode} - {row.accountName}</td><td className="text-right mono text-sm text-danger-700">Rp {formatRupiah(Number(row.balance || 0))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
