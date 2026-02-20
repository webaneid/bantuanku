"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { format, startOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";

type AuditRow = {
  source: "transactions" | "disbursements";
  id: string;
  referenceNumber: string | null;
  category: string;
  status: string;
  amount: number;
  date: string | null;
  description: string;
};

type AuditResponse = {
  period: { startDate: string | null; endDate: string | null };
  source: "all" | "transactions" | "disbursements";
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  invalidCategories: {
    transactions: string[];
    disbursements: string[];
  };
  rows: AuditRow[];
};

const PAGE_SIZE = 20;

export default function CategoryAuditPage() {
  const params = useSearchParams();
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(params.get("startDate") || monthStart);
  const [endDate, setEndDate] = useState(params.get("endDate") || today);
  const [source, setSource] = useState<"all" | "transactions" | "disbursements">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports-category-audit", startDate, endDate, source, search, page],
    queryFn: async () => {
      const queryParams: Record<string, string | number> = {
        startDate,
        endDate,
        source,
        page,
        limit: PAGE_SIZE,
      };
      if (search.trim()) queryParams.search = search.trim();

      const response = await api.get("/admin/reports/consistency-check/details", { params: queryParams });
      return response.data?.data as AuditResponse;
    },
    enabled: !!startDate && !!endDate,
  });

  const rows = data?.rows || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const invalidSummary = useMemo(() => {
    return {
      transactions: data?.invalidCategories?.transactions?.length || 0,
      disbursements: data?.invalidCategories?.disbursements?.length || 0,
    };
  }, [data]);

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Kategori COA</h1>
          <p className="text-gray-600 mt-1">Detail mismatch kategori dari transactions dan disbursements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card border border-danger-200 bg-danger-50">
          <p className="text-sm text-danger-700">Invalid category Transactions</p>
          <p className="text-2xl font-bold text-danger-700 mt-1">{invalidSummary.transactions}</p>
        </div>
        <div className="card border border-danger-200 bg-danger-50">
          <p className="text-sm text-danger-700">Invalid category Disbursements</p>
          <p className="text-2xl font-bold text-danger-700 mt-1">{invalidSummary.disbursements}</p>
        </div>
      </div>

      <div className="card mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sumber</label>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as "all" | "transactions" | "disbursements");
                setPage(1);
              }}
              className="form-input"
            >
              <option value="all">Semua</option>
              <option value="transactions">Transactions</option>
              <option value="disbursements">Disbursements</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input
              type="text"
              value={search}
              placeholder="Nomor referensi, kategori, deskripsi..."
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {isError && (
        <div className="card mb-6 border border-danger-200 bg-danger-50">
          <p className="text-sm font-medium text-danger-700">Gagal memuat audit kategori</p>
          <p className="text-sm text-danger-600 mt-1">
            {(error as any)?.response?.data?.message || (error as Error)?.message || "Terjadi kesalahan saat mengambil data."}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Sumber</th>
                <th>Referensi</th>
                <th>Kategori (Invalid)</th>
                <th>Deskripsi</th>
                <th>Status</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowDate = row.date ? new Date(row.date) : null;
                return (
                  <tr key={`${row.source}-${row.id}`}>
                    <td className="text-sm text-gray-600">
                      {rowDate && !Number.isNaN(rowDate.getTime())
                        ? format(rowDate, "dd MMM yyyy HH:mm", { locale: idLocale })
                        : "-"}
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.source === "transactions" ? "bg-primary-100 text-primary-700" : "bg-warning-100 text-warning-700"}`}>
                        {row.source}
                      </span>
                    </td>
                    <td className="text-sm font-medium text-gray-900">{row.referenceNumber || row.id}</td>
                    <td>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-danger-100 text-danger-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="text-sm text-gray-700">{row.description || "-"}</td>
                    <td className="text-sm text-gray-700">{row.status}</td>
                    <td className="text-right mono text-sm font-medium text-danger-700">
                      Rp {formatRupiah(Number(row.amount || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Tidak ada mismatch kategori untuk filter saat ini.
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between no-print">
              <span className="text-sm text-gray-600">
                Hal {pagination.page} dari {pagination.totalPages} • Total {pagination.total} baris
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
