"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel, exportMultiSheetExcel } from "@/utils/export-excel";

interface ProgramRow {
  id: string;
  title: string;
  category: string;
  goal: number;
  collected: number;
  donorCount: number;
  status: string;
  periodIncome: number;
  periodIncomeCount: number;
  periodExpense: number;
  periodExpenseCount: number;
  periodBalance: number;
}

interface ProgramDetail {
  campaign: { id: string; title: string; goal: number; collected: number; donorCount: number; status: string };
  summary: { totalIncome: number; totalExpense: number; balance: number };
  income: { id: string; transactionNumber: string; donorName: string; totalAmount: number; paidAt: string }[];
  expense: { id: string; disbursementNumber: string; amount: number; category: string; recipientName: string; purpose: string; paidAt: string }[];
}

const PAGE_SIZE = 20;

export default function ProgramReportPage() {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["program-summary", startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate, page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get(`/admin/reports/program-summary?${params}`);
      return res.data?.data as { summary: any; campaigns: ProgramRow[]; pagination?: { page: number; totalPages: number } };
    },
  });

  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["program-detail", selectedId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ campaignId: selectedId!, startDate, endDate });
      const res = await api.get(`/admin/reports/program-detail?${params}`);
      return res.data?.data as ProgramDetail;
    },
    enabled: !!selectedId,
  });

  const campaigns = summaryData?.campaigns || [];
  const summary = summaryData?.summary || { totalIncome: 0, totalExpense: 0, balance: 0, campaignCount: 0 };
  const totalPages = Number(summaryData?.pagination?.totalPages || 1);

  const handleExportSummary = () => {
    exportToExcel({
      data: campaigns.map((c) => ({
        title: c.title,
        category: c.category,
        status: c.status,
        goal: c.goal,
        collected: c.collected,
        donorCount: c.donorCount,
        periodIncome: c.periodIncome,
        periodExpense: c.periodExpense,
        periodBalance: c.periodBalance,
      })),
      columns: [
        { header: "Program", key: "title", width: 35 },
        { header: "Kategori", key: "category", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Target", key: "goal", width: 18, format: "currency" },
        { header: "Terkumpul", key: "collected", width: 18, format: "currency" },
        { header: "Donatur", key: "donorCount", width: 10, format: "number" },
        { header: "Pemasukan", key: "periodIncome", width: 18, format: "currency" },
        { header: "Pengeluaran", key: "periodExpense", width: 18, format: "currency" },
        { header: "Saldo", key: "periodBalance", width: 18, format: "currency" },
      ],
      filename: `Laporan-Per-Program-${startDate}-${endDate}`,
      title: "Laporan Per Program",
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
    });
  };

  const handleExportDetail = () => {
    if (!detailData) return;
    exportMultiSheetExcel({
      sheets: [
        {
          name: "Pemasukan",
          title: `Pemasukan - ${detailData.campaign.title}`,
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          data: detailData.income.map((t) => ({
            date: t.paidAt ? format(new Date(t.paidAt), "dd/MM/yyyy", { locale: idLocale }) : "-",
            number: t.transactionNumber,
            donor: t.donorName,
            amount: t.totalAmount,
          })),
          columns: [
            { header: "Tanggal", key: "date", width: 14 },
            { header: "No. Transaksi", key: "number", width: 20 },
            { header: "Donatur", key: "donor", width: 25 },
            { header: "Jumlah", key: "amount", width: 18, format: "currency" },
          ],
          summaryRow: { date: "TOTAL", amount: detailData.summary.totalIncome },
        },
        {
          name: "Pengeluaran",
          title: `Pengeluaran - ${detailData.campaign.title}`,
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          data: detailData.expense.map((d) => ({
            date: d.paidAt ? format(new Date(d.paidAt), "dd/MM/yyyy", { locale: idLocale }) : "-",
            number: d.disbursementNumber,
            category: d.category,
            recipient: d.recipientName,
            amount: d.amount,
          })),
          columns: [
            { header: "Tanggal", key: "date", width: 14 },
            { header: "No. Pencairan", key: "number", width: 20 },
            { header: "Kategori", key: "category", width: 20 },
            { header: "Penerima", key: "recipient", width: 25 },
            { header: "Jumlah", key: "amount", width: 18, format: "currency" },
          ],
          summaryRow: { date: "TOTAL", amount: detailData.summary.totalExpense },
        },
      ],
      filename: `Detail-Program-${detailData.campaign.title.replace(/\s+/g, "-").slice(0, 30)}-${startDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Per Program</h1>
          <p className="text-gray-600 mt-1">Performa keuangan setiap program/campaign</p>
        </div>
        <ExportButton
          onExportExcel={selectedId ? handleExportDetail : handleExportSummary}
          onPrint={() => window.print()}
        />
      </div>

      <div className="space-y-6">
        {/* Filter */}
        <div className="card no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="form-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="form-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value || null)}
                className="form-input w-full"
              >
                <option value="">Semua Program</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Total Program</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{summary.campaignCount}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Pemasukan Periode</p>
            <p className="mt-2 text-2xl font-bold text-success-600 mono">Rp {formatRupiah(summary.totalIncome)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Pengeluaran Periode</p>
            <p className="mt-2 text-2xl font-bold text-danger-600 mono">Rp {formatRupiah(summary.totalExpense)}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Saldo Periode</p>
            <p className="mt-2 text-2xl font-bold text-primary-600 mono">Rp {formatRupiah(summary.balance)}</p>
          </div>
        </div>

        {!selectedId ? (
          <>
            {/* Summary Table - Desktop */}
            <div className="table-container">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th className="text-right">Target</th>
                      <th className="text-right">Terkumpul</th>
                      <th className="text-right">Pemasukan</th>
                      <th className="text-right">Pengeluaran</th>
                      <th className="text-right">Saldo</th>
                      <th className="text-center">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const pct = c.goal > 0 ? Math.min(100, (c.collected / c.goal) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(c.id)}>
                          <td>
                            <div className="text-sm font-medium text-gray-900">{c.title}</div>
                            <div className="text-xs text-gray-500">{c.category} · {c.donorCount} donatur</div>
                          </td>
                          <td className="text-right text-sm mono">Rp {formatRupiah(c.goal)}</td>
                          <td className="text-right text-sm mono text-success-600 font-medium">Rp {formatRupiah(c.collected)}</td>
                          <td className="text-right text-sm mono">{c.periodIncome > 0 ? `Rp ${formatRupiah(c.periodIncome)}` : "-"}</td>
                          <td className="text-right text-sm mono">{c.periodExpense > 0 ? `Rp ${formatRupiah(c.periodExpense)}` : "-"}</td>
                          <td className="text-right text-sm mono font-medium">{c.periodBalance !== 0 ? `Rp ${formatRupiah(c.periodBalance)}` : "-"}</td>
                          <td className="text-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{pct.toFixed(0)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!isLoading && campaigns.length === 0 && (
                <div className="p-6 text-center text-gray-500">Belum ada data program</div>
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

            {/* Summary - Mobile Cards */}
            <div className="table-mobile-cards">
              {campaigns.map((c) => {
                const pct = c.goal > 0 ? Math.min(100, (c.collected / c.goal) * 100) : 0;
                return (
                  <div key={c.id} className="table-card cursor-pointer" onClick={() => setSelectedId(c.id)}>
                    <div className="table-card-header">
                      <div className="table-card-header-left">
                        <div className="table-card-header-title">{c.title}</div>
                        <div className="table-card-header-subtitle">{c.category} · {c.donorCount} donatur</div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="table-card-row">
                      <span className="table-card-row-label">Terkumpul</span>
                      <span className="table-card-row-value mono text-success-600 font-medium">Rp {formatRupiah(c.collected)}</span>
                    </div>
                    {c.periodIncome > 0 && (
                      <div className="table-card-row">
                        <span className="table-card-row-label">Pemasukan</span>
                        <span className="table-card-row-value mono">Rp {formatRupiah(c.periodIncome)}</span>
                      </div>
                    )}
                    {c.periodExpense > 0 && (
                      <div className="table-card-row">
                        <span className="table-card-row-label">Pengeluaran</span>
                        <span className="table-card-row-value mono">Rp {formatRupiah(c.periodExpense)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

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
              <button className="btn btn-outline btn-sm mb-4" onClick={() => setSelectedId(null)}>
                ← Kembali ke Semua Program
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-6 text-center text-gray-500">Loading detail...</div>
            ) : detailData ? (
              <>
                <div className="card mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{detailData.campaign.title}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">Target:</span> <span className="mono font-medium">Rp {formatRupiah(detailData.campaign.goal)}</span></div>
                    <div><span className="text-gray-500">Terkumpul:</span> <span className="mono font-medium text-success-600">Rp {formatRupiah(detailData.campaign.collected)}</span></div>
                    <div><span className="text-gray-500">Disalurkan:</span> <span className="mono font-medium text-danger-600">Rp {formatRupiah(detailData.summary.totalExpense)}</span></div>
                    <div><span className="text-gray-500">Saldo:</span> <span className="mono font-medium text-primary-600">Rp {formatRupiah(detailData.summary.balance)}</span></div>
                  </div>
                </div>

                {/* Income Table */}
                <div className="table-container mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Pemasukan ({detailData.income.length})</h3>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>No. Transaksi</th>
                        <th>Donatur</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.income.map((t) => (
                        <tr key={t.id}>
                          <td className="text-sm text-gray-600">{t.paidAt ? format(new Date(t.paidAt), "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                          <td className="text-sm">{t.transactionNumber}</td>
                          <td className="text-sm">{t.donorName}</td>
                          <td className="text-right text-sm mono text-success-600 font-medium">Rp {formatRupiah(t.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {detailData.income.length > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={3} className="font-bold">TOTAL</td>
                          <td className="text-right font-bold text-success-600 mono">Rp {formatRupiah(detailData.summary.totalIncome)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {detailData.income.length === 0 && <div className="p-6 text-center text-gray-500">Tidak ada pemasukan</div>}
                </div>

                {/* Expense Table */}
                <div className="table-container">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Pengeluaran ({detailData.expense.length})</h3>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>No. Pencairan</th>
                        <th>Penerima</th>
                        <th>Tujuan</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.expense.map((d) => (
                        <tr key={d.id}>
                          <td className="text-sm text-gray-600">{d.paidAt ? format(new Date(d.paidAt), "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                          <td className="text-sm">{d.disbursementNumber}</td>
                          <td className="text-sm">{d.recipientName}</td>
                          <td className="text-sm">{d.purpose || "-"}</td>
                          <td className="text-right text-sm mono text-danger-600 font-medium">Rp {formatRupiah(d.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {detailData.expense.length > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={4} className="font-bold">TOTAL</td>
                          <td className="text-right font-bold text-danger-600 mono">Rp {formatRupiah(detailData.summary.totalExpense)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {detailData.expense.length === 0 && <div className="p-6 text-center text-gray-500">Tidak ada pengeluaran</div>}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
