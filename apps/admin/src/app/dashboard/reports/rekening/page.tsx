"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

interface AccountRow {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  programs: string[];
  totalIn: number;
  transactionCount: number;
  balance: number;
}

interface MutationRow {
  id: string;
  date: string;
  description: string;
  type: string;
  kasIn: number;
  kasOut: number;
  runningBalance: number;
}

interface AccountDetail {
  account: { id: string; bankName: string; accountNumber: string; accountName: string };
  summary: { openingBalance: number; totalIn: number; totalOut: number; closingBalance: number };
  mutations: MutationRow[];
}

const PAGE_SIZE = 20;

export default function RekeningReportPage() {
  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["rekening-summary", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get(`/admin/reports/rekening-summary?${params.toString()}`);
      return res.data?.data as { accounts: AccountRow[]; summary: any; pagination?: { totalPages: number } };
    },
  });

  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["rekening-detail", selectedId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ bankAccountId: selectedId!, startDate, endDate });
      const res = await api.get(`/admin/reports/rekening-detail?${params}`);
      return res.data?.data as AccountDetail;
    },
    enabled: !!selectedId,
  });

  const accounts = summaryData?.accounts || [];
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalPages = Number(summaryData?.pagination?.totalPages || 1);

  const handleExportSummary = () => {
    exportToExcel({
      data: accounts.map((a) => ({
        bank: a.bankName,
        number: a.accountNumber,
        name: a.accountName,
        transactions: a.transactionCount,
        totalIn: a.totalIn,
        balance: a.balance,
      })),
      columns: [
        { header: "Bank", key: "bank", width: 15 },
        { header: "No. Rekening", key: "number", width: 20 },
        { header: "Atas Nama", key: "name", width: 25 },
        { header: "Transaksi", key: "transactions", width: 12, format: "number" },
        { header: "Total Masuk", key: "totalIn", width: 18, format: "currency" },
        { header: "Saldo", key: "balance", width: 18, format: "currency" },
      ],
      filename: `Laporan-Per-Rekening-${new Date().toISOString().slice(0, 10)}`,
      title: "Laporan Per Rekening",
      summaryRow: { bank: "TOTAL", totalIn: accounts.reduce((s, a) => s + a.totalIn, 0), balance: totalBalance },
    });
  };

  const handleExportDetail = () => {
    if (!detailData) return;
    exportToExcel({
      data: detailData.mutations.map((m) => ({
        date: m.date ? format(new Date(m.date), "dd/MM/yyyy", { locale: idLocale }) : "-",
        description: m.description,
        masuk: m.kasIn > 0 ? m.kasIn : "",
        keluar: m.kasOut > 0 ? m.kasOut : "",
        saldo: m.runningBalance,
      })),
      columns: [
        { header: "Tanggal", key: "date", width: 14 },
        { header: "Keterangan", key: "description", width: 45 },
        { header: "Masuk", key: "masuk", width: 18, format: "currency" },
        { header: "Keluar", key: "keluar", width: 18, format: "currency" },
        { header: "Saldo", key: "saldo", width: 18, format: "currency" },
      ],
      filename: `Mutasi-${detailData.account.bankName}-${startDate}-${endDate}`,
      title: `Mutasi Rekening ${detailData.account.bankName} - ${detailData.account.accountNumber}`,
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Per Rekening</h1>
          <p className="text-gray-600 mt-1">Mutasi per bank account organisasi</p>
        </div>
        <ExportButton
          onExportExcel={selectedId ? handleExportDetail : handleExportSummary}
          onPrint={() => window.print()}
        />
      </div>

      <div className="space-y-6">
        {!selectedId ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <p className="text-sm font-medium text-gray-600">Jumlah Rekening</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{accounts.length}</p>
              </div>
              <div className="card">
                <p className="text-sm font-medium text-gray-600">Total Saldo (Estimasi)</p>
                <p className="mt-2 text-2xl font-bold text-primary-600 mono">Rp {formatRupiah(totalBalance)}</p>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="table-container">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rekening</th>
                      <th className="text-center">Transaksi</th>
                      <th className="text-right">Total Masuk</th>
                      <th className="text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(a.id)}>
                        <td>
                          <div className="text-sm font-medium text-gray-900">{a.bankName} - {a.accountNumber}</div>
                          <div className="text-xs text-gray-500">{a.accountName}</div>
                        </td>
                        <td className="text-center text-sm">{a.transactionCount}</td>
                        <td className="text-right text-sm mono text-success-600 font-medium">Rp {formatRupiah(a.totalIn)}</td>
                        <td className="text-right text-sm mono text-primary-600 font-bold">Rp {formatRupiah(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {accounts.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td className="font-bold">TOTAL</td>
                        <td />
                        <td className="text-right font-bold text-success-600 mono">Rp {formatRupiah(accounts.reduce((s, a) => s + a.totalIn, 0))}</td>
                        <td className="text-right font-bold text-primary-600 mono">Rp {formatRupiah(totalBalance)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
              {!isLoading && accounts.length === 0 && (
                <div className="p-6 text-center text-gray-500">Belum ada rekening terdaftar</div>
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
              {accounts.map((a) => (
                <div key={a.id} className="table-card cursor-pointer" onClick={() => setSelectedId(a.id)}>
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{a.bankName} - {a.accountNumber}</div>
                      <div className="table-card-header-subtitle">{a.accountName} · {a.transactionCount} transaksi</div>
                    </div>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Saldo</span>
                    <span className="table-card-row-value mono text-primary-600 font-bold">Rp {formatRupiah(a.balance)}</span>
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
            {/* Detail Mode */}
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
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{detailData.account.bankName} - {detailData.account.accountNumber}</h2>
                  <p className="text-sm text-gray-600 mb-3">{detailData.account.accountName}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">Saldo Awal:</span> <span className="mono font-medium">Rp {formatRupiah(detailData.summary.openingBalance)}</span></div>
                    <div><span className="text-gray-500">Kas Masuk:</span> <span className="mono font-medium text-success-600">Rp {formatRupiah(detailData.summary.totalIn)}</span></div>
                    <div><span className="text-gray-500">Kas Keluar:</span> <span className="mono font-medium text-danger-600">Rp {formatRupiah(detailData.summary.totalOut)}</span></div>
                    <div><span className="text-gray-500">Saldo Akhir:</span> <span className="mono font-bold text-primary-600">Rp {formatRupiah(detailData.summary.closingBalance)}</span></div>
                  </div>
                </div>

                {/* Mutations Table */}
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Keterangan</th>
                        <th className="text-right">Masuk</th>
                        <th className="text-right">Keluar</th>
                        <th className="text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.mutations.map((m) => (
                        <tr key={m.id}>
                          <td className="text-sm text-gray-600">{m.date ? format(new Date(m.date), "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                          <td className="text-sm">{m.description}</td>
                          <td className="text-right text-sm mono">
                            {m.kasIn > 0 ? <span className="text-success-600 font-medium">Rp {formatRupiah(m.kasIn)}</span> : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="text-right text-sm mono">
                            {m.kasOut > 0 ? <span className="text-danger-600 font-medium">Rp {formatRupiah(m.kasOut)}</span> : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="text-right text-sm mono font-medium">Rp {formatRupiah(m.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detailData.mutations.length === 0 && (
                    <div className="p-6 text-center text-gray-500">Tidak ada mutasi pada periode ini</div>
                  )}
                </div>

                {/* Mobile Mutations */}
                <div className="table-mobile-cards">
                  {detailData.mutations.map((m) => (
                    <div key={m.id} className="table-card">
                      <div className="table-card-header">
                        <div className="table-card-header-left">
                          <div className="table-card-header-title text-xs">{m.description}</div>
                          <div className="table-card-header-subtitle">{m.date ? format(new Date(m.date), "dd MMM yyyy", { locale: idLocale }) : "-"}</div>
                        </div>
                      </div>
                      {m.kasIn > 0 && (
                        <div className="table-card-row">
                          <span className="table-card-row-label">Masuk</span>
                          <span className="table-card-row-value mono text-success-600">Rp {formatRupiah(m.kasIn)}</span>
                        </div>
                      )}
                      {m.kasOut > 0 && (
                        <div className="table-card-row">
                          <span className="table-card-row-label">Keluar</span>
                          <span className="table-card-row-value mono text-danger-600">Rp {formatRupiah(m.kasOut)}</span>
                        </div>
                      )}
                      <div className="table-card-row">
                        <span className="table-card-row-label">Saldo</span>
                        <span className="table-card-row-value mono font-medium">Rp {formatRupiah(m.runningBalance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
