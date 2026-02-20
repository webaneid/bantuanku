"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface Column {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  format?: "currency" | "date" | "number" | "percentage" | "text";
  sortable?: boolean;
  className?: string;
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface ReportTableProps {
  columns: Column[];
  data: Record<string, any>[];
  loading?: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: "asc" | "desc") => void;
  footerRow?: Record<string, any>;
  onRowClick?: (row: Record<string, any>) => void;
  emptyMessage?: string;
}

function formatCellValue(value: any, col: Column): React.ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-gray-400">-</span>;

  switch (col.format) {
    case "currency":
      const num = Number(value);
      if (num === 0) return <span className="text-gray-400">-</span>;
      const isNeg = num < 0;
      return (
        <span className={`mono font-medium ${isNeg ? "text-danger-600" : "text-gray-900"}`}>
          Rp {formatRupiah(Math.abs(num))}
        </span>
      );
    case "date":
      try {
        const d = typeof value === "string" ? new Date(value) : value;
        return format(d, "dd MMM yyyy", { locale: idLocale });
      } catch {
        return String(value);
      }
    case "number":
      return <span className="mono">{Number(value).toLocaleString("id-ID")}</span>;
    case "percentage":
      return <span className="mono">{Number(value).toFixed(1)}%</span>;
    default:
      return String(value);
  }
}

export default function ReportTable({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSort,
  footerRow,
  onRowClick,
  emptyMessage = "Tidak ada data",
}: ReportTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${
                    col.sortable ? "cursor-pointer hover:bg-gray-100 select-none" : ""
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`text-sm ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""} ${col.className || ""}`}
                  >
                    {col.render ? col.render(row[col.key], row) : formatCellValue(row[col.key], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Footer total row */}
          {footerRow && data.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`text-sm font-bold ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                  >
                    {footerRow[col.key] !== undefined
                      ? formatCellValue(footerRow[col.key], col)
                      : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>

        {data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {data.map((row, idx) => (
          <div
            key={row.id || idx}
            className={`table-card ${onRowClick ? "cursor-pointer" : ""}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((col, colIdx) => {
              if (colIdx === 0) {
                return (
                  <div key={col.key} className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">
                        {col.render ? col.render(row[col.key], row) : formatCellValue(row[col.key], col)}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={col.key} className="table-card-row">
                  <span className="table-card-row-label">{col.header}</span>
                  <span className="table-card-row-value">
                    {col.render ? col.render(row[col.key], row) : formatCellValue(row[col.key], col)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-600">
            Menampilkan {((pagination.page - 1) * pagination.limit) + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-700">
              {pagination.page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
