"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { format, startOfYear } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

type MutasiRow = {
  id: string;
  date: Date | null;
  description: string;
  category: string;
  debit: number;
  credit: number;
};

const TYPE_LABELS: Record<string, string> = {
  campaign: "Donasi Campaign",
  zakat: "Zakat",
  qurban: "Qurban",
  qurban_savings_deposit: "Tabungan Qurban (Setor)",
  qurban_savings_withdrawal: "Tabungan Qurban (Tarik)",
  unique_code: "Kode Unik",
  disbursement: "Pencairan",
  campaign_disbursement: "Pencairan Campaign",
  zakat_distribution: "Penyaluran Zakat",
  qurban_disbursement: "Pencairan Qurban",
};

const PAGE_SIZE = 50;

export default function MutationReportPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const yearStart = format(startOfYear(new Date()), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: reportData, isLoading, isError, error } = useQuery({
    queryKey: ["catatan-mutasi", startDate, endDate, search, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        startDate,
        endDate,
        page,
        limit: PAGE_SIZE,
      };
      if (search.trim()) params.search = search.trim();

      const response = await api.get("/admin/reports/cash-flow", { params });
      return response.data?.data;
    },
    enabled: !!startDate && !!endDate,
  });

  const rows: MutasiRow[] = useMemo(() => {
    const items = reportData?.transactions || [];
    return items.map((row: any, index: number) => {
      const kasIn = Number(row.kasIn ?? row.kas_masuk ?? 0);
      const kasOut = Number(row.kasOut ?? row.kas_keluar ?? 0);
      const type = row.type ?? row.transaction_type ?? "unknown";
      const rawDate = row.date ?? row.transaction_date ?? null;
      const parsedDate = rawDate ? new Date(rawDate) : null;
      const safeDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

      let description = "";
      if (kasIn > 0) {
        const donor = row.donorName ?? row.donor_name ?? "Anonim";
        const product = row.zakatTypeName ?? row.campaign_title ?? "";
        if (type === "unique_code") {
          description = `Kode unik dari ${donor}` + (product ? ` (${product})` : "");
        } else if (type.startsWith("qurban_savings")) {
          description = `Tabungan Qurban ${type === "qurban_savings_deposit" ? "setor" : "tarik"} dari ${donor}` + (product ? ` - ${product}` : "");
        } else {
          const typeLabel = type === "zakat" ? "Zakat" : type === "qurban" ? "Qurban" : "Donasi";
          description = `${typeLabel} dari ${donor}` + (product ? ` untuk ${product}` : "");
        }
      } else {
        const purpose = row.purpose ?? row.description ?? "Pencairan";
        const recipient = row.recipientName ?? row.recipient_name ?? "";
        const product = row.zakatTypeName ?? row.campaign_title ?? "";
        description = purpose;
        if (product) description += ` - ${product}`;
        if (recipient) description += ` ke ${recipient}`;
      }

      return {
        id: String(row.id ?? row.transaction_id ?? `${type}-${index}`),
        date: safeDate,
        description,
        category: TYPE_LABELS[type] || type,
        debit: kasIn,
        credit: kasOut,
      };
    });
  }, [reportData]);

  const totalDebit = Number(reportData?.summary?.totalIn || 0);
  const totalCredit = Number(reportData?.summary?.totalOut || 0);
  const balance = Number(reportData?.summary?.closingBalance || (totalDebit - totalCredit));
  const totalPages = Number(reportData?.pagination?.totalPages || 1);

  const handleExportExcel = () => {
    exportToExcel({
      data: rows.map((r) => ({
        date: r.date ? format(r.date, "dd/MM/yyyy", { locale: idLocale }) : "-",
        description: r.description,
        category: r.category,
        debit: r.debit > 0 ? r.debit : "",
        credit: r.credit > 0 ? r.credit : "",
      })),
      columns: [
        { header: "Tanggal", key: "date", width: 14 },
        { header: "Deskripsi", key: "description", width: 45 },
        { header: "Kategori", key: "category", width: 22 },
        { header: "Debit (Masuk)", key: "debit", width: 18, format: "currency" },
        { header: "Kredit (Keluar)", key: "credit", width: 18, format: "currency" },
      ],
      filename: `Catatan-Mutasi-${startDate}-${endDate}`,
      title: "Catatan Mutasi",
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catatan Mutasi</h1>
          <p className="text-gray-600 mt-1">Riwayat pemasukan dan pengeluaran</p>
        </div>
        <ExportButton onExportExcel={handleExportExcel} onPrint={() => window.print()} />
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input
              type="text"
              placeholder="Cari nama donor, program, tujuan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pemasukan</h3>
          <p className="text-3xl font-bold text-success-600 mono">Rp {formatRupiah(totalDebit)}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pengeluaran</h3>
          <p className="text-3xl font-bold text-danger-600 mono">Rp {formatRupiah(totalCredit)}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Saldo Periode</h3>
          <p className={`text-3xl font-bold mono ${balance >= 0 ? "text-primary-600" : "text-danger-600"}`}>
            Rp {formatRupiah(Math.abs(balance))}
          </p>
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

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Deskripsi</th>
                  <th>Kategori</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.id}-${row.category}-${row.date ? row.date.getTime() : "no-date"}-${index}`}>
                    <td className="text-sm text-gray-600">{row.date ? format(row.date, "dd MMM yyyy", { locale: idLocale }) : "-"}</td>
                    <td><div className="font-medium text-gray-900 text-sm">{row.description}</div></td>
                    <td><span className="text-sm text-gray-700">{row.category}</span></td>
                    <td className="text-right mono text-sm">
                      {row.debit > 0 ? <span className="text-success-600 font-medium">Rp {formatRupiah(row.debit)}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="text-right mono text-sm">
                      {row.credit > 0 ? <span className="text-danger-600 font-medium">Rp {formatRupiah(row.credit)}</span> : <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && <div className="text-center py-12 text-gray-500">Tidak ada transaksi pada periode ini</div>}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between no-print">
                <span className="text-sm text-gray-600">Hal {page} dari {totalPages}</span>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                  <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
